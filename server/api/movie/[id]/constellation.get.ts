import type { Constellation, ConstellationLink, ConstellationNode } from '#shared/types/dossier'
import type { MovieDetails, PersonMovieCredit, PersonMovieCredits } from '#shared/types/tmdb'
import { toFilmStub } from '#shared/utils/dossier'

/* ---------------------------------------------------------------------------
 * Constellation: this film, five of its people, and where else they meet
 * ---------------------------------------------------------------------------
 *
 * People: the director, then top-billed cast, five in all.
 * Films:  for each person, their best-known other films (by vote count, so
 *         the titles are recognisable). Films that two or more of the five
 *         share are picked first, because those cross-links are what make it
 *         a constellation rather than five separate lists.
 * ------------------------------------------------------------------------- */

const PEOPLE = 5
const FILMS_PER_PERSON = 3
const MAX_SHARED_FILMS = 6
/** Ignore obscure credits (shorts, cameos in unreleased films…). */
const MIN_VOTES = 200
const CREW_JOBS = new Set(['Director', 'Screenplay', 'Writer'])

type PersonNode = Extract<ConstellationNode, { kind: 'person' }>

function pickPeople(film: MovieDetails): PersonNode[] {
  const people: PersonNode[] = []
  const add = (person: PersonNode) => {
    if (people.length < PEOPLE && !people.some(p => p.id === person.id)) people.push(person)
  }

  const director = film.credits.crew.find(c => c.job === 'Director')
  if (director) {
    add({ kind: 'person', id: director.id, name: director.name, role: 'Director', profile_path: director.profile_path })
  }
  film.credits.cast.forEach(c =>
    add({ kind: 'person', id: c.id, name: c.name, role: c.character || 'Cast', profile_path: c.profile_path })
  )
  return people
}

/** A person's films worth showing: notable, released, in a role that counts, best known first. */
function notableFilms(credits: PersonMovieCredits, exclude: number): PersonMovieCredit[] {
  const seen = new Set<number>([exclude])
  return [...credits.cast, ...credits.crew.filter(c => c.job && CREW_JOBS.has(c.job))]
    .filter(m => !m.adult && m.release_date && m.vote_count >= MIN_VOTES)
    .sort((a, b) => b.vote_count - a.vote_count)
    .filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
}

export default defineCachedEventHandler(async (event): Promise<Constellation> => {
  const id = requireTmdbId(event)
  const film = await tmdb<MovieDetails>(`/movie/${id}`, { append_to_response: 'credits' }, event)
  const people = pickPeople(film)

  const filmographies = await Promise.all(people.map(p =>
    tmdb<PersonMovieCredits>(`/person/${p.id}/movie_credits`, {}, event)
      .then(credits => notableFilms(credits, id))
      // One person's missing filmography shouldn't sink the whole graph.
      .catch((): PersonMovieCredit[] => [])
  ))

  // Who appears in what, across all five filmographies.
  const byFilm = new Map<number, { film: PersonMovieCredit, people: number[] }>()
  filmographies.forEach((films, i) => films.forEach((m) => {
    const entry = byFilm.get(m.id) ?? { film: m, people: [] }
    entry.people.push(people[i]!.id)
    byFilm.set(m.id, entry)
  }))

  // film id → ids of the five who are in it
  const chosen = new Map<number, number[]>()
  // 1. Films shared by two or more of the five.
  const shared = [...byFilm.values()]
    .filter(e => e.people.length > 1)
    .sort((a, b) => b.people.length - a.people.length || b.film.vote_count - a.film.vote_count)
    .slice(0, MAX_SHARED_FILMS)
  shared.forEach(e => chosen.set(e.film.id, e.people))
  // 2. Each person's best-known films, until they have their share of links.
  people.forEach((person, i) => {
    let linked = [...chosen.values()].filter(ids => ids.includes(person.id)).length
    for (const m of filmographies[i]!) {
      if (linked >= FILMS_PER_PERSON) break
      if (chosen.has(m.id)) continue
      chosen.set(m.id, byFilm.get(m.id)!.people)
      linked++
    }
  })

  const nodes: Constellation['nodes'] = [
    { key: `film-${id}`, kind: 'centre', ...toFilmStub(film) },
    ...people.map(p => ({ key: `person-${p.id}`, ...p })),
    ...[...chosen.keys()].map(filmId => ({
      key: `film-${filmId}`,
      kind: 'film' as const,
      ...toFilmStub(byFilm.get(filmId)!.film)
    }))
  ]

  const links: ConstellationLink[] = [
    ...people.map(p => ({ source: `film-${id}`, target: `person-${p.id}` })),
    ...[...chosen].flatMap(([filmId, personIds]) =>
      personIds.map(pid => ({ source: `person-${pid}`, target: `film-${filmId}` }))
    )
  ]

  return { nodes, links }
}, {
  name: 'tmdb-constellation',
  maxAge: ONE_DAY,
  getKey: event => String(getRouterParam(event, 'id'))
})
