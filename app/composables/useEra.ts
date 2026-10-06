import { decadeOfYear } from '#shared/utils/time-machine'

/**
 * How the Time Machine's room looks in each decade. One entry per decade,
 * 1920s to 2020s, each a set of theme tokens:
 *
 *  - `room` overrides the site-wide `--fl-*` tokens on `<html>`, so the
 *    header, focus rings, film grain and vignette all change with the year.
 *    `grade` is a translucent wash laid over the whole page with the
 *    vignette; it is kept faint so text contrast holds.
 *  - `stock` is a CSS filter for posters, like the film stock of the day.
 *  - `type` sets the display lettering, from what's loaded already:
 *    Fraunces (300 to 900, italic) and Inter (300 to 700).
 *
 * Every accent clears 5:1 against its background.
 */
export interface EraTheme {
  decade: number
  /** "The silent era" */
  name: string
  /** One line on how the decade looked. */
  note: string
  room: {
    bg: string
    accent: string
    grade: string
    grain: number
    vignette: number
  }
  stock: string
  type: {
    family: 'serif' | 'sans'
    weight: number
    italic: boolean
    case: 'none' | 'uppercase' | 'lowercase'
    tracking: string
    /** A text-shadow: neon glow, print misregistration, VHS colour bleed. */
    shadow: string
  }
}

const NO_SHADOW = 'none'

export const ERAS: Readonly<Record<number, EraTheme>> = {
  1920: {
    decade: 1920,
    name: 'The silent era',
    note: 'Sepia prints, iris shots and title cards. The pictures learn to talk in 1927.',
    room: { bg: '#110d08', accent: '#d8b98a', grade: 'rgb(140 95 40 / 0.10)', grain: 0.17, vignette: 0.9 },
    stock: 'sepia(0.9) contrast(1.05) brightness(0.92)',
    type: { family: 'serif', weight: 300, italic: false, case: 'uppercase', tracking: '0.08em', shadow: NO_SHADOW }
  },
  1930: {
    decade: 1930,
    name: 'The talkies',
    note: 'Silver nitrate, studio glamour and the first sound stages. Colour is a rare luxury.',
    room: { bg: '#0c0c0c', accent: '#d4d0c6', grade: 'rgb(150 150 150 / 0.04)', grain: 0.14, vignette: 0.8 },
    stock: 'grayscale(1) contrast(1.08)',
    type: { family: 'serif', weight: 500, italic: true, case: 'none', tracking: '-0.02em', shadow: NO_SHADOW }
  },
  1940: {
    decade: 1940,
    name: 'Noir and wartime',
    note: 'Hard shadows, venetian blinds and rain on the streets. Black and white at its sharpest.',
    room: { bg: '#07080a', accent: '#9fb3c8', grade: 'rgb(30 45 70 / 0.10)', grain: 0.12, vignette: 0.85 },
    stock: 'grayscale(1) contrast(1.35) brightness(0.88)',
    type: { family: 'serif', weight: 700, italic: true, case: 'none', tracking: '-0.03em', shadow: NO_SHADOW }
  },
  1950: {
    decade: 1950,
    name: 'Technicolor and widescreen',
    note: 'Three-strip colour, CinemaScope and drive-ins. Everything is louder and redder.',
    room: { bg: '#0e0908', accent: '#f0524a', grade: 'rgb(255 70 40 / 0.035)', grain: 0.09, vignette: 0.6 },
    stock: 'saturate(1.7) contrast(1.08)',
    type: {
      family: 'serif',
      weight: 900,
      italic: true,
      case: 'none',
      tracking: '-0.04em',
      shadow: '0.045em 0.045em 0 color-mix(in oklab, var(--fl-accent) 35%, transparent)'
    }
  },
  1960: {
    decade: 1960,
    name: 'The new waves',
    note: 'Handheld cameras, jump cuts and Eastmancolor pastels. Paris, Prague and Tokyo rewrite the rules.',
    room: { bg: '#090c0b', accent: '#7fcbb4', grade: 'rgb(60 160 140 / 0.035)', grain: 0.09, vignette: 0.55 },
    stock: 'saturate(1.15) sepia(0.12) hue-rotate(-6deg)',
    type: { family: 'sans', weight: 300, italic: false, case: 'lowercase', tracking: '-0.05em', shadow: NO_SHADOW }
  },
  1970: {
    decade: 1970,
    name: 'New Hollywood',
    note: 'Grainy, sun-bleached and brown. Directors take over the studios, for a while.',
    room: { bg: '#0f0b07', accent: '#e08a3c', grade: 'rgb(180 110 40 / 0.07)', grain: 0.13, vignette: 0.65 },
    stock: 'sepia(0.35) saturate(1.25) contrast(0.95)',
    type: { family: 'serif', weight: 900, italic: false, case: 'none', tracking: '-0.05em', shadow: NO_SHADOW }
  },
  1980: {
    decade: 1980,
    name: 'Neon and VHS',
    note: 'Synthesisers, smoke machines and the video shop. The blockbuster comes home.',
    room: { bg: '#0d0812', accent: '#ff5fd2', grade: 'rgb(140 40 200 / 0.07)', grain: 0.07, vignette: 0.6 },
    stock: 'saturate(1.45) contrast(1.15) hue-rotate(-8deg)',
    type: {
      family: 'sans',
      weight: 700,
      italic: true,
      case: 'uppercase',
      tracking: '-0.02em',
      shadow: '0 0 0.06em var(--fl-accent), 0 0 0.3em color-mix(in oklab, var(--fl-accent) 55%, transparent)'
    }
  },
  1990: {
    decade: 1990,
    name: 'The indie boom',
    note: 'Sundance, video stores and tracking lines. Small films find big audiences.',
    room: { bg: '#0a0b08', accent: '#bfdc5a', grade: 'rgb(90 120 40 / 0.04)', grain: 0.06, vignette: 0.5 },
    stock: 'contrast(1.05) saturate(0.9) sepia(0.08)',
    type: {
      family: 'sans',
      weight: 700,
      italic: false,
      case: 'uppercase',
      tracking: '-0.01em',
      shadow: '-0.03em 0 0 rgb(255 0 80 / 0.5), 0.03em 0 0 rgb(0 220 255 / 0.5)'
    }
  },
  2000: {
    decade: 2000,
    name: 'The digital turn',
    note: 'Digital intermediates, bleach bypass and a green-teal cast over everything.',
    room: { bg: '#080b0c', accent: '#5fbccf', grade: 'rgb(40 110 130 / 0.06)', grain: 0.04, vignette: 0.5 },
    stock: 'saturate(0.6) contrast(1.2)',
    type: { family: 'sans', weight: 300, italic: false, case: 'uppercase', tracking: '0.12em', shadow: NO_SHADOW }
  },
  2010: {
    decade: 2010,
    name: 'Teal and orange',
    note: 'Clean digital sensors, superhero sequels and the arrival of streaming.',
    room: { bg: '#0a0a0a', accent: '#f2925a', grade: 'rgb(30 90 110 / 0.03)', grain: 0.025, vignette: 0.45 },
    stock: 'saturate(1.1) contrast(1.05)',
    type: { family: 'serif', weight: 400, italic: false, case: 'none', tracking: '-0.02em', shadow: NO_SHADOW }
  },
  2020: {
    decade: 2020,
    name: 'The present',
    note: 'Empty cinemas, then full ones again. The house lights are up.',
    room: { bg: '#0b0a09', accent: '#e8a94f', grade: 'transparent', grain: 0.07, vignette: 0.55 },
    stock: 'none',
    type: { family: 'serif', weight: 300, italic: false, case: 'none', tracking: '-0.02em', shadow: NO_SHADOW }
  }
}

export function eraOf(year: number): EraTheme {
  const decade = Math.min(2020, Math.max(1920, decadeOfYear(year)))
  return ERAS[decade]!
}

/**
 * Applies the era of `year` to the page. The room tokens go on `<html>` via
 * `useHead`, so they render on the server and are removed when the page is
 * left; `main.css` registers them with `@property` so they cross-fade.
 * `style` holds the type and stock tokens for the page's own root element.
 */
export function useEra(year: MaybeRefOrGetter<number>) {
  const era = computed(() => eraOf(toValue(year)))

  useHead({
    htmlAttrs: {
      style: () => {
        const { bg, accent, grade, grain, vignette } = era.value.room
        return `--fl-bg:${bg};--fl-accent:${accent};--fl-grade:${grade};--fl-grain-opacity:${grain};--fl-vignette-strength:${vignette}`
      }
    }
  })

  const style = computed(() => {
    const { stock, type } = era.value
    return {
      '--era-stock': stock,
      '--era-font': type.family === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
      '--era-weight': String(type.weight),
      '--era-style': type.italic ? 'italic' : 'normal',
      '--era-case': type.case,
      '--era-tracking': type.tracking,
      '--era-shadow': type.shadow
    }
  })

  return { era, style }
}
