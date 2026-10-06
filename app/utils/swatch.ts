import type { Swatch } from '#shared/types/spectrum'

/* ---------------------------------------------------------------------------
 * Reading a poster's dominant colour
 * ---------------------------------------------------------------------------
 *
 * A plain average turns every poster into brown, and the most common pixel
 * is nearly always the black of a night sky or a title card. So we look for
 * the dominant *hue*, in OKLab, where distances match what the eye sees:
 *
 * 1. Each pixel is converted to OKLab. Pixels too grey (chroma < CHROMA_MIN)
 *    or too dark to have a trustworthy hue (L < DARK) only count towards
 *    the poster's size.
 * 2. The rest vote into HUE_BINS bins by hue, each vote weighted by chroma,
 *    so a vivid red title can outvote a larger patch of dull beige, but not
 *    a whole sky of blue.
 * 3. The bins are smoothed with their neighbours (a hue on a bin edge
 *    shouldn't be split in two), and the heaviest wins.
 * 4. The colour is the chroma-weighted mean of the pixels in the winning bin
 *    and its two neighbours.
 *
 * `vivid` is how strongly the poster reads as that colour: the colour's
 * chroma (relative to FULL_CHROMA) times the share of the poster it covers
 * (relative to FULL_SHARE), square-rooted so muted posters spread across the
 * wheel instead of piling up near its centre.
 * ------------------------------------------------------------------------- */

const HUE_BINS = 36
const CHROMA_MIN = 0.04
const DARK = 0.18
const FULL_CHROMA = 0.16
const FULL_SHARE = 0.45

/** sRGB byte → linear light, precomputed. */
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

/** Linear sRGB → OKLab (Björn Ottosson's matrices). */
function oklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

/** The dominant colour of an RGBA pixel buffer (as from `getImageData`). */
export function readSwatch(pixels: Uint8ClampedArray): Swatch {
  const weight = new Float64Array(HUE_BINS)
  const count = new Uint32Array(HUE_BINS)
  const sumA = new Float64Array(HUE_BINS)
  const sumB = new Float64Array(HUE_BINS)
  const sumL = new Float64Array(HUE_BINS)
  let total = 0
  let lightness = 0

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue
    const [L, a, b] = oklab(LINEAR[pixels[i]!]!, LINEAR[pixels[i + 1]!]!, LINEAR[pixels[i + 2]!]!)
    total++
    lightness += L
    const c = Math.hypot(a, b)
    if (c < CHROMA_MIN || L < DARK) continue
    const hue = (Math.atan2(b, a) * 180) / Math.PI + 360
    const bin = Math.floor((hue % 360) / (360 / HUE_BINS))
    weight[bin]! += c
    count[bin]!++
    sumA[bin]! += a * c
    sumB[bin]! += b * c
    sumL[bin]! += L * c
  }

  const grey: Swatch = { l: round(total ? lightness / total : 0, 3), c: 0, h: 0, vivid: 0 }
  if (!total) return grey

  let peak = -1
  let best = 0
  for (let i = 0; i < HUE_BINS; i++) {
    const smoothed = weight[i]! + 0.5 * (weight[(i + HUE_BINS - 1) % HUE_BINS]! + weight[(i + 1) % HUE_BINS]!)
    if (smoothed > best) {
      best = smoothed
      peak = i
    }
  }
  if (peak === -1) return grey

  let w = 0
  let n = 0
  let A = 0
  let B = 0
  let L = 0
  for (const offset of [-1, 0, 1]) {
    const bin = (peak + offset + HUE_BINS) % HUE_BINS
    w += weight[bin]!
    n += count[bin]!
    A += sumA[bin]!
    B += sumB[bin]!
    L += sumL[bin]!
  }

  const c = Math.hypot(A / w, B / w)
  const h = ((Math.atan2(B / w, A / w) * 180) / Math.PI + 360) % 360
  const vivid = Math.sqrt(Math.min(1, c / FULL_CHROMA) * Math.min(1, n / total / FULL_SHARE))

  return { l: round(L / w, 3), c: round(c, 3), h: round(h, 1), vivid: round(vivid, 3) }
}
