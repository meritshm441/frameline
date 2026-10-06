/**
 * The Reel Journal contract (Phase 7). Entries live only in the browser's
 * localStorage and in exported JSON files; nothing here reaches the server.
 */
import type { MoodQuadrant } from '#shared/types/compass'

/** A personal rating, 1 to 5. Null means "not rated". */
export type JournalRating = 1 | 2 | 3 | 4 | 5

/**
 * The film as it was when it was logged. Kept on the entry so the journal
 * and its stats work offline, without asking TMDB again.
 */
export interface JournalFilm {
  id: number
  title: string
  year: string | null
  poster_path: string | null
  /** TMDB genre ids, most important first. Used to place the film on the mood dial. */
  genres: number[]
  /** ISO 3166-1 alpha-2 origin countries (TMDB's `origin_country`), as the Atlas uses. */
  countries: string[]
}

export interface JournalEntry {
  /** Unique per viewing, so a film can be logged again on a rewatch. */
  id: string
  film: JournalFilm
  /** Local calendar date, `YYYY-MM-DD`. */
  watchedOn: string
  /** "F12": a row letter and a seat number, drawn at random for fun. */
  seat: string
  rating: JournalRating | null
  /** One line, at most `NOTE_MAX` characters. */
  note: string
  /** ISO date-time the stub was first written. Orders same-day entries. */
  loggedAt: string
}

/** What the log form edits. The rest of an entry is set by the journal. */
export type JournalDraft = Pick<JournalEntry, 'watchedOn' | 'seat' | 'rating' | 'note'>

/** The exported file. `format` and `version` let a later Frameline read old exports. */
export interface JournalFile {
  format: 'frameline-journal'
  version: 1
  exportedAt: string
  entries: JournalEntry[]
}

export interface JournalImportResult {
  added: number
  /** Entries already in the journal (same entry id). */
  skipped: number
  /** Entries in the file that didn't pass validation. */
  invalid: number
}

export interface JournalStats {
  films: number
  /** Distinct films; rewatches count once. */
  uniqueFilms: number
  countries: {
    /** Every country, from logged films and the Atlas passport together, by name. */
    all: string[]
    fromFilms: number
    fromAtlas: number
  }
  /** Decades (1920 for the 1920s) with at least one logged film, and how many. */
  decades: { decade: number, count: number }[]
  /** Logged films per mood quadrant, and the one the journal leans to (null when empty). */
  moods: Record<MoodQuadrant, number>
  favouriteMood: MoodQuadrant | null
  /** Mean of the rated entries, or null. */
  averageRating: number | null
}
