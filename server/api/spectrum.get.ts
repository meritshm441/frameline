import type { SpectrumFilm, SpectrumResponse } from '#shared/types/spectrum'
import type { Movie, Paginated } from '#shared/types/tmdb'

/* ---------------------------------------------------------------------------
 * Spectrum: the pool of posters the colour wheel sorts
 * ---------------------------------------------------------------------------
 *
 * Colours are read in the browser (see `useSwatches`), so all the server
 * does is gather the pool: the first PAGES pages of `/movie/popular` and
 * `/movie/top_rated`, interleaved so the two lists mix rather than one
 * crowding out the other, deduplicated, and limited to films with a poster.
 * That gives about 200 films: enough that most hues hold a dozen or more,
 * few enough to read on a phone in a few seconds the first time (the
 * results are cached in the browser after that).
 *
 * Popular rotates daily, top-rated barely moves; an hour's cache suits both.
 * ------------------------------------------------------------------------- */

const PAGES = 5

function toFilm(m: Movie & { poster_path: string }): SpectrumFilm {
  const year = Number(m.release_date?.slice(0, 4))
  return {
    id: m.id,
    title: m.title,
    year: Number.isInteger(year) && year > 0 ? year : null,
    poster_path: m.poster_path
  }
}

export default defineCachedEventHandler(async (event): Promise<SpectrumResponse> => {
  const pages = Array.from({ length: PAGES }, (_, i) => i + 1)
  const list = (path: string) => Promise.all(pages.map(page => tmdb<Paginated<Movie>>(path, { page }, event)))

  const [popular, topRated] = await Promise.all([list('/movie/popular'), list('/movie/top_rated')])
  const a = popular.flatMap(p => p.results)
  const b = topRated.flatMap(p => p.results)

  const seen = new Set<number>()
  const films: SpectrumFilm[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const m of [a[i], b[i]]) {
      if (!m?.poster_path || m.adult || seen.has(m.id)) continue
      seen.add(m.id)
      films.push(toFilm({ ...m, poster_path: m.poster_path }))
    }
  }

  return { films }
}, {
  name: 'tmdb-spectrum',
  maxAge: ONE_HOUR,
  getKey: () => 'pool'
})
