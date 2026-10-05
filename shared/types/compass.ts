/**
 * The Mood Compass contract, shared by `/api/compass` and the home page.
 */

/** "How much time do you have?" */
export type CompassRuntime = 'short' | 'standard' | 'epic'

/** "Watching with?" */
export type CompassCompany = 'solo' | 'date' | 'friends' | 'family'

/** The four corners of the dial, plus its centre. Phase 7's journal stats reuse these. */
export type MoodQuadrant = 'light-calm' | 'light-intense' | 'heavy-calm' | 'heavy-intense' | 'centre'

/**
 * A point on the dial. Both axes run from -1 to 1:
 * `x` is Light (-1) to Heavy (1), `y` is Calm (-1) to Intense (1).
 */
export interface MoodPoint {
  x: number
  y: number
}

export interface CompassQuery extends MoodPoint {
  runtime: CompassRuntime
  company: CompassCompany
  /** Changes on "Reshuffle"; the same seed always gives the same programme. */
  seed: number
}

/** One film on tonight's programme, slimmed to what the card shows. */
export interface CompassPick {
  id: number
  title: string
  year: string | null
  runtime: number | null
  director: string | null
  tagline: string | null
  overview: string
  genres: string[]
  poster_path: string | null
  vote_average: number
}

export interface CompassResponse {
  picks: CompassPick[]
  quadrant: MoodQuadrant
  /** Genre names the dial resolved to, shown as "Tonight reads as…". */
  reading: string[]
}
