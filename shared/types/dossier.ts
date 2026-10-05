/**
 * The Film Dossier contract (Phase 3): the Double Feature pairing, the
 * Constellation graph and the person page, shared by `server/api` and the app.
 */

/** A film reduced to what a dossier card or graph node needs. */
export interface FilmStub {
  id: number
  title: string
  year: string | null
  poster_path: string | null
}

export interface DoubleFeature {
  film: FilmStub & {
    backdrop_path: string | null
    overview: string
    director: string | null
  }
  /** What the two films have in common, most telling first, e.g. ["heist", "1970s", "ensemble cast"]. */
  shares: string[]
}

export interface DoubleFeatureResponse {
  pairing: DoubleFeature | null
}

export type ConstellationNode
  = | ({ kind: 'centre' } & FilmStub)
    | ({ kind: 'film' } & FilmStub)
    | {
      kind: 'person'
      id: number
      name: string
      /** "Director", or the character they played. */
      role: string
      profile_path: string | null
    }

/** Node ids are namespaced (`film-603`, `person-6384`) since TMDB ids collide across types. */
export interface ConstellationLink {
  source: string
  target: string
}

export interface Constellation {
  nodes: (ConstellationNode & { key: string })[]
  links: ConstellationLink[]
}

/** One line of a person's filmography on `/person/[id]`. */
export interface FilmographyEntry extends FilmStub {
  /** Characters played and/or crew jobs, merged, e.g. ["Neo", "Producer"]. */
  roles: string[]
  vote_count: number
}

export interface PersonDossier {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  /** Their four best-known films. */
  known_for: FilmographyEntry[]
  /** Every dated film, newest first. */
  filmography: FilmographyEntry[]
}
