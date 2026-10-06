import type { SpectrumFilm, Swatch } from '#shared/types/spectrum'

/* ---------------------------------------------------------------------------
 * Poster swatches, read in the browser and remembered
 * ---------------------------------------------------------------------------
 *
 * Each poster is loaded at TMDB's smallest size (w92) with
 * `crossOrigin="anonymous"` (TMDB's image CDN allows any origin), drawn onto
 * a small canvas and handed to `readSwatch`. Results are cached twice:
 *
 * - in memory, for the life of the tab, so returning to the Spectrum is
 *   instant;
 * - in localStorage, keyed by poster path, so the next visit only reads
 *   posters it hasn't seen. TMDB never reuses a poster's file name, so a
 *   cached swatch can't go stale. The store keeps the newest MAX_STORED.
 *
 * A poster that fails (network, a tainted canvas, a browser that blocks
 * canvas reads) is skipped for the rest of the tab and left off the wheel;
 * if every poster fails, the page says so and falls back to a plain list.
 * ------------------------------------------------------------------------- */

const STORAGE_KEY = 'fl-spectrum-swatches'
const STORAGE_VERSION = 1
const MAX_STORED = 600
const CONCURRENCY = 6
const TIMEOUT = 15_000
/** w92 posters are 92×138; half that keeps enough detail and smooths JPEG noise. */
const SAMPLE_W = 46
const SAMPLE_H = 69
/** Re-render (and re-rank) at most this often while reading. */
const FLUSH_EVERY = 120

type Stored = [l: number, c: number, h: number, vivid: number]

/** Module scope: survives navigation, never touched on the server. */
const memory = new Map<string, Swatch>()
const failed = new Set<string>()
let storageLoaded = false

function loadStorage() {
  if (storageLoaded) return
  storageLoaded = true
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return
    const { v, s } = parsed as { v?: unknown, s?: unknown }
    if (v !== STORAGE_VERSION || !s || typeof s !== 'object') return
    for (const [path, value] of Object.entries(s)) {
      if (!Array.isArray(value) || value.length !== 4 || !value.every(n => typeof n === 'number' && Number.isFinite(n))) continue
      const [l, c, h, vivid] = value as Stored
      if (!memory.has(path)) memory.set(path, { l, c, h, vivid })
    }
  } catch {
    // Unreadable or blocked storage: start from an empty cache.
  }
}

/** Write the newest swatches back, the current pool's first so they survive the cap. */
function saveStorage(priority: readonly string[]) {
  const order = [...new Set([...priority, ...[...memory.keys()].reverse()])]
  const s: Record<string, Stored> = {}
  let n = 0
  for (const path of order) {
    const sw = memory.get(path)
    if (!sw) continue
    s[path] = [sw.l, sw.c, sw.h, sw.vivid]
    if (++n >= MAX_STORED) break
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, s }))
  } catch {
    // Private mode or a full disk: the swatches just won't outlive the tab.
  }
}

let sampler: CanvasRenderingContext2D | null | undefined

function getSampler(): CanvasRenderingContext2D | null {
  if (sampler !== undefined) return sampler
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_W
    canvas.height = SAMPLE_H
    sampler = canvas.getContext('2d', { willReadFrequently: true })
  } catch {
    sampler = null
  }
  return sampler
}

async function readPoster(path: string): Promise<Swatch> {
  const ctx = getSampler()
  if (!ctx) throw new Error('Canvas unavailable')
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.decoding = 'async'
  img.src = tmdbImageUrl(path, 'w92')!
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      img.decode(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out')), TIMEOUT)
      })
    ])
  } finally {
    clearTimeout(timer)
  }
  // Drawing and reading are synchronous, so one shared canvas is safe.
  ctx.clearRect(0, 0, SAMPLE_W, SAMPLE_H)
  ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H)
  return readSwatch(ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data)
}

/**
 * Swatches for a pool of films. On the server, and until the page mounts,
 * nothing has been read; after that, cached swatches appear at once and
 * the rest arrive as their posters are read.
 */
export function useSwatches(films: MaybeRefOrGetter<readonly SpectrumFilm[]>) {
  const swatches = shallowRef<ReadonlyMap<string, Swatch>>(new Map())
  const failures = ref(0)
  const reading = ref(false)
  const mounted = ref(false)

  const paths = computed(() => toValue(films).map(f => f.poster_path))
  let run = 0

  function publish(list: readonly string[]) {
    const next = new Map<string, Swatch>()
    for (const path of list) {
      const sw = memory.get(path)
      if (sw) next.set(path, sw)
    }
    swatches.value = next
    failures.value = list.filter(path => failed.has(path)).length
  }

  async function readAll() {
    const id = ++run
    const list = paths.value
    loadStorage()
    publish(list)

    const queue = list.filter(path => !memory.has(path) && !failed.has(path))
    if (!queue.length) {
      reading.value = false
      return
    }
    reading.value = true

    let dirty = false
    let flushedAt = 0
    // The final publish below catches whatever the last flush missed.
    const flush = () => {
      const now = performance.now()
      if (id !== run || now - flushedAt < FLUSH_EVERY) return
      flushedAt = now
      publish(list)
    }

    async function worker() {
      while (queue.length && id === run) {
        const path = queue.shift()!
        try {
          memory.set(path, await readPoster(path))
          dirty = true
        } catch {
          failed.add(path)
        }
        flush()
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
    if (dirty) saveStorage(list)
    if (id !== run) return
    publish(list)
    reading.value = false
  }

  onMounted(() => {
    mounted.value = true
    readAll()
  })
  watch(paths, () => {
    if (mounted.value) readAll()
  })
  onBeforeUnmount(() => {
    // Stops the workers after their current poster.
    run++
  })

  /** True once every poster has been tried and none could be read. */
  const unreadable = computed(() =>
    mounted.value && !reading.value && paths.value.length > 0 && swatches.value.size === 0)

  return {
    swatches,
    failures,
    reading: readonly(reading),
    /** False on the server and during hydration: swatches haven't been looked for yet. */
    ready: computed(() => mounted.value && !reading.value),
    mounted: readonly(mounted),
    unreadable
  }
}
