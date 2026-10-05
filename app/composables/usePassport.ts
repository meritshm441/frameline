import type { PassportStamp } from '#shared/types/atlas'

const STORAGE_KEY = 'fl-atlas-passport'

function readStamps(): PassportStamp[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is PassportStamp =>
      typeof s?.code === 'string' && typeof s?.at === 'string')
  } catch {
    return []
  }
}

function writeStamps(stamps: PassportStamp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps))
  } catch {
    // Private mode or a full disk: the passport just won't outlive the tab.
  }
}

/**
 * The Atlas passport: every country whose cinema the traveller has opened,
 * with the date of the first visit. Kept in localStorage (no account), so
 * the server always renders an empty passport and the stamps appear once
 * the page mounts. The Reel Journal (Phase 7) reads the same stamps.
 */
export function usePassport() {
  const stamps = useState<PassportStamp[]>('atlas-passport', () => [])
  const loaded = useState('atlas-passport-loaded', () => false)

  function load() {
    if (loaded.value || !import.meta.client) return
    stamps.value = readStamps()
    loaded.value = true
  }

  onMounted(load)

  /** Stamp a country on its first visit. Later visits keep the original date. */
  function stamp(code: string) {
    if (!import.meta.client) return
    // Read before writing, or a visit during hydration would wipe the stored passport.
    load()
    if (stamps.value.some(s => s.code === code)) return
    stamps.value = [...stamps.value, { code, at: new Date().toISOString() }]
    writeStamps(stamps.value)
  }

  const visited = computed(() => new Set(stamps.value.map(s => s.code)))

  return { stamps: readonly(stamps), visited, stamp, loaded: readonly(loaded) }
}
