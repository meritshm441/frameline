import type { WatchRegionOffers, WatchResponse } from '#shared/types/tmdb'

/* ---------------------------------------------------------------------------
 * Where to watch: official streaming, rental and purchase offers
 * ---------------------------------------------------------------------------
 *
 * TMDB's watch-provider data comes from JustWatch, which it must be credited
 * to. TMDB returns every region at once, so that's cached per film for a day
 * and this route hands back one region (`?region=GB`, defaulting to US) plus
 * the list of regions that have any offers, for the region picker.
 * ------------------------------------------------------------------------- */

const getAllRegions = defineCachedFunction(
  async (id: number) => {
    const data = await tmdb<{ results: Record<string, WatchRegionOffers> }>(`/movie/${id}/watch/providers`)
    return data.results
  },
  { name: 'tmdb-watch-providers', maxAge: ONE_DAY, getKey: (id: number) => String(id) }
)

export default defineEventHandler(async (event): Promise<WatchResponse> => {
  const id = requireTmdbId(event)
  const raw = String(getQuery(event).region ?? 'US').toUpperCase()
  const region = /^[A-Z]{2}$/.test(raw) ? raw : 'US'

  const all = await getAllRegions(id)
  return {
    region,
    regions: Object.keys(all).sort(),
    offers: all[region] ?? null
  }
})
