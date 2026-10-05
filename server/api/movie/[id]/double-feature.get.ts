import type { DoubleFeatureResponse } from '#shared/types/dossier'
import type { Keyword, Movie, MovieDetails, Paginated } from '#shared/types/tmdb'
import { decadeOf, toFilmStub } from '#shared/utils/dossier'

/* ---------------------------------------------------------------------------
 * Double Feature: one film to pair with this one, and why
 * ---------------------------------------------------------------------------
 *
 * Candidates come from TMDB's `/recommendations` (falling back to `/similar`),
 * which is good at "people who liked this liked that" but never says why.
 * So we fetch keywords + credits for the top few candidates and score each
 * one on what it visibly shares with this film:
 *
 *   shared director ............ 5   (the strongest "these belong together")
 *   each shared top-billed actor 3
 *   each shared keyword ........ 2   (heist, new york city, ensemble cast…)
 *   same decade ................ 1
 *   each shared genre .......... 0.5 (genres are broad, so they mostly break ties)
 *   TMDB's own rank ............ up to 1, so its ordering still counts a little
 *
 * The highest score wins, and the same overlaps become the reason shown on
 * the card ("Shares: heist, the 1970s, ensemble cast"), most telling first.
 * ------------------------------------------------------------------------- */

type ScoredFilm = Omit<MovieDetails, 'videos'> & { keywords: { keywords: Keyword[] } }
type SourceFilm = ScoredFilm & { recommendations: Paginated<Movie>, similar: Paginated<Movie> }

/** Candidates we fetch details for. Each is one TMDB call, cached with the route for a day. */
const CANDIDATES = 8
const MIN_VOTES = 50
const TOP_BILLED = 8
const MAX_SHARES = 4
/** Bookkeeping keywords that say nothing about the film itself. */
const NOISE_KEYWORDS = /stinger|woman director|^duringcredits|^aftercredits|^based on|^sequel$|^remake$/i

function keywordsOf(film: ScoredFilm): Keyword[] {
  return film.keywords.keywords.filter(k => !NOISE_KEYWORDS.test(k.name))
}

function directorsOf(film: ScoredFilm) {
  return film.credits.crew.filter(c => c.job === 'Director')
}

function score(source: ScoredFilm, candidate: ScoredFilm, rank: number) {
  const shares: { label: string, weight: number }[] = []

  const sourceDirectors = new Set(directorsOf(source).map(d => d.id))
  directorsOf(candidate)
    .filter(d => sourceDirectors.has(d.id))
    .forEach(d => shares.push({ label: `director ${d.name}`, weight: 5 }))

  const sourceCast = new Set(source.credits.cast.slice(0, TOP_BILLED).map(c => c.id))
  candidate.credits.cast.slice(0, TOP_BILLED)
    .filter(c => sourceCast.has(c.id))
    .forEach(c => shares.push({ label: c.name, weight: 3 }))

  const sourceKeywords = new Set(keywordsOf(source).map(k => k.id))
  keywordsOf(candidate)
    .filter(k => sourceKeywords.has(k.id))
    .forEach(k => shares.push({ label: k.name, weight: 2 }))

  const decade = decadeOf(source.release_date)
  if (decade && decade === decadeOf(candidate.release_date)) {
    shares.push({ label: `the ${decade}`, weight: 1 })
  }

  const sourceGenres = new Set(source.genres.map(g => g.id))
  candidate.genres
    .filter(g => sourceGenres.has(g.id))
    .forEach(g => shares.push({ label: g.name.toLowerCase(), weight: 0.5 }))

  const total = shares.reduce((sum, s) => sum + s.weight, 0) + (CANDIDATES - rank) / CANDIDATES
  // Stable sort keeps TMDB's keyword order among equals.
  const reason = shares.sort((a, b) => b.weight - a.weight).slice(0, MAX_SHARES).map(s => s.label)
  return { total, reason }
}

export default defineCachedEventHandler(async (event): Promise<DoubleFeatureResponse> => {
  const id = requireTmdbId(event)
  const details = <T extends ScoredFilm>(movieId: number, extra = '') => tmdb<T>(`/movie/${movieId}`, {
    append_to_response: `credits,keywords${extra}`
  }, event)

  const source = await details<SourceFilm>(id, ',recommendations,similar')
  const pool = source.recommendations.results.length ? source.recommendations.results : source.similar.results

  const candidates = pool
    .filter(m => m.id !== id && !m.adult && m.vote_count >= MIN_VOTES && m.poster_path)
    .slice(0, CANDIDATES)
  if (!candidates.length) return { pairing: null }

  const films = await Promise.all(candidates.map(m => details(m.id)))
  const [best] = films
    .map((film, rank) => ({ film, ...score(source, film, rank) }))
    .sort((a, b) => b.total - a.total)
  if (!best) return { pairing: null }

  const { film, reason } = best
  return {
    pairing: {
      film: {
        ...toFilmStub(film),
        backdrop_path: film.backdrop_path,
        overview: film.overview,
        director: directorsOf(film)[0]?.name ?? null
      },
      shares: reason
    }
  }
}, {
  name: 'tmdb-double-feature',
  maxAge: ONE_DAY,
  getKey: event => String(getRouterParam(event, 'id'))
})
