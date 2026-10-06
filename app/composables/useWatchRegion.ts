const STORAGE_KEY = 'fl-watch-region'

/** "en-GB,en;q=0.9" or "en-GB" → "GB". Falls back to US. */
function regionFromLocale(locale: string | undefined): string {
  const match = locale?.match(/^[a-z]{2,3}[-_]([A-Z]{2})\b/i)
  return match?.[1]?.toUpperCase() ?? 'US'
}

/**
 * The viewer's country for "Where to watch". The server guesses it from
 * Accept-Language so the first render is right; a region the viewer picks
 * is remembered in localStorage and applied after hydration.
 */
export function useWatchRegion() {
  const headers = useRequestHeaders(['accept-language'])
  const region = useState('watch-region', () =>
    regionFromLocale(import.meta.server ? headers['accept-language'] : navigator.language)
  )

  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && /^[A-Z]{2}$/.test(saved)) region.value = saved
    } catch {
      // Storage blocked: keep the guess.
    }
  })

  function setRegion(code: string) {
    region.value = code
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // Not remembered, but still applied for this visit.
    }
  }

  return { region: readonly(region), setRegion }
}
