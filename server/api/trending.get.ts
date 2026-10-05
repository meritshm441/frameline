import type { Movie, Paginated } from '#shared/types/tmdb'

export default defineCachedEventHandler(async (event) => {
  const { window } = getQuery(event)
  const timeWindow = window === 'day' ? 'day' : 'week'

  return tmdb<Paginated<Movie>>(`/trending/movie/${timeWindow}`, {}, event)
}, {
  name: 'tmdb-trending',
  maxAge: ONE_HOUR,
  getKey: event => String(getQuery(event).window ?? 'week')
})
