import type { MoodPoint, MoodQuadrant } from '#shared/types/compass'
import type { JournalEntry, JournalFile, JournalFilm, JournalRating, JournalStats } from '#shared/types/journal'
import type { MovieDetails } from '#shared/types/tmdb'
import { countryName } from '#shared/utils/atlas'
import { GENRE_PINS, moodQuadrant } from '#shared/utils/compass'
import { yearOf } from '#shared/utils/dossier'

/** The note is one line on a stub, not a review. */
export const NOTE_MAX = 120

export const JOURNAL_RATINGS: readonly JournalRating[] = [1, 2, 3, 4, 5]

/** What each rating says, in the house's voice. Read out with the stars. */
export const RATING_WORDS: Record<JournalRating, string> = {
  1: 'Walked out',
  2: 'Not for me',
  3: 'Worth the ticket',
  4: 'Stayed for the credits',
  5: 'Would sneak back in'
}

/** Above this, an imported file is surely not a journal (about 4,000 stubs). */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024

/* ---------------------------------------------------------------------------
 * Seats and dates
 * ------------------------------------------------------------------------- */

/** Cinema rows skip I and O, which read as 1 and 0 on a ticket. */
const SEAT_ROWS = 'ABCDEFGHJKLMNP'
const SEATS_PER_ROW = 24

export function randomSeat(random: () => number = Math.random): string {
  const row = SEAT_ROWS[Math.floor(random() * SEAT_ROWS.length)]
  return `${row}${1 + Math.floor(random() * SEATS_PER_ROW)}`
}

/** A fixed seat for an entry that lost its own, so it doesn't move on every load. */
function seatFromId(id: string): string {
  let hash = 7
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 100_003
  return `${SEAT_ROWS[hash % SEAT_ROWS.length]}${1 + (hash % SEATS_PER_ROW)}`
}

const SEAT_PATTERN = new RegExp(`^[${SEAT_ROWS}]([1-9]|1\\d|2[0-4])$`)

/** `YYYY-MM-DD` for today in the viewer's own time zone (not UTC, or late-night logs land tomorrow). */
export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** A real calendar date in `YYYY-MM-DD` form, from 1888 (the first film) to today. */
export function isWatchDate(value: unknown, today = todayLocal()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime())
    && date.toISOString().startsWith(value)
    && value >= '1888-01-01'
    && value <= today
}

/** Newest viewing first; on the same day, the most recently logged first. */
export function compareEntries(a: JournalEntry, b: JournalEntry): number {
  return b.watchedOn.localeCompare(a.watchedOn) || b.loggedAt.localeCompare(a.loggedAt)
}

/** Snapshot the parts of a film the journal keeps. */
export function toJournalFilm(movie: Pick<MovieDetails, 'id' | 'title' | 'release_date' | 'poster_path' | 'genres' | 'origin_country' | 'production_countries'>): JournalFilm {
  // `origin_country` is what the Atlas filters by; older records sometimes only have production countries.
  const countries = movie.origin_country?.length
    ? movie.origin_country
    : movie.production_countries.map(c => c.iso_3166_1)
  return {
    id: movie.id,
    title: movie.title,
    year: yearOf(movie.release_date),
    poster_path: movie.poster_path,
    genres: movie.genres.map(g => g.id),
    countries: [...new Set(countries)]
  }
}

/* ---------------------------------------------------------------------------
 * Validation. Everything read from storage or an imported file passes through
 * here, so a hand-edited or corrupted file can't put bad data on the page.
 * ------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

function parseFilm(raw: unknown): JournalFilm | null {
  if (!isRecord(raw)) return null
  const id = raw.id
  const title = text(raw.title, 300)
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || !title) return null

  const year = typeof raw.year === 'string' && /^\d{4}$/.test(raw.year) ? raw.year : null
  // TMDB image paths look like "/abc123.jpg"; anything else is dropped rather than loaded.
  const poster = typeof raw.poster_path === 'string' && /^\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(raw.poster_path)
    ? raw.poster_path
    : null
  const genres = Array.isArray(raw.genres)
    ? raw.genres.filter((g): g is number => Number.isInteger(g) && g > 0).slice(0, 10)
    : []
  const countries = Array.isArray(raw.countries)
    ? [...new Set(raw.countries.filter((c): c is string => typeof c === 'string' && /^[A-Z]{2}$/.test(c)))].slice(0, 10)
    : []

  return { id, title, year, poster_path: poster, genres, countries }
}

export function parseRating(value: unknown): JournalRating | null {
  return JOURNAL_RATINGS.find(r => r === value) ?? null
}

export function parseEntry(raw: unknown, today = todayLocal()): JournalEntry | null {
  if (!isRecord(raw)) return null
  const film = parseFilm(raw.film)
  const id = text(raw.id, 64)
  const loggedAt = typeof raw.loggedAt === 'string' && !Number.isNaN(Date.parse(raw.loggedAt))
    ? raw.loggedAt
    : null
  if (!film || !id || !loggedAt || !isWatchDate(raw.watchedOn, today)) return null

  return {
    id,
    film,
    watchedOn: raw.watchedOn,
    seat: typeof raw.seat === 'string' && SEAT_PATTERN.test(raw.seat) ? raw.seat : seatFromId(id),
    rating: parseRating(raw.rating),
    note: text(raw.note, NOTE_MAX),
    loggedAt
  }
}

/** Valid entries, and a count of the ones that weren't. Duplicate ids keep the first. */
export function parseEntries(raw: unknown): { entries: JournalEntry[], invalid: number } {
  if (!Array.isArray(raw)) return { entries: [], invalid: 0 }
  const today = todayLocal()
  const seen = new Set<string>()
  const entries: JournalEntry[] = []
  let invalid = 0
  for (const item of raw) {
    const entry = parseEntry(item, today)
    if (!entry) invalid++
    else if (!seen.has(entry.id)) {
      seen.add(entry.id)
      entries.push(entry)
    }
  }
  return { entries, invalid }
}

/** Read an exported journal file. Null when it isn't one at all. */
export function parseJournalFile(raw: unknown): { entries: JournalEntry[], invalid: number } | null {
  if (!isRecord(raw) || raw.format !== 'frameline-journal' || !Array.isArray(raw.entries)) return null
  return parseEntries(raw.entries)
}

export function toJournalFile(entries: readonly JournalEntry[], now = new Date()): JournalFile {
  return {
    format: 'frameline-journal',
    version: 1,
    exportedAt: now.toISOString(),
    entries: [...entries]
  }
}

/* ---------------------------------------------------------------------------
 * Mood: a film's place on the Compass dial
 *
 * The Compass maps a point on the dial to genres using GENRE_PINS. The journal
 * runs that backwards: a film sits at the weighted centre of its genres' pins.
 * TMDB lists a film's genres most-defining first, so the first counts fully,
 * the second half as much, the third a third, and so on. A thriller-drama
 * lands between Thriller and Drama, nearer Thriller. Genres without a pin
 * (TV Movie) are ignored; a film with none has no mood.
 * ------------------------------------------------------------------------- */

export function moodOfGenres(genres: readonly number[]): MoodPoint | null {
  let x = 0
  let y = 0
  let weight = 0
  genres.forEach((id, i) => {
    const pin = GENRE_PINS.find(p => p.id === id)
    if (!pin) return
    const w = 1 / (i + 1)
    x += pin.x * w
    y += pin.y * w
    weight += w
  })
  return weight ? { x: x / weight, y: y / weight } : null
}

/* ---------------------------------------------------------------------------
 * Stats
 * ------------------------------------------------------------------------- */

const QUADRANT_ORDER: readonly MoodQuadrant[] = ['light-calm', 'light-intense', 'heavy-calm', 'heavy-intense', 'centre']

/**
 * The numbers on the journal's front page. `passport` is the Atlas's list of
 * stamped country codes, so "countries visited" counts both ways of
 * travelling: watching a film from a country, and opening it on the map.
 */
export function journalStats(entries: readonly JournalEntry[], passport: readonly string[]): JournalStats {
  const fromFilms = new Set(entries.flatMap(e => e.film.countries))
  const fromAtlas = new Set(passport)
  const all = [...new Set([...fromFilms, ...fromAtlas])]
    .map(code => countryName(code))
    .sort((a, b) => a.localeCompare(b, 'en'))

  const decadeCounts = new Map<number, number>()
  for (const entry of entries) {
    const year = Number(entry.film.year)
    if (!year) continue
    const decade = Math.floor(year / 10) * 10
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1)
  }

  const moods = Object.fromEntries(QUADRANT_ORDER.map(q => [q, 0])) as Record<MoodQuadrant, number>
  // Ties between quadrants go to the one rated higher overall; unrated films count as a 3.
  const moodScore = Object.fromEntries(QUADRANT_ORDER.map(q => [q, 0])) as Record<MoodQuadrant, number>
  for (const entry of entries) {
    const mood = moodOfGenres(entry.film.genres)
    if (!mood) continue
    const quadrant = moodQuadrant(mood)
    moods[quadrant]++
    moodScore[quadrant] += entry.rating ?? 3
  }
  const favouriteMood = QUADRANT_ORDER
    .filter(q => moods[q] > 0)
    .sort((a, b) => moods[b] - moods[a] || moodScore[b] - moodScore[a])[0] ?? null

  const rated = entries.flatMap(e => (e.rating ? [e.rating] : []))

  return {
    films: entries.length,
    uniqueFilms: new Set(entries.map(e => e.film.id)).size,
    countries: { all, fromFilms: fromFilms.size, fromAtlas: fromAtlas.size },
    decades: [...decadeCounts].map(([decade, count]) => ({ decade, count })).sort((a, b) => a.decade - b.decade),
    moods,
    favouriteMood,
    averageRating: rated.length ? rated.reduce((sum, r) => sum + r, 0) / rated.length : null
  }
}
