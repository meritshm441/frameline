import type { H3Event } from 'h3'

type QueryValue = string | number | boolean | undefined | null

const TMDB_BASE = 'https://api.themoviedb.org/3'

/**
 * Server-only TMDB client. The bearer token never leaves the server:
 * every client request goes through a route in `server/api/*`.
 */
export async function tmdb<T>(
  path: string,
  query: Record<string, QueryValue> = {},
  event?: H3Event
): Promise<T> {
  const { tmdbToken } = useRuntimeConfig(event)

  if (!tmdbToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TMDB token missing. Set NUXT_TMDB_TOKEN in .env.'
    })
  }

  // Drop empty values so optional filters don't become `?foo=undefined`.
  const cleanQuery = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )

  try {
    // Nitro types $fetch for internal routes; for an external URL we assert the TMDB shape.
    return await $fetch(path, {
      baseURL: TMDB_BASE,
      query: { language: 'en-US', ...cleanQuery },
      headers: {
        Authorization: `Bearer ${tmdbToken}`,
        Accept: 'application/json'
      }
    }) as T
  } catch (error: unknown) {
    const status = (error as { statusCode?: number }).statusCode ?? 502
    throw createError({
      statusCode: status === 404 ? 404 : 502,
      statusMessage: status === 404 ? 'Not found on TMDB' : 'TMDB request failed'
    })
  }
}

/** Parse a route param as a positive integer TMDB id, or throw 400. */
export function requireTmdbId(event: H3Event, name = 'id'): number {
  const raw = getRouterParam(event, name)
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${name}` })
  }
  return id
}

export const ONE_HOUR = 60 * 60
export const ONE_DAY = ONE_HOUR * 24
