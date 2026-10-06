import type { TimeMachineFilm, TimeMachineResponse } from '#shared/types/time-machine'
import type { Movie, Paginated } from '#shared/types/tmdb'
import { currentYear, FIRST_YEAR } from '#shared/utils/time-machine'

/* ---------------------------------------------------------------------------
 * Time Machine: one year's release calendar, two ways
 * ---------------------------------------------------------------------------
 *
 * WHAT WAS PLAYING
 *   `/discover/movie?primary_release_year=YYYY&sort_by=popularity.desc`
 *   TMDB's popularity is today's, not the year's box office, so this reads as
 *   "the films from that year people still watch". A vote floor keeps out the
 *   near-empty records (lost films, unlisted shorts, obscure softcore) that
 *   popularity alone floats up. It is half the honour roll's starting floor,
 *   or 20 before 1950, and drops to 20 when a year (say, one that has only
 *   just begun) can't fill the bill at that height.
 *
 * THE HIGHEST-RATED
 *   Same year, `sort_by=vote_average.desc`, behind a vote floor so one
 *   enthusiastic 10/10 can't top the list. The floor depends on the era: a
 *   1920s classic may have 200 votes, a 2010s one 20,000. So we start high
 *   for recent years and step down the ladder until about ten films clear
 *   the bar.
 *
 * Both lists stop at today, since TMDB lists unreleased films under the
 * current year, and both leave out TV movies.
 * ------------------------------------------------------------------------- */

const PLAYING = 12
const ACCLAIMED = 10
const PLAYING_MIN_VOTES = 20
const VOTE_LADDER = [1000, 500, 200, 100, 50] as const
const TV_MOVIE = 10770

/** Where on the ladder a year starts. Older years have far fewer votes on record. */
function startingFloor(year: number): number {
  if (year < 1950) return 100
  if (year < 1980) return 200
  if (year < 2000) return 500
  return 1000
}

function requireYear(raw: string | undefined): number {
  const year = Number(raw)
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > currentYear()) {
    throw createError({ statusCode: 400, statusMessage: `Choose a year from ${FIRST_YEAR} to ${currentYear()}` })
  }
  return year
}

function toFilm(m: Movie): TimeMachineFilm {
  return {
    id: m.id,
    title: m.title,
    original_title: m.original_title && m.original_title !== m.title ? m.original_title : null,
    release_date: m.release_date || null,
    poster_path: m.poster_path,
    overview: m.overview,
    vote_average: Math.round(m.vote_average * 10) / 10,
    vote_count: m.vote_count
  }
}

export default defineCachedEventHandler(async (event): Promise<TimeMachineResponse> => {
  const year = requireYear(getRouterParam(event, 'year'))
  const today = new Date().toISOString().slice(0, 10)

  const discover = (query: Record<string, string | number>) => tmdb<Paginated<Movie>>('/discover/movie', {
    'primary_release_year': year,
    'primary_release_date.lte': year === currentYear() ? today : undefined,
    'without_genres': TV_MOVIE,
    'include_adult': false,
    ...query
  }, event)

  async function acclaimed() {
    const ladder = VOTE_LADDER.filter(floor => floor <= startingFloor(year))
    let found: Paginated<Movie> | null = null
    let floor: number = ladder[0]!
    for (floor of ladder) {
      found = await discover({ 'sort_by': 'vote_average.desc', 'vote_count.gte': floor })
      if (found.total_results >= ACCLAIMED) break
    }
    return { films: found?.results ?? [], floor }
  }

  async function playing() {
    const floor = year < 1950 ? PLAYING_MIN_VOTES : startingFloor(year) / 2
    const found = await discover({ 'sort_by': 'popularity.desc', 'vote_count.gte': floor })
    if (found.results.length >= PLAYING || floor === PLAYING_MIN_VOTES) return found.results
    return (await discover({ 'sort_by': 'popularity.desc', 'vote_count.gte': PLAYING_MIN_VOTES })).results
  }

  const [bill, honours] = await Promise.all([playing(), acclaimed()])

  return {
    year,
    playing: bill.slice(0, PLAYING).map(toFilm),
    acclaimed: honours.films.slice(0, ACCLAIMED).map(toFilm),
    acclaimed_min_votes: honours.floor
  }
}, {
  name: 'tmdb-time-machine',
  maxAge: ONE_HOUR,
  getKey: event => String(Number(getRouterParam(event, 'year')) || 'invalid')
})
