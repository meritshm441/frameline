import type { JournalDraft, JournalEntry, JournalFilm, JournalImportResult } from '#shared/types/journal'
import { compareEntries, IMPORT_MAX_BYTES, parseEntries, parseJournalFile, toJournalFile, todayLocal } from '#shared/utils/journal'

const STORAGE_KEY = 'fl-journal'

/** What localStorage holds. Versioned so the shape can change later. */
interface StoredJournal {
  version: 1
  entries: JournalEntry[]
}

function readEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    const list = typeof parsed === 'object' && parsed !== null && 'entries' in parsed ? parsed.entries : []
    return parseEntries(list).entries
  } catch {
    return []
  }
}

/** False when the browser refused (private mode, full disk, storage blocked). */
function writeEntries(entries: JournalEntry[]): boolean {
  try {
    const stored: StoredJournal = { version: 1, entries }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Older browsers, or a page served over plain http.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export class JournalImportError extends Error {}

/**
 * The Reel Journal: a personal watch log kept in localStorage (no account).
 * Like the Atlas passport, the server always renders an empty journal and
 * the stubs appear once the page mounts. Every storage call is wrapped, and
 * when the browser won't save, `unsaved` says so, so the page can suggest
 * exporting before the tab is closed.
 */
export function useJournal() {
  const stored = useState<JournalEntry[]>('journal-entries', () => [])
  const loaded = useState('journal-loaded', () => false)
  const unsaved = useState('journal-unsaved', () => false)

  function load() {
    if (loaded.value || !import.meta.client) return
    stored.value = readEntries()
    loaded.value = true
  }

  onMounted(load)

  function commit(next: JournalEntry[]) {
    stored.value = next
    unsaved.value = !writeEntries(next)
  }

  /** Newest viewing first. */
  const entries = computed(() => [...stored.value].sort(compareEntries))

  function add(film: JournalFilm, draft: JournalDraft): JournalEntry | null {
    if (!import.meta.client) return null
    // Read before writing, or logging during hydration would wipe the stored journal.
    load()
    const entry: JournalEntry = {
      id: newId(),
      film,
      ...draft,
      loggedAt: new Date().toISOString()
    }
    commit([...stored.value, entry])
    return entry
  }

  function update(id: string, draft: JournalDraft) {
    load()
    commit(stored.value.map(e => (e.id === id ? { ...e, ...draft } : e)))
  }

  /** Remove a stub and hand it back, so the caller can offer to undo. */
  function remove(id: string): JournalEntry | null {
    load()
    const entry = stored.value.find(e => e.id === id) ?? null
    if (entry) commit(stored.value.filter(e => e.id !== id))
    return entry
  }

  function restore(entry: JournalEntry) {
    load()
    if (!stored.value.some(e => e.id === entry.id)) commit([...stored.value, entry])
  }

  function clear() {
    load()
    stored.value = []
    try {
      localStorage.removeItem(STORAGE_KEY)
      unsaved.value = false
    } catch {
      // Storage unavailable: the in-memory journal is still cleared.
    }
  }

  /** Every viewing of one film, newest first. */
  function viewingsOf(filmId: number) {
    return entries.value.filter(e => e.film.id === filmId)
  }

  function exportFile() {
    const file = toJournalFile(entries.value)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `frameline-journal-${todayLocal()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    // Give the download a moment to start before the URL is released.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /**
   * Merge an exported journal into this one. Stubs already here (same entry
   * id) are kept as they are, so importing the same file twice is harmless.
   */
  async function importFile(file: File): Promise<JournalImportResult> {
    load()
    if (file.size > IMPORT_MAX_BYTES) {
      throw new JournalImportError('That file is too large to be a Frameline journal.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      throw new JournalImportError('That file isn’t readable JSON.')
    }

    const result = parseJournalFile(parsed)
    if (!result) throw new JournalImportError('That file isn’t a Frameline journal export.')

    const have = new Set(stored.value.map(e => e.id))
    const fresh = result.entries.filter(e => !have.has(e.id))
    if (fresh.length) commit([...stored.value, ...fresh])

    return {
      added: fresh.length,
      skipped: result.entries.length - fresh.length,
      invalid: result.invalid
    }
  }

  return {
    entries,
    loaded: readonly(loaded),
    unsaved: readonly(unsaved),
    add,
    update,
    remove,
    restore,
    clear,
    viewingsOf,
    exportFile,
    importFile
  }
}
