import type { AtlasQuery, AtlasResponse } from '#shared/types/atlas'
import { FIRST_DECADE, isFullSpan, LAST_DECADE, parseAtlasQuery } from '#shared/utils/atlas'

/**
 * Atlas state lives in the URL (`?country=FR&from=1960&to=1970`), like the
 * Compass: an open drawer can be shared or bookmarked, renders on the
 * server, and the back button walks back through the countries visited.
 * The decade span survives a change of country, so a traveller can tour
 * the 1970s from one place to the next.
 */
export function useAtlas() {
  const route = useRoute()
  const router = useRouter()

  const query = computed(() => parseAtlasQuery(route.query))

  function write(next: AtlasQuery, { push = false } = {}) {
    const q = parseAtlasQuery({ ...next })
    const location = {
      query: {
        ...(q.country ? { country: q.country } : {}),
        ...(isFullSpan(q) ? {} : { from: q.from, to: q.to })
      }
    }
    return push ? router.push(location) : router.replace(location)
  }

  /** Each country opened is a step in history, so "back" returns to the last one. */
  function open(country: string) {
    if (country !== query.value.country) write({ ...query.value, country }, { push: true })
  }

  function close() {
    write({ ...query.value, country: null })
  }

  function setSpan(from: number, to: number) {
    write({ ...query.value, from, to })
  }

  function resetSpan() {
    setSpan(FIRST_DECADE, LAST_DECADE)
  }

  // Only the first reel is fetched here (and on the server); the drawer
  // pages further on demand.
  const films = useAsyncData<AtlasResponse | null>(
    () => {
      const q = query.value
      return q.country ? `atlas-${q.country}-${q.from}-${q.to}` : 'atlas-none'
    },
    () => {
      const { country, from, to } = query.value
      if (!country) return Promise.resolve(null)
      return $fetch<AtlasResponse>(`/api/atlas/${country}`, { query: { from, to } })
    }
  )

  return { query, open, close, setSpan, resetSpan, films }
}
