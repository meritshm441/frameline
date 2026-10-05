import type { TmdbImageSize } from '#shared/types/tmdb'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

/** Plain URL builder for non-reactive contexts (loops, canvas, CSS backgrounds). */
export function tmdbImageUrl(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null
}

/**
 * Reactive TMDB image URL. Prefer `<NuxtImg provider="tmdb">` in templates;
 * use this when you need a raw URL (background-image, canvas colour sampling,
 * OG tags). Returns `null` when the film has no image so callers can fall back.
 */
export function useTmdbImage(
  path: MaybeRefOrGetter<string | null | undefined>,
  size: MaybeRefOrGetter<TmdbImageSize> = 'w500'
) {
  return computed(() => tmdbImageUrl(toValue(path), toValue(size)))
}
