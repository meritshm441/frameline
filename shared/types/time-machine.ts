/**
 * The Time Machine contract (Phase 5), shared by `/api/time-machine/[year]` and the app.
 */

/** One film on a year's bill or honour roll, slimmed to what the page shows. */
export interface TimeMachineFilm {
  id: number
  title: string
  /** Only set when it differs from `title`, e.g. "Det sjunde inseglet" under "The Seventh Seal". */
  original_title: string | null
  /** ISO date of first release, or null when TMDB doesn't know it. */
  release_date: string | null
  poster_path: string | null
  overview: string
  vote_average: number
  vote_count: number
}

export interface TimeMachineResponse {
  year: number
  /** What was playing: released that year, most watched today first. */
  playing: TimeMachineFilm[]
  /** The year's highest-rated films. */
  acclaimed: TimeMachineFilm[]
  /** The vote floor the honour roll settled on (it is lowered for sparse years). */
  acclaimed_min_votes: number
}
