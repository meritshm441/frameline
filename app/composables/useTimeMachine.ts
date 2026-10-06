import type { TimeMachineResponse } from '#shared/types/time-machine'
import { clampYear, DEFAULT_YEAR, parseYear } from '#shared/utils/time-machine'

/**
 * Time Machine state lives in the URL (`?year=1957`), like the Compass and
 * the Atlas: a year can be shared or bookmarked and renders on the server.
 * Scrubbing replaces the entry rather than pushing one per year, so the back
 * button leaves the Time Machine instead of rewinding the dial.
 */
export function useTimeMachine() {
  const route = useRoute()
  const router = useRouter()

  const year = computed(() => parseYear(route.query.year))

  function go(next: number) {
    const value = clampYear(next)
    if (value === year.value) return
    router.replace({ query: value === DEFAULT_YEAR ? {} : { year: value } })
  }

  const reel = useFetch<TimeMachineResponse>(() => `/api/time-machine/${year.value}`, {
    key: computed(() => `time-machine-${year.value}`)
  })

  return { year, go, reel }
}
