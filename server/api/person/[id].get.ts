import type { FilmographyEntry, PersonDossier } from '#shared/types/dossier'
import type { PersonDetails, PersonMovieCredit } from '#shared/types/tmdb'
import { toFilmStub } from '#shared/utils/dossier'

const KNOWN_FOR = 4

/**
 * A person's dossier: biography plus one merged filmography, so a film they
 * both acted in and produced appears once, with both roles.
 */
export default defineCachedEventHandler(async (event): Promise<PersonDossier> => {
  const id = requireTmdbId(event)
  const person = await tmdb<PersonDetails>(`/person/${id}`, { append_to_response: 'movie_credits' }, event)

  const entries = new Map<number, FilmographyEntry>()
  const add = (credit: PersonMovieCredit, role: string | undefined) => {
    if (credit.adult) return
    const entry = entries.get(credit.id) ?? { ...toFilmStub(credit), roles: [], vote_count: credit.vote_count }
    if (role && !entry.roles.includes(role)) entry.roles.push(role)
    entries.set(credit.id, entry)
  }
  person.movie_credits.cast.forEach(c => add(c, c.character || undefined))
  person.movie_credits.crew.forEach(c => add(c, c.job))

  const all = [...entries.values()]
  return {
    id: person.id,
    name: person.name,
    biography: person.biography,
    birthday: person.birthday,
    deathday: person.deathday,
    place_of_birth: person.place_of_birth,
    profile_path: person.profile_path,
    known_for_department: person.known_for_department,
    known_for: [...all].sort((a, b) => b.vote_count - a.vote_count).slice(0, KNOWN_FOR),
    filmography: all
      .filter(e => e.year)
      .sort((a, b) => b.year!.localeCompare(a.year!) || b.vote_count - a.vote_count)
  }
}, {
  name: 'tmdb-person',
  maxAge: ONE_DAY,
  getKey: event => String(getRouterParam(event, 'id'))
})
