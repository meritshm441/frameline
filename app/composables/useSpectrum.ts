import type { SpectrumResponse, WheelPoint } from '#shared/types/spectrum'
import { isDefaultPoint, parseWheelQuery, roundPoint } from '#shared/utils/spectrum'

/**
 * Spectrum state lives in the URL (`?hue=178&vivid=60`), like the other
 * rooms, so a colour can be shared. Moving the wheel replaces the entry
 * rather than pushing one per nudge. The pool is fetched once and is the
 * same for every colour; matching happens in the browser.
 */
export function useSpectrum() {
  const route = useRoute()
  const router = useRouter()

  const point = computed(() => parseWheelQuery(route.query))

  function go(next: WheelPoint) {
    const p = roundPoint(next)
    if (p.hue === point.value.hue && p.vivid === point.value.vivid) return
    router.replace({ query: isDefaultPoint(p) ? {} : { hue: p.hue, vivid: Math.round(p.vivid * 100) } })
  }

  const pool = useFetch<SpectrumResponse>('/api/spectrum', { key: 'spectrum-pool' })

  return { point, go, pool }
}
