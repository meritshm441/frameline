import type { CompassCompany, CompassPick, CompassQuery, CompassResponse, CompassRuntime } from '#shared/types/compass'
import type { Movie, MovieDetails, Paginated } from '#shared/types/tmdb'
import { GENRE, GENRE_PINS, moodQuadrant, parseCompassQuery } from '#shared/utils/compass'

/* ---------------------------------------------------------------------------
 * How the Compass becomes a TMDB `/discover/movie` query
 * ---------------------------------------------------------------------------
 *
 * 1. MOOD (the dial) → genres
 *    Every TMDB genre is pinned to a spot on the same plane as the dial
 *    (x: Light -1 … Heavy +1, y: Calm -1 … Intense +1). The three genres
 *    nearest the user's point become `with_genres`, joined with `|` (OR) so
 *    the pool stays wide. Genres on the far side of the dial (further than
 *    FAR_GENRE_DISTANCE) go into `without_genres`, so a gentle night never
 *    turns up a war film. At the centre of the dial the user is saying "anything",
 *    so no genre filter is applied at all.
 *
 * 2. TIME → `with_runtime.gte` / `with_runtime.lte`
 *    short: 60–99 min (the floor keeps out shorts) · standard: 100–130 ·
 *    epic: 131 and up.
 *
 * 3. COMPANY → how well known, plus a few genre nudges
 *    `vote_count.gte` is our proxy for "how many people have seen this".
 *    solo:    300+ votes, room for deeper cuts.
 *    date:    1,000+ votes; leans romantic on the light half of the dial;
 *             no documentaries or war films.
 *    friends: 2,000+ votes, crowd favourites everyone has heard of; no
 *             documentaries or history lessons.
 *    family:  US certification G or PG (`certification.lte=PG`), Family and
 *             Animation added to the genre pool, no horror.
 *
 * 4. QUALITY + VARIETY
 *    Sorted by rating with a `vote_average.gte` floor. "Reshuffle" sends a new
 *    seed, which picks a different results page and a different three from it.
 * ------------------------------------------------------------------------- */

const NEAREST_GENRES = 3
const FAR_GENRE_DISTANCE = 1.6

const RUNTIME_RANGES: Record<CompassRuntime, { gte: number, lte?: number }> = {
  short: { gte: 60, lte: 99 },
  standard: { gte: 100, lte: 130 },
  epic: { gte: 131 }
}

interface CompanyRule {
  minVotes: number
  minRating: number
  /** Genres added to the OR pool, regardless of mood. */
  include?: number[]
  exclude?: number[]
  certification?: { country: string, lte: string }
}

const COMPANY_RULES: Record<CompassCompany, CompanyRule> = {
  solo: { minVotes: 300, minRating: 6.8 },
  date: { minVotes: 1000, minRating: 6.6, exclude: [GENRE.documentary, GENRE.war] },
  friends: { minVotes: 2000, minRating: 6.5, exclude: [GENRE.documentary, GENRE.history] },
  family: {
    minVotes: 500,
    minRating: 6.2,
    include: [GENRE.family, GENRE.animation],
    exclude: [GENRE.horror],
    certification: { country: 'US', lte: 'PG' }
  }
}

/** Pages of results a seed can land on. Deeper pages drift into the obscure. */
const SEED_PAGES = 5
const PICKS = 3
/** Films whose details we fetch to choose the three from (all cached for an hour). */
const CANDIDATES = 6
/** Minutes of leeway when checking a film's listed runtime against the chosen range. */
const RUNTIME_TOLERANCE = 5

function resolveGenres({ x, y, company }: CompassQuery) {
  const rule = COMPANY_RULES[company]
  const byDistance = GENRE_PINS
    .map(pin => ({ pin, distance: Math.hypot(pin.x - x, pin.y - y) }))
    .sort((a, b) => a.distance - b.distance)

  const isCentre = moodQuadrant({ x, y }) === 'centre'
  const nearest = isCentre ? [] : byDistance.slice(0, NEAREST_GENRES).map(d => d.pin)

  const include = new Set(nearest.map(p => p.id))
  // A date on the light half of the dial tilts romantic.
  if (company === 'date' && x <= 0.25 && !isCentre) include.add(GENRE.romance)
  // An empty pool means "any genre", so only widen it when it's already narrowed.
  if (include.size) rule.include?.forEach(id => include.add(id))
  // The company's hard "no" beats the mood: no documentary on a date, however calm.
  rule.exclude?.forEach(id => include.delete(id))

  const exclude = new Set<number>([GENRE.tvMovie, ...(rule.exclude ?? [])])
  if (!isCentre) {
    byDistance
      // ...but a genre the brief asked for is never dropped just for being far away.
      .filter(d => d.distance > FAR_GENRE_DISTANCE && !include.has(d.pin.id))
      .forEach(d => exclude.add(d.pin.id))
  }

  const names = [...include]
    .map(id => GENRE_PINS.find(p => p.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  return { include: [...include], exclude: [...exclude], names }
}

/** Small deterministic PRNG so a seed always shuffles the same way (and caches cleanly). */
function mulberry32(seed: number) {
  let a = seed + 0x6D2B79F5
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededSample<T>(items: T[], count: number, seed: number): T[] {
  const random = mulberry32(seed)
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, count)
}

export default defineCachedEventHandler(async (event): Promise<CompassResponse> => {
  const query = parseCompassQuery(getQuery(event))
  const genres = resolveGenres(query)
  const rule = COMPANY_RULES[query.company]
  const runtime = RUNTIME_RANGES[query.runtime]

  const discover = (page: number) => tmdb<Paginated<Movie>>('/discover/movie', {
    'include_adult': false,
    'sort_by': 'vote_average.desc',
    'vote_count.gte': rule.minVotes,
    'vote_average.gte': rule.minRating,
    'with_runtime.gte': runtime.gte,
    'with_runtime.lte': runtime.lte,
    'with_genres': genres.include.join('|'),
    'without_genres': genres.exclude.join(','),
    'certification_country': rule.certification?.country,
    'certification.lte': rule.certification?.lte,
    page
  }, event)

  let results = await discover(1 + (query.seed % SEED_PAGES))
  // Narrow combinations may have fewer pages than the seed asked for; wrap around.
  if (results.results.length < PICKS && results.page > 1 && results.total_pages > 0) {
    results = await discover(1 + (query.seed % results.total_pages))
  }

  // Discover doesn't include runtime or director, which the programme card needs,
  // and its runtime filter sometimes matches a different cut of the film than the
  // details record. So fetch a few spare candidates and prefer the ones whose
  // listed runtime really fits, topping up with the rest if needed.
  const candidates = seededSample(results.results, CANDIDATES, query.seed)
  const fetched = await Promise.all(candidates.map(movie =>
    tmdb<MovieDetails>(`/movie/${movie.id}`, { append_to_response: 'credits' }, event)
  ))
  const fits = (film: MovieDetails) => film.runtime !== null
    && film.runtime >= runtime.gte - RUNTIME_TOLERANCE
    && film.runtime <= (runtime.lte ?? Infinity) + RUNTIME_TOLERANCE
  const details = [...fetched.filter(fits), ...fetched.filter(film => !fits(film))].slice(0, PICKS)

  const picks: CompassPick[] = details.map(film => ({
    id: film.id,
    title: film.title,
    year: film.release_date ? film.release_date.slice(0, 4) : null,
    runtime: film.runtime,
    director: film.credits.crew.find(c => c.job === 'Director')?.name ?? null,
    tagline: film.tagline || null,
    overview: film.overview,
    genres: film.genres.slice(0, 3).map(g => g.name),
    poster_path: film.poster_path,
    vote_average: Math.round(film.vote_average * 10) / 10
  }))

  return {
    picks,
    quadrant: moodQuadrant(query),
    reading: genres.names
  }
}, {
  name: 'tmdb-compass',
  maxAge: ONE_HOUR,
  getKey: (event) => {
    const q = parseCompassQuery(getQuery(event))
    // Nitro strips non-alphanumerics from cache keys, so -0.5 and 0.5 would
    // collide. Key on the detent index (0–8) instead of the signed value.
    const detent = (axis: number) => (axis + 1) * 4
    return [detent(q.x), detent(q.y), q.runtime, q.company, q.seed].join('-')
  }
})
