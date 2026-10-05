import type { MovieDetails } from '#shared/types/tmdb'

export default defineCachedEventHandler(async (event) => {
  const id = requireTmdbId(event)

  // One round-trip: credits and videos are appended to the details response.
  return tmdb<MovieDetails>(`/movie/${id}`, {
    append_to_response: 'credits,videos'
  }, event)
}, {
  name: 'tmdb-movie',
  maxAge: ONE_DAY,
  getKey: event => String(getRouterParam(event, 'id'))
})
