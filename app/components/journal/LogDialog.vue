<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import type { JournalDraft, JournalEntry, JournalFilm } from '#shared/types/journal'
import type { MovieDetails, SearchResult } from '#shared/types/tmdb'
import { isWatchDate, NOTE_MAX, randomSeat, toJournalFilm, todayLocal } from '#shared/utils/journal'

/**
 * Writing a stub. Three ways in:
 * - `entry` set: edit that stub.
 * - `film` set: log a new viewing of that film (from its dossier).
 * - neither: find the film first, with the same search the ⌘K palette uses,
 *   then fetch its details for the genres and countries the stats need.
 */
const props = defineProps<{
  film?: JournalFilm | null
  entry?: JournalEntry | null
}>()

const emit = defineEmits<{ saved: [entry: JournalEntry, mode: 'new' | 'edit'] }>()

const open = defineModel<boolean>('open', { required: true })

const { add, update, viewingsOf } = useJournal()

const chosen = ref<JournalFilm | null>(null)
const draft = ref<JournalDraft>(blankDraft())
const today = ref(todayLocal())
const submitted = ref(false)

function blankDraft(): JournalDraft {
  return { watchedOn: todayLocal(), seat: randomSeat(), rating: null, note: '' }
}

// Each time the dialog opens, start from whatever it was opened with.
watch(open, (isOpen) => {
  if (!isOpen) return
  today.value = todayLocal()
  submitted.value = false
  searchTerm.value = ''
  fetchError.value = false
  chosen.value = props.entry?.film ?? props.film ?? null
  draft.value = props.entry
    ? { watchedOn: props.entry.watchedOn, seat: props.entry.seat, rating: props.entry.rating, note: props.entry.note }
    : blankDraft()
}, { immediate: true })

const mode = computed(() => (props.entry ? 'edit' : 'new'))
const step = computed(() => (chosen.value ? 'form' : 'search'))

const title = computed(() => {
  if (mode.value === 'edit') return 'Rewrite the stub'
  return chosen.value ? 'Keep the stub' : 'Log a film'
})
const description = computed(() => {
  if (step.value === 'search') return 'Find the film you watched.'
  const film = chosen.value!
  return `${film.title}${film.year ? ` (${film.year})` : ''}`
})

/* Search step ---------------------------------------------------------- */

const searchTerm = ref('')
const query = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchTerm, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    query.value = value.trim()
  }, 250)
})
onBeforeUnmount(() => clearTimeout(timer))

const { data: results, status: searchStatus, error: searchError } = useAsyncData(
  'journal-search',
  () => query.value.length < 2
    ? Promise.resolve<SearchResult[]>([])
    : $fetch<SearchResult[]>('/api/search', { query: { q: query.value } }),
  { server: false, lazy: true, default: () => [], watch: [query] }
)

const fetching = ref<number | null>(null)
const fetchError = ref(false)

async function choose(result: SearchResult) {
  if (fetching.value) return
  fetching.value = result.id
  fetchError.value = false
  try {
    const movie = await $fetch<MovieDetails>(`/api/movie/${result.id}`)
    chosen.value = toJournalFilm(movie)
  } catch {
    fetchError.value = true
  } finally {
    fetching.value = null
  }
}

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [{
  id: 'films',
  label: 'Films',
  ignoreFilter: true,
  items: (results.value ?? []).map(film => ({
    id: film.id,
    label: film.title,
    suffix: film.year ?? undefined,
    loading: fetching.value === film.id,
    avatar: film.poster_path
      ? { src: tmdbImageUrl(film.poster_path, 'w92') ?? undefined, alt: '' }
      : undefined,
    icon: film.poster_path ? undefined : 'i-lucide-film',
    onSelect: (e: Event) => {
      // Keep the palette (and the dialog) open while the film's details load.
      e.preventDefault()
      choose(film)
    }
  }))
}])

const emptyMessage = computed(() => {
  if (query.value.length < 2) return 'Type a title to search the archive.'
  if (searchError.value) return 'The archive is unreachable right now. Try again shortly.'
  if (searchStatus.value === 'pending') return 'Searching the archive…'
  return 'Nothing in the archive by that name.'
})

/* Form step ------------------------------------------------------------ */

const dateValid = computed(() => isWatchDate(draft.value.watchedOn, today.value))
const earlier = computed(() => {
  if (!chosen.value || mode.value === 'edit') return []
  return viewingsOf(chosen.value.id)
})
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))

function reseat() {
  let next = randomSeat()
  while (next === draft.value.seat) next = randomSeat()
  draft.value.seat = next
}

function submit() {
  submitted.value = true
  if (!dateValid.value || !chosen.value) return
  const clean: JournalDraft = { ...draft.value, note: draft.value.note.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) }

  if (props.entry) {
    update(props.entry.id, clean)
    emit('saved', { ...props.entry, ...clean }, 'edit')
  } else {
    const entry = add(chosen.value, clean)
    if (entry) emit('saved', entry, 'new')
  }
  open.value = false
}

function back() {
  chosen.value = null
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="{
      content: 'sm:max-w-xl',
      title: 'font-display text-2xl font-light',
      description: 'eyebrow normal-case tracking-normal text-sm text-(--fl-muted)',
      body: step === 'search' ? 'p-0 sm:p-0' : 'p-5 sm:p-6'
    }"
  >
    <template #body>
      <!-- Step 1: which film? -->
      <div
        v-if="step === 'search'"
        class="h-[min(26rem,60svh)]"
      >
        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="groups"
          :loading="searchStatus === 'pending' || fetching !== null"
          :close="false"
          placeholder="Which film did you watch?"
          class="h-full"
        >
          <template #empty>
            <p class="px-6 py-12 text-center font-display text-(--fl-muted) italic">
              {{ emptyMessage }}
            </p>
          </template>
        </UCommandPalette>
        <p
          v-if="fetchError"
          class="border-t border-(--fl-line) px-5 py-3 text-sm text-(--color-red-300)"
          role="alert"
        >
          That film's details didn't arrive. Try choosing it again.
        </p>
      </div>

      <!-- Step 2: the stub -->
      <form
        v-else
        id="journal-log-form"
        class="space-y-7"
        novalidate
        @submit.prevent="submit"
      >
        <div class="flex items-start gap-4">
          <NuxtImg
            v-if="chosen?.poster_path"
            provider="tmdb"
            :src="chosen.poster_path"
            alt=""
            width="92"
            height="138"
            sizes="64px"
            class="aspect-2/3 w-16 shrink-0 object-cover sepia-[0.2]"
          />
          <div class="min-w-0">
            <p class="font-display text-2xl leading-tight text-balance">
              {{ chosen?.title }}
            </p>
            <p
              v-if="chosen?.year"
              class="mt-1 text-sm text-(--fl-muted) tabular-nums"
            >
              {{ chosen.year }}
            </p>
            <p
              v-if="earlier.length"
              class="mt-2 text-xs text-(--fl-accent)"
            >
              Already in your journal: last watched {{ formatDate(earlier[0]!.watchedOn) }}. This logs a rewatch.
            </p>
            <button
              v-if="mode === 'new' && !film"
              type="button"
              class="mt-2 text-xs tracking-[0.14em] text-(--fl-muted) uppercase underline-offset-4 hover:text-(--fl-text) hover:underline"
              @click="back"
            >
              Choose a different film
            </button>
          </div>
        </div>

        <div class="grid gap-6 sm:grid-cols-[1fr_auto]">
          <UFormField
            label="Date watched"
            name="watchedOn"
            :error="submitted && !dateValid ? 'Choose a date between 1888 and today.' : undefined"
            :ui="{ label: 'eyebrow' }"
          >
            <UInput
              v-model="draft.watchedOn"
              type="date"
              :max="today"
              min="1888-01-01"
              required
              class="w-full"
            />
          </UFormField>

          <div>
            <p
              id="journal-seat-label"
              class="eyebrow"
            >
              Your seat
            </p>
            <div class="mt-2 flex items-center gap-2">
              <output
                class="min-w-16 font-mono text-xl text-(--fl-text) tabular-nums"
                aria-labelledby="journal-seat-label"
                aria-live="polite"
              >
                Row {{ draft.seat.charAt(0) }} · {{ draft.seat.slice(1) }}
              </output>
              <UButton
                icon="i-lucide-shuffle"
                size="sm"
                color="neutral"
                variant="ghost"
                aria-label="Draw another seat"
                @click="reseat"
              />
            </div>
          </div>
        </div>

        <JournalRatingInput v-model="draft.rating" />

        <UFormField
          label="One line to remember it by"
          name="note"
          :hint="`${draft.note.length} / ${NOTE_MAX}`"
          :ui="{ label: 'eyebrow', hint: 'text-xs tabular-nums text-(--fl-dim)' }"
        >
          <UInput
            v-model="draft.note"
            :maxlength="NOTE_MAX"
            placeholder="Rain outside, popcorn burnt, cried at the ending"
            class="w-full"
          />
        </UFormField>
      </form>
    </template>

    <template
      v-if="step === 'form'"
      #footer
    >
      <div class="flex w-full justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="journal-log-form"
          :label="mode === 'edit' ? 'Save the stub' : 'Keep the stub'"
          icon="i-lucide-ticket"
        />
      </div>
    </template>
  </UModal>
</template>
