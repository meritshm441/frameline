import { defineProvider } from '@nuxt/image/runtime'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// TMDB only serves fixed widths; snap any requested width up to the nearest one.
const WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const

export function snapTmdbWidth(width?: number): string {
  if (!width) return 'w500'
  const match = WIDTHS.find(w => w >= width)
  return match ? `w${match}` : 'original'
}

export default defineProvider<{ baseURL?: string }>({
  getImage: (src, { modifiers, baseURL = TMDB_IMAGE_BASE }) => {
    const width = Number(modifiers?.width) || undefined
    const path = src.startsWith('/') ? src : `/${src}`
    return { url: `${baseURL}/${snapTmdbWidth(width)}${path}` }
  }
})
