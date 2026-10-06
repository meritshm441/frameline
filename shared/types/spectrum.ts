/**
 * The Spectrum contract (Phase 6), shared by `/api/spectrum` and the app.
 */

/** One film in the Spectrum's pool. Every film in it has a poster. */
export interface SpectrumFilm {
  id: number
  title: string
  /** Year of first release, or null when TMDB doesn't know it. */
  year: number | null
  poster_path: string
}

export interface SpectrumResponse {
  films: SpectrumFilm[]
}

/**
 * A poster's dominant colour, read client-side from its pixels. Hue and
 * chroma are OKLCH, so equal steps look like equal changes to the eye.
 */
export interface Swatch {
  /** OKLCH lightness of the dominant colour, 0–1. */
  l: number
  /** OKLCH chroma of the dominant colour, roughly 0–0.32. */
  c: number
  /** OKLCH hue angle in degrees, 0–360. */
  h: number
  /**
   * How strongly the poster reads as that colour, 0–1: vivid and covering
   * most of the poster is 1; a grey poster with a small red title is near 0.
   * It is the swatch's distance from the centre of the wheel.
   */
  vivid: number
}

/** A point on the colour wheel: hue in degrees, vividness from the centre (0) to the rim (1). */
export interface WheelPoint {
  hue: number
  vivid: number
}
