/* ---------------------------------------------------------------------------
 * Years, shared by the page (from the URL) and the API
 * ------------------------------------------------------------------------- */

export const FIRST_YEAR = 1920
/** Where the dial rests on a first visit: the year of Metropolis and the first talkie. */
export const DEFAULT_YEAR = 1927

export function currentYear(): number {
  return new Date().getFullYear()
}

/** A whole year between 1920 and this year; anything else falls back to the default. */
export function parseYear(value: unknown): number {
  const n = Number(value)
  if (value === undefined || value === '' || !Number.isInteger(n)) return DEFAULT_YEAR
  return clampYear(n)
}

export function clampYear(year: number): number {
  return Math.min(currentYear(), Math.max(FIRST_YEAR, Math.round(year)))
}

/** 1957 → 1950. */
export function decadeOfYear(year: number): number {
  return Math.floor(year / 10) * 10
}
