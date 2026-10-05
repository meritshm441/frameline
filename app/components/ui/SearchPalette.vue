<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import type { SearchResult } from '#shared/types/tmdb'

const { open, hide } = useSearchPalette()

defineShortcuts({
  // `meta` maps to ⌘ on macOS and Ctrl elsewhere.
  meta_k: {
    usingInput: true,
    handler: () => {
      open.value = !open.value
    }
  }
})

const searchTerm = ref('')
const query = ref('')

// Debounce keystrokes so we hit /api/search at most every 250ms.
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchTerm, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    query.value = value.trim()
  }, 250)
})
onBeforeUnmount(() => clearTimeout(timer))

const { data: results, status, error } = useAsyncData(
  'search-palette',
  () => query.value.length < 2
    ? Promise.resolve<SearchResult[]>([])
    : $fetch<SearchResult[]>('/api/search', { query: { q: query.value } }),
  { server: false, lazy: true, default: () => [], watch: [query] }
)

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
  const films: CommandPaletteItem[] = (results.value ?? []).map(film => ({
    id: film.id,
    label: film.title,
    suffix: film.year ?? undefined,
    to: `/movie/${film.id}`,
    avatar: film.poster_path
      ? { src: tmdbImageUrl(film.poster_path, 'w92') ?? undefined, alt: '' }
      : undefined,
    icon: film.poster_path ? undefined : 'i-lucide-film',
    onSelect: hide
  }))

  const wander: CommandPaletteItem[] = NAV_SECTIONS.map(section => ({
    id: section.to,
    label: section.label,
    suffix: section.hint,
    icon: section.icon,
    to: section.to,
    onSelect: hide
  }))

  return [
    ...(query.value.length >= 2
      ? [{ id: 'films', label: 'Films', items: films, ignoreFilter: true }]
      : []),
    { id: 'wander', label: 'Wander', items: wander }
  ]
})

const emptyMessage = computed(() => {
  if (error.value) return 'The archive is unreachable right now. Try again shortly.'
  if (status.value === 'pending') return 'Searching the archive…'
  return 'Nothing in the archive by that name.'
})

// Clear the input each time the palette closes.
watch(open, (isOpen) => {
  if (!isOpen) searchTerm.value = ''
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Search films"
    description="Search the archive by title, or jump to a section."
    :ui="{ content: 'sm:max-w-2xl sm:h-[30rem]' }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :loading="status === 'pending'"
        placeholder="Search the archive…"
        :close="{ color: 'neutral', variant: 'ghost' }"
        class="h-full"
        @update:open="open = $event"
      >
        <template #empty>
          <p class="py-12 text-center font-display text-(--fl-muted) italic">
            {{ emptyMessage }}
          </p>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
