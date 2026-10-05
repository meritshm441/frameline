/**
 * The Atlas contract (Phase 4), shared by `/api/atlas/[country]` and the app.
 */

/** A decade is named by its first year: 1920 is the 1920s. */
export type Decade = number

export interface AtlasQuery {
  /** ISO 3166-1 alpha-2 (TMDB's `origin_country`), or null when no country is open. */
  country: string | null
  /** First and last decade, inclusive. The full span means "every decade". */
  from: Decade
  to: Decade
}

/** One film in a country's drawer, slimmed to what the list shows. */
export interface AtlasFilm {
  id: number
  title: string
  /** Only set when it differs from `title`, e.g. "La Haine" under "Hate". */
  original_title: string | null
  year: string | null
  poster_path: string | null
  vote_average: number
  vote_count: number
}

export interface AtlasResponse {
  country: string
  films: AtlasFilm[]
  page: number
  total_pages: number
  total_results: number
}

/** A country the traveller has opened, for the passport counter and the Reel Journal. */
export interface PassportStamp {
  code: string
  /** ISO date-time of the first visit. */
  at: string
}
