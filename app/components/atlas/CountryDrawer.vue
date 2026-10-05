<script setup lang="ts">
import type { AtlasFilm, AtlasQuery, AtlasResponse, PassportStamp } from '#shared/types/atlas'
import { countryInSentence, countryName, FIRST_DECADE, historicCountry, isFullSpan, LAST_DECADE, predecessorOf, spanLabel } from '#shared/utils/atlas'

/**
 * A country's page in the travel journal: its most acclaimed films, the
 * decade slider, and the passport stamp. Non-modal, so the map behind stays
 * live and another country can be chosen without closing this one first.
 * Escape and the close button still close it.
 */
const props = defineProps<{
  query: AtlasQuery
  response: AtlasResponse | null
  pending: boolean
  failed: boolean
  stamp: PassportStamp | null
  /** The stamp's position in the passport, 1-based. */
  entry: number | null
}>()

const emit = defineEmits<{
  close: []
  select: [code: string]
  span: [from: number, to: number]
  retry: []
}>()

const code = computed(() => props.query.country)
const name = computed(() => (code.value ? countryName(code.value) : ''))
const inSentence = computed(() => (code.value ? countryInSentence(code.value) : ''))
const historic = computed(() => (code.value ? historicCountry(code.value) : null))
const predecessor = computed(() => (code.value ? predecessorOf(code.value) : null))

/* --- Decade span: the slider moves freely, the URL follows on release ---- */

const span = ref<[number, number]>([props.query.from, props.query.to])
watch(() => [props.query.from, props.query.to] as const, ([from, to]) => {
  span.value = [from, to]
})

/* --- Further reels ------------------------------------------------------- */

const more = shallowRef<AtlasFilm[]>([])
const lastPage = ref(1)
const loadingMore = ref(false)
const moreFailed = ref(false)

watch(() => props.response, (response) => {
  more.value = []
  lastPage.value = response?.page ?? 1
  moreFailed.value = false
}, { immediate: true })

const films = computed(() => [...(props.response?.films ?? []), ...more.value])
const hasMore = computed(() => Boolean(props.response && lastPage.value < props.response.total_pages))

async function loadMore() {
  const response = props.response
  if (!response || loadingMore.value) return
  loadingMore.value = true
  moreFailed.value = false
  try {
    const next = await $fetch<AtlasResponse>(`/api/atlas/${response.country}`, {
      query: { from: props.query.from, to: props.query.to, page: lastPage.value + 1 }
    })
    // The traveller may have moved on while this was loading.
    if (props.response !== response) return
    // A rating sort can repeat a film across page boundaries.
    const seen = new Set(films.value.map(f => f.id))
    more.value = [...more.value, ...next.films.filter(f => !seen.has(f.id))]
    lastPage.value = next.page
  } catch {
    moreFailed.value = true
  } finally {
    loadingMore.value = false
  }
}

/* --- Wording ------------------------------------------------------------- */

const stampDate = computed(() => props.stamp
  ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(props.stamp.at))
  : null)

const total = computed(() => props.response?.total_results ?? 0)

function factsOf(film: AtlasFilm) {
  return [
    film.year,
    film.vote_average ? `Rated ${film.vote_average.toFixed(1)}` : null,
    `${new Intl.NumberFormat('en-GB').format(film.vote_count)} votes`
  ].filter(Boolean).join(' · ')
}
</script>

<template>
  <USlideover
    :open="Boolean(code)"
    side="right"
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :content="{ onEscapeKeyDown: () => emit('close') }"
    :ui="{
      content: 'sm:max-w-md bg-(--fl-surface) ring-(--fl-line) divide-(--fl-line) shadow-2xl shadow-black/60',
      header: 'items-start px-6 pt-7 pb-6 sm:px-8',
      wrapper: 'min-w-0 pr-10',
      title: 'font-display text-4xl leading-[1.05] font-light text-balance text-(--fl-text) sm:text-5xl',
      description: 'mt-3 text-sm leading-relaxed text-(--fl-muted)',
      body: 'p-0 sm:p-0'
    }"
    @update:open="open => !open && emit('close')"
  >
    <template #title>
      <span class="mb-4 block eyebrow tabular-nums">
        <template v-if="stamp && entry">
          Passport entry {{ String(entry).padStart(2, '0') }} &middot; stamped {{ stampDate }}
        </template>
        <template v-else>
          The Atlas
        </template>
      </span>
      {{ name }}
    </template>

    <template #description>
      The most acclaimed films made in {{ inSentence }}, in {{ spanLabel(query) }}.
      <span
        v-if="response && total"
        class="text-(--fl-dim) tabular-nums"
      >{{ new Intl.NumberFormat('en-GB').format(total) }} on record.</span>
    </template>

    <template #body>
      <div class="border-b border-(--fl-line) px-6 py-6 sm:px-8">
        <AtlasDecadeRange
          v-model="span"
          @commit="([from, to]) => emit('span', from, to)"
        />
      </div>

      <!-- Historic states and their successors point at each other. -->
      <div
        v-if="historic"
        class="border-b border-(--fl-line) px-6 py-5 text-sm text-(--fl-muted) sm:px-8"
      >
        <p>
          <span class="font-display text-(--fl-text) italic">{{ historic.years }}.</span>
          Its studios and archives passed to
        </p>
        <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <li
            v-for="successor in historic.successors"
            :key="successor"
          >
            <button
              type="button"
              class="underline decoration-(--fl-line) underline-offset-4 transition-colors duration-500 hover:text-(--fl-accent) hover:decoration-(--fl-accent)"
              @click="emit('select', successor)"
            >
              {{ countryName(successor) }}
            </button>
          </li>
        </ul>
      </div>
      <div
        v-else-if="predecessor"
        class="border-b border-(--fl-line) px-6 py-5 text-sm text-(--fl-muted) sm:px-8"
      >
        <p>
          From {{ predecessor.years }}, much of the cinema made here is filed under
          <button
            type="button"
            class="font-display text-(--fl-text) italic underline decoration-(--fl-accent)/40 underline-offset-4 transition-colors duration-500 hover:text-(--fl-accent)"
            @click="emit('select', predecessor.code)"
          >
            {{ predecessor.name }}
          </button>.
        </p>
      </div>

      <!-- Loading -->
      <ul
        v-if="pending && !response"
        class="divide-y divide-(--fl-line)"
        aria-busy="true"
        aria-label="Fetching films"
      >
        <li
          v-for="i in 6"
          :key="i"
          class="flex gap-4 px-6 py-4 sm:px-8"
        >
          <USkeleton class="h-18 w-12 shrink-0" />
          <div class="flex-1 space-y-2 pt-1">
            <USkeleton class="h-5 w-3/4" />
            <USkeleton class="h-3 w-1/2" />
          </div>
        </li>
      </ul>

      <div
        v-else-if="failed"
        class="px-6 py-14 text-center sm:px-8"
      >
        <p class="font-display text-2xl font-light">
          The border post is closed. We couldn't reach the archive.
        </p>
        <UButton
          class="mt-6"
          label="Try again"
          color="neutral"
          variant="outline"
          @click="emit('retry')"
        />
      </div>

      <div
        v-else-if="!films.length"
        class="px-6 py-14 text-center sm:px-8"
      >
        <p class="font-display text-2xl font-light text-balance">
          Nothing from {{ inSentence }} in {{ spanLabel(query) }} has enough votes on record yet.
        </p>
        <p class="mt-3 text-sm text-(--fl-muted)">
          Only films with 200 or more votes on TMDB are listed here.
        </p>
        <UButton
          v-if="!isFullSpan(query)"
          class="mt-6"
          label="Search every decade"
          color="neutral"
          variant="outline"
          @click="emit('span', FIRST_DECADE, LAST_DECADE)"
        />
      </div>

      <template v-else>
        <ol
          class="divide-y divide-(--fl-line) transition-opacity duration-500"
          :class="pending && 'opacity-40'"
          :aria-busy="pending"
        >
          <li
            v-for="(film, i) in films"
            :key="film.id"
            class="group relative flex gap-4 px-6 py-4 transition-colors duration-500 hover:bg-(--fl-raised) sm:px-8"
          >
            <span
              class="w-6 shrink-0 pt-1 text-right text-xs text-(--fl-dim) tabular-nums"
              aria-hidden="true"
            >{{ i + 1 }}</span>
            <div class="h-18 w-12 shrink-0 overflow-hidden bg-(--fl-raised)">
              <NuxtImg
                v-if="film.poster_path"
                provider="tmdb"
                :src="film.poster_path"
                alt=""
                width="48"
                height="72"
                densities="x1 x2"
                loading="lazy"
                class="size-full object-cover sepia-[0.25] saturate-[0.85] transition-[filter] duration-700 group-hover:sepia-0 group-hover:saturate-100"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-display text-lg leading-snug">
                <NuxtLink
                  :to="`/movie/${film.id}`"
                  class="transition-colors duration-500 after:absolute after:inset-0 after:content-[''] group-hover:text-(--fl-accent)"
                >
                  {{ film.title }}
                </NuxtLink>
              </h3>
              <p
                v-if="film.original_title"
                class="truncate font-display text-sm text-(--fl-muted) italic"
                :title="film.original_title"
              >
                {{ film.original_title }}
              </p>
              <p class="mt-1 text-xs text-(--fl-dim) tabular-nums">
                {{ factsOf(film) }}
              </p>
            </div>
          </li>
        </ol>

        <div
          v-if="hasMore || moreFailed"
          class="border-t border-(--fl-line) px-6 py-6 text-center sm:px-8"
        >
          <p
            v-if="moreFailed"
            class="mb-4 text-sm text-(--fl-muted)"
          >
            The next reel didn't arrive.
          </p>
          <UButton
            :label="moreFailed ? 'Try again' : 'Next reel'"
            color="neutral"
            variant="outline"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
      </template>
    </template>
  </USlideover>
</template>
