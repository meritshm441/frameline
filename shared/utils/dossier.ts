import type { Movie, Video } from '#shared/types/tmdb'
import type { FilmStub } from '#shared/types/dossier'

export function yearOf(date: string | null | undefined): string | null {
  return date && date.length >= 4 ? date.slice(0, 4) : null
}

/** "1970s" for 1975; null when the date is missing. */
export function decadeOf(date: string | null | undefined): string | null {
  const year = Number(yearOf(date))
  return year ? `${Math.floor(year / 10) * 10}s` : null
}

export function toFilmStub(movie: Pick<Movie, 'id' | 'title' | 'release_date' | 'poster_path'>): FilmStub {
  return {
    id: movie.id,
    title: movie.title,
    year: yearOf(movie.release_date),
    poster_path: movie.poster_path
  }
}

/**
 * The film's official YouTube trailer, or null. Only official uploads of type
 * "Trailer" qualify (no teasers, clips or fan uploads). English first, then
 * the earliest published, which is usually the original theatrical trailer.
 */
export function pickTrailer(videos: Video[]): Video | null {
  const official = videos.filter(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
  return official.sort((a, b) =>
    Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en')
    || a.published_at.localeCompare(b.published_at)
  )[0] ?? null
}
