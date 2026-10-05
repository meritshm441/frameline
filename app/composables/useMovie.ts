import type { MovieDetails } from '#shared/types/tmdb'

/** Fetch a single film (with credits + videos) through `/api/movie/[id]`. */
export function useMovie(id: MaybeRefOrGetter<number | string>) {
  return useFetch<MovieDetails>(() => `/api/movie/${toValue(id)}`, {
    key: computed(() => `movie-${toValue(id)}`)
  })
}
