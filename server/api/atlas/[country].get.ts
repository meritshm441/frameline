import type { AtlasFilm, AtlasResponse } from '#shared/types/atlas'
import type { Movie, Paginated } from '#shared/types/tmdb'
import { FIRST_DECADE, LAST_DECADE, parseAtlasQuery } from '#shared/utils/atlas'
import { yearOf } from '#shared/utils/dossier'

/* ---------------------------------------------------------------------------
 * Atlas: a country's most acclaimed films, optionally within a span of decades
 * ---------------------------------------------------------------------------
 *
 * `/discover/movie?with_origin_country=XX&sort_by=vote_average.desc&vote_count.gte=200`
 *
 * Decades become `primary_release_date.gte/lte`. The first decade on the
 * slider (1920s) sets no lower bound, so the few acclaimed films from before
 * 1920 still appear in an "every decade" search. The upper bound is never
 * later than today: TMDB lists unreleased films, and early hype votes can
 * push them to the top of a rating sort.
 * ------------------------------------------------------------------------- */

const MIN_VOTES = 200
/** TMDB refuses pages past 500. */
const MAX_PAGE = 500

function pageOf(raw: Record<string, unknown>): number {
  return Math.min(MAX_PAGE, Math.max(1, Math.trunc(Number(raw.page)) || 1))
}

export default defineCachedEventHandler(async (event): Promise<AtlasResponse> => {
  const raw = getQuery(event)
  const { country, from, to } = parseAtlasQuery({ ...raw, country: getRouterParam(event, 'country') })
  if (!country) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown country' })
  }
  const page = pageOf(raw)

  const today = new Date().toISOString().slice(0, 10)
  const lastDay = to === LAST_DECADE ? today : `${to + 9}-12-31`

  const results = await tmdb<Paginated<Movie>>('/discover/movie', {
    'with_origin_country': country,
    'sort_by': 'vote_average.desc',
    'vote_count.gte': MIN_VOTES,
    'include_adult': false,
    'primary_release_date.gte': from === FIRST_DECADE ? undefined : `${from}-01-01`,
    'primary_release_date.lte': lastDay < today ? lastDay : today,
    page
  }, event)

  const films: AtlasFilm[] = results.results.map(m => ({
    id: m.id,
    title: m.title,
    original_title: m.original_title && m.original_title !== m.title ? m.original_title : null,
    year: yearOf(m.release_date),
    poster_path: m.poster_path,
    vote_average: Math.round(m.vote_average * 10) / 10,
    vote_count: m.vote_count
  }))

  return {
    country,
    films,
    page: results.page,
    total_pages: Math.min(results.total_pages, MAX_PAGE),
    total_results: results.total_results
  }
}, {
  name: 'tmdb-atlas',
  maxAge: ONE_HOUR,
  getKey: (event) => {
    const raw = getQuery(event)
    const q = parseAtlasQuery({ ...raw, country: getRouterParam(event, 'country') })
    return [q.country ?? 'none', q.from, q.to, pageOf(raw)].join('-')
  }
})
