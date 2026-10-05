import type { Movie, Paginated, SearchResult } from '#shared/types/tmdb'

export default defineCachedEventHandler(async (event): Promise<SearchResult[]> => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2) return []

  const data = await tmdb<Paginated<Movie>>('/search/movie', {
    query: q.slice(0, 100),
    include_adult: false
  }, event)

  // Return a slim payload: the palette only needs enough to render a row.
  return data.results.slice(0, 12).map(m => ({
    id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    poster_path: m.poster_path
  }))
}, {
  name: 'tmdb-search',
  maxAge: ONE_HOUR,
  getKey: event => String(getQuery(event).q ?? '').trim().toLowerCase()
})
