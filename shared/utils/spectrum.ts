import type { Swatch, WheelPoint } from '#shared/types/spectrum'

/* ---------------------------------------------------------------------------
 * The colour wheel, shared by the page (from the URL) and its components
 * ---------------------------------------------------------------------------
 *
 * Angle is OKLCH hue, measured clockwise from the top. Distance from the
 * centre is vividness: grey and black-and-white posters gather at the centre,
 * saturated ones at the rim. A poster's place on the wheel is its swatch's
 * hue and `vivid`; the films shown are the ones nearest the chosen point in
 * plain Euclidean distance on the disc, so near the centre hue matters less
 * and less, as it should.
 * ------------------------------------------------------------------------- */

/** Where the wheel rests on a first visit: projector amber. */
export const DEFAULT_POINT: WheelPoint = { hue: 75, vivid: 0.7 }

/** Below this, a poster (or the chosen point) reads as black and white. */
export const MONOCHROME = 0.14
/** Below this, a hue reads as muted. */
const MUTED = 0.4

/** OKLCH hue anchors, named. 0° is a pinkish red in OKLCH; pure red sits near 29°. */
const HUES: { name: string, hue: number }[] = [
  { name: 'rose', hue: 0 },
  { name: 'red', hue: 27 },
  { name: 'orange', hue: 52 },
  { name: 'amber', hue: 75 },
  { name: 'yellow', hue: 100 },
  { name: 'lime', hue: 125 },
  { name: 'green', hue: 148 },
  { name: 'teal', hue: 178 },
  { name: 'cyan', hue: 205 },
  { name: 'azure', hue: 235 },
  { name: 'blue', hue: 262 },
  { name: 'violet', hue: 292 },
  { name: 'magenta', hue: 325 },
  { name: 'rose', hue: 360 }
]

/** One-tap starting points under the wheel; the keyboard's fastest route around it. */
export const PRESETS: { label: string, point: WheelPoint }[] = [
  { label: 'Red', point: { hue: 27, vivid: 0.8 } },
  { label: 'Orange', point: { hue: 52, vivid: 0.8 } },
  { label: 'Amber', point: DEFAULT_POINT },
  { label: 'Yellow', point: { hue: 100, vivid: 0.7 } },
  { label: 'Green', point: { hue: 148, vivid: 0.6 } },
  { label: 'Teal', point: { hue: 195, vivid: 0.6 } },
  { label: 'Blue', point: { hue: 255, vivid: 0.7 } },
  { label: 'Violet', point: { hue: 300, vivid: 0.6 } },
  { label: 'Rose', point: { hue: 0, vivid: 0.7 } },
  { label: 'Black & white', point: { hue: 0, vivid: 0 } }
]

/** The difference between two hues, going the short way round: 0–180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(normaliseHue(a) - normaliseHue(b))
  return Math.min(d, 360 - d)
}

export function normaliseHue(hue: number): number {
  return ((hue % 360) + 360) % 360
}

/** The plain name of a hue, e.g. 181 → "teal". */
export function hueName(hue: number): string {
  return HUES.reduce((best, h) => (hueDistance(h.hue, hue) < hueDistance(best.hue, hue) ? h : best)).name
}

/** What a point on the wheel is called: "black and white", "muted teal", "teal". */
export function pointName({ hue, vivid }: WheelPoint): string {
  if (vivid < MONOCHROME) return 'black and white'
  return vivid < MUTED ? `muted ${hueName(hue)}` : hueName(hue)
}

/** Disc coordinates, unit radius, y pointing down (as on screen). */
export function toXY({ hue, vivid }: WheelPoint): { x: number, y: number } {
  const angle = (hue * Math.PI) / 180
  return { x: vivid * Math.sin(angle), y: -vivid * Math.cos(angle) }
}

export function fromXY(x: number, y: number): WheelPoint {
  const vivid = Math.min(1, Math.hypot(x, y))
  const hue = normaliseHue((Math.atan2(x, -y) * 180) / Math.PI)
  return { hue, vivid }
}

/** Squared distance between two points on the disc; enough for ranking. */
export function wheelDistance(a: WheelPoint, b: WheelPoint): number {
  const p = toXY(a)
  const q = toXY(b)
  return (p.x - q.x) ** 2 + (p.y - q.y) ** 2
}

/** The `count` items whose swatches sit nearest `point`, nearest first. */
export function nearest<T extends { swatch: Swatch }>(point: WheelPoint, items: readonly T[], count: number): T[] {
  return items
    .map(item => ({ item, d: wheelDistance(point, { hue: item.swatch.h, vivid: item.swatch.vivid }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(({ item }) => item)
}

/** The colour a swatch was read as. */
export function swatchColour({ l, c, h }: Swatch): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
}

/**
 * The colour of a point on the wheel, at a lightness that reads on the
 * near-black page: used for the marker, the ring and the room's tint.
 */
export function pointColour({ hue, vivid }: WheelPoint, lightness = 0.74): string {
  return `oklch(${lightness} ${(0.015 + 0.15 * vivid).toFixed(3)} ${hue.toFixed(1)})`
}

/* -- URL ------------------------------------------------------------------ */

/** `?hue=178&vivid=60` → a point. Missing or malformed values fall back to the default. */
export function parseWheelQuery(query: Record<string, unknown>): WheelPoint {
  const hue = Number(query.hue)
  const vivid = Number(query.vivid)
  const hasHue = query.hue !== undefined && query.hue !== '' && Number.isFinite(hue)
  const hasVivid = query.vivid !== undefined && query.vivid !== '' && Number.isFinite(vivid)
  if (!hasHue && !hasVivid) return DEFAULT_POINT
  return {
    hue: hasHue ? Math.round(normaliseHue(hue)) : DEFAULT_POINT.hue,
    vivid: hasVivid ? Math.min(100, Math.max(0, Math.round(vivid))) / 100 : DEFAULT_POINT.vivid
  }
}

/** A point, rounded to what the URL can hold: whole degrees, whole percent. */
export function roundPoint({ hue, vivid }: WheelPoint): WheelPoint {
  return { hue: Math.round(normaliseHue(hue)) % 360, vivid: Math.round(vivid * 100) / 100 }
}

export function isDefaultPoint(point: WheelPoint): boolean {
  const p = roundPoint(point)
  return p.hue === DEFAULT_POINT.hue && p.vivid === DEFAULT_POINT.vivid
}
