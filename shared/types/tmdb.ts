/**
 * Typed shapes for the subset of the TMDB v3 API that Frameline uses.
 * Shared between server routes and the app via `#shared/types/tmdb`.
 */

export interface Paginated<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface Genre {
  id: number
  name: string
}

/** A movie as it appears in list endpoints (discover, search, trending...). */
export interface Movie {
  id: number
  title: string
  original_title: string
  original_language: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genre_ids: number[]
  popularity: number
  vote_average: number
  vote_count: number
  adult: boolean
  video: boolean
}

export interface ProductionCountry {
  iso_3166_1: string
  name: string
}

export interface SpokenLanguage {
  iso_639_1: string
  english_name: string
  name: string
}

export interface ProductionCompany {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
  known_for_department: string
  credit_id: string
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
  known_for_department: string
  credit_id: string
}

export interface Credits {
  cast: CastMember[]
  crew: CrewMember[]
}

export interface Video {
  id: string
  key: string
  name: string
  site: string
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | 'Bloopers' | string
  official: boolean
  published_at: string
  iso_639_1: string
}

export interface Keyword {
  id: number
  name: string
}

/** Full movie record from `/movie/{id}` with appended credits and videos. */
export interface MovieDetails extends Omit<Movie, 'genre_ids'> {
  genres: Genre[]
  runtime: number | null
  tagline: string | null
  status: string
  budget: number
  revenue: number
  homepage: string | null
  imdb_id: string | null
  origin_country: string[]
  production_countries: ProductionCountry[]
  production_companies: ProductionCompany[]
  spoken_languages: SpokenLanguage[]
  credits: Credits
  videos: { results: Video[] }
}

export interface Person {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  also_known_as: string[]
  popularity: number
}

/** Compact search result returned by `/api/search` for the command palette. */
export interface SearchResult {
  id: number
  title: string
  year: string | null
  poster_path: string | null
}

/** TMDB image size buckets. Requests are snapped to these by the image provider. */
export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original'
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original'
export type TmdbImageSize = PosterSize | BackdropSize | ProfileSize

/** A film in someone's filmography (`/person/{id}/movie_credits`). */
export interface PersonMovieCredit extends Movie {
  credit_id: string
  /** Set on acting credits. */
  character?: string
  /** Set on crew credits. */
  job?: string
  department?: string
}

export interface PersonMovieCredits {
  cast: PersonMovieCredit[]
  crew: PersonMovieCredit[]
}

/** Full person record from `/person/{id}` with appended movie credits. */
export interface PersonDetails extends Person {
  imdb_id: string | null
  movie_credits: PersonMovieCredits
}

/** A streaming service, shop or channel from `/movie/{id}/watch/providers`. */
export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
}

/** One region's offers. TMDB gives a single `link` (its own watch page), not one per provider. */
export interface WatchRegionOffers {
  link: string
  flatrate?: WatchProvider[]
  free?: WatchProvider[]
  ads?: WatchProvider[]
  rent?: WatchProvider[]
  buy?: WatchProvider[]
}

/** What `/api/movie/[id]/watch` returns: one region's offers plus every region that has any. */
export interface WatchResponse {
  region: string
  regions: string[]
  offers: WatchRegionOffers | null
}
