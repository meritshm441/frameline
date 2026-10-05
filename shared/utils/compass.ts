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
