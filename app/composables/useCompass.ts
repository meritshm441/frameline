import type { CompassCompany, CompassQuery, CompassResponse, CompassRuntime } from '#shared/types/compass'
import { parseCompassQuery } from '#shared/utils/compass'

export interface CompassOption<T extends string> {
  value: T
  label: string
  hint: string
}

export const RUNTIME_OPTIONS: readonly CompassOption<CompassRuntime>[] = [
  { value: 'short', label: 'Under 100', hint: 'A short reel' },
  { value: 'standard', label: '100 to 130', hint: 'A full feature' },
  { value: 'epic', label: 'Epic', hint: 'The whole evening' }
]

export const COMPANY_OPTIONS: readonly CompassOption<CompassCompany>[] = [
  { value: 'solo', label: 'Solo', hint: 'Deeper cuts' },
  { value: 'date', label: 'A date', hint: 'Something to share' },
  { value: 'friends', label: 'Friends', hint: 'Crowd favourites' },
  { value: 'family', label: 'Family', hint: 'Rated G or PG' }
]

/**
 * Compass state lives in the URL (`?x=&y=&runtime=&company=&seed=`), so a
 * programme can be bookmarked or shared, renders on the server, and survives
 * the back button. The URL is parsed with the same function the API uses.
 */
export function useCompass() {
  const route = useRoute()
  const router = useRouter()

  const query = computed(() => parseCompassQuery(route.query))

  function update(patch: Partial<Omit<CompassQuery, 'seed'>>) {
    // Any change of brief starts a fresh programme, so the URL stays canonical.
    write({ ...query.value, ...patch, seed: 0 })
  }

  function reshuffle() {
    write({ ...query.value, seed: query.value.seed + 1 })
  }

  function write(next: CompassQuery) {
    const { seed, ...rest } = parseCompassQuery({ ...next })
    router.replace({ query: { ...rest, ...(seed ? { seed } : {}) } })
  }

  const programme = useFetch<CompassResponse>('/api/compass', {
    query,
    key: computed(() => {
      const q = query.value
      return `compass-${q.x}-${q.y}-${q.runtime}-${q.company}-${q.seed}`
    })
  })

  return { query, update, reshuffle, programme }
}
