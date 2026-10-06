import type { CompassCompany, CompassQuery, CompassRuntime, MoodPoint, MoodQuadrant } from '#shared/types/compass'

export const COMPASS_RUNTIMES: readonly CompassRuntime[] = ['short', 'standard', 'epic']
export const COMPASS_COMPANIES: readonly CompassCompany[] = ['solo', 'date', 'friends', 'family']

/** Where the dial rests on a first visit: a little light, a little lively. */
export const DEFAULT_MOOD: MoodPoint = { x: -0.25, y: 0.25 }

/** Points this close to the middle of the dial count as "centre". */
const CENTRE_RADIUS = 0.2

export function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(-1, value))
}

/**
 * Snap an axis to the nearest 0.25. The dial is continuous, but nobody can
 * tell 0.31 from 0.26 by feel, and snapping keeps the server cache small
 * (9 × 9 cells instead of one per pixel).
 */
export function quantizeAxis(value: number): number {
  return Math.round(clampAxis(value) * 4) / 4
}

export function moodQuadrant({ x, y }: MoodPoint): MoodQuadrant {
  if (Math.hypot(x, y) < CENTRE_RADIUS) return 'centre'
  return `${x <= 0 ? 'light' : 'heavy'}-${y <= 0 ? 'calm' : 'intense'}`
}

export const QUADRANT_LABELS: Record<MoodQuadrant, string> = {
  'light-calm': 'A gentle night',
  'light-intense': 'A night for thrills',
  'heavy-calm': 'A slow-burning night',
  'heavy-intense': 'A white-knuckle night',
  'centre': 'A night of anything'
}

export const GENRE = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  scienceFiction: 878,
  thriller: 53,
  tvMovie: 10770,
  war: 10752,
  western: 37
} as const

export interface GenrePin {
  id: number
  name: string
  x: number
  y: number
}

/**
 * Each genre's position on the mood plane. Tuned by feel, not by data.
 * `/api/compass` turns a dial point into genres with these; the Reel Journal
 * goes the other way, placing a logged film on the dial by its genres.
 */
export const GENRE_PINS: readonly GenrePin[] = [
  // Light & calm
  { id: GENRE.family, name: 'Family', x: -0.9, y: -0.6 },
  { id: GENRE.romance, name: 'Romance', x: -0.5, y: -0.6 },
  { id: GENRE.animation, name: 'Animation', x: -0.75, y: -0.25 },
  { id: GENRE.music, name: 'Music', x: -0.45, y: -0.2 },
  { id: GENRE.comedy, name: 'Comedy', x: -0.85, y: 0.05 },
  // Light & intense
  { id: GENRE.adventure, name: 'Adventure', x: -0.5, y: 0.6 },
  { id: GENRE.fantasy, name: 'Fantasy', x: -0.4, y: 0.3 },
  { id: GENRE.action, name: 'Action', x: -0.15, y: 0.9 },
  // Heavy & calm
  { id: GENRE.documentary, name: 'Documentary', x: 0.3, y: -0.75 },
  { id: GENRE.drama, name: 'Drama', x: 0.6, y: -0.45 },
  { id: GENRE.history, name: 'History', x: 0.75, y: -0.55 },
  { id: GENRE.western, name: 'Western', x: 0.45, y: -0.1 },
  // Heavy & intense
  { id: GENRE.scienceFiction, name: 'Science Fiction', x: 0.15, y: 0.5 },
  { id: GENRE.mystery, name: 'Mystery', x: 0.35, y: 0.25 },
  { id: GENRE.crime, name: 'Crime', x: 0.6, y: 0.5 },
  { id: GENRE.thriller, name: 'Thriller', x: 0.45, y: 0.8 },
  { id: GENRE.horror, name: 'Horror', x: 0.7, y: 0.95 },
  { id: GENRE.war, name: 'War', x: 0.9, y: 0.7 }
]

/** Seeds wrap at this value; plenty of reshuffles, and a bounded cache. */
const MAX_SEED = 1000

/**
 * Normalise raw query params (from the URL or the server request) into a
 * valid, quantised compass query. Used on both sides so they always agree on
 * what a given URL means, and so the server cache key is canonical.
 */
export function parseCompassQuery(raw: Record<string, unknown>): CompassQuery {
  const num = (value: unknown, fallback: number) => {
    const n = Number(value)
    return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback
  }

  return {
    x: quantizeAxis(num(raw.x, DEFAULT_MOOD.x)),
    y: quantizeAxis(num(raw.y, DEFAULT_MOOD.y)),
    runtime: COMPASS_RUNTIMES.find(r => r === raw.runtime) ?? 'standard',
    company: COMPASS_COMPANIES.find(c => c === raw.company) ?? 'solo',
    seed: Math.abs(Math.trunc(num(raw.seed, 0))) % MAX_SEED
  }
}
