<script setup lang="ts">
import type { MoodQuadrant } from '#shared/types/compass'
import type { JournalStats } from '#shared/types/journal'
import { QUADRANT_LABELS } from '#shared/utils/compass'

/**
 * The journal's front page in four figures: films logged, countries visited
 * (logged films and Atlas stamps together), decades explored, and the corner
 * of the Compass the journal leans to.
 */
const props = defineProps<{ stats: JournalStats }>()

const FIRST_DECADE = 1920
const COUNTRIES_SHOWN = 8

/** Every decade from the 1920s (or earlier, if something older is logged) to now. */
const decades = computed(() => {
  const counts = new Map(props.stats.decades.map(d => [d.decade, d.count]))
  const first = Math.min(FIRST_DECADE, props.stats.decades[0]?.decade ?? FIRST_DECADE)
  const last = Math.floor(new Date().getFullYear() / 10) * 10
  const max = Math.max(1, ...counts.values())
  return Array.from({ length: (last - first) / 10 + 1 }, (_, i) => {
    const decade = first + i * 10
    const count = counts.get(decade) ?? 0
    return { decade, count, height: count ? 20 + 80 * (count / max) : 0 }
  })
})

const exploredList = computed(() => props.stats.decades.map(d => `the ${d.decade}s`).join(', '))

/** A spot inside each corner of the dial, to send the Compass there. */
const QUADRANT_POINTS: Record<MoodQuadrant, { x: number, y: number }> = {
  'light-calm': { x: -0.5, y: -0.5 },
  'light-intense': { x: -0.5, y: 0.5 },
  'heavy-calm': { x: 0.5, y: -0.5 },
  'heavy-intense': { x: 0.5, y: 0.5 },
  'centre': { x: 0, y: 0 }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
</script>

<template>
  <dl class="grid border-y border-(--fl-line) sm:grid-cols-2 xl:grid-cols-4">
    <!-- Films -->
    <div class="border-(--fl-line) py-8 sm:border-r sm:pr-8 xl:pr-8">
      <dt class="eyebrow">
        Films logged
      </dt>
      <dd class="mt-4">
        <span class="block font-display text-7xl leading-none font-light tabular-nums">{{ stats.films }}</span>
        <span class="mt-4 block text-sm text-(--fl-muted)">
          <template v-if="stats.films > stats.uniqueFilms">
            {{ plural(stats.uniqueFilms, 'film', 'different films') }}, {{ plural(stats.films - stats.uniqueFilms, 'rewatch', 'rewatches') }}.
          </template>
          <template v-else-if="stats.films">
            Every one a first viewing.
          </template>
          <template v-else>
            Not a single stub yet.
          </template>
          <template v-if="stats.averageRating !== null">
            Averaging <span class="text-(--fl-text) tabular-nums">{{ stats.averageRating.toFixed(1) }}</span> of 5.
          </template>
        </span>
      </dd>
    </div>

    <!-- Countries -->
    <div class="border-t border-(--fl-line) py-8 sm:border-t-0 sm:pl-8 xl:border-r xl:pr-8">
      <dt class="eyebrow">
        Countries visited
      </dt>
      <dd class="mt-4">
        <span class="block font-display text-7xl leading-none font-light tabular-nums">{{ stats.countries.all.length }}</span>
        <span class="mt-4 block text-sm text-(--fl-muted)">
          {{ plural(stats.countries.fromFilms, 'country', 'countries') }} through the films you logged,
          {{ stats.countries.fromAtlas }} on the <NuxtLink
            to="/atlas#travel-log"
            class="text-(--fl-text) underline decoration-(--fl-line) underline-offset-4 hover:decoration-(--fl-accent)"
          >Atlas</NuxtLink>.
        </span>
        <span
          v-if="stats.countries.all.length"
          class="mt-3 block font-display text-sm text-(--fl-text)/80 italic"
        >
          {{ stats.countries.all.slice(0, COUNTRIES_SHOWN).join(', ') }}<template v-if="stats.countries.all.length > COUNTRIES_SHOWN">
            and {{ stats.countries.all.length - COUNTRIES_SHOWN }} more
          </template>
        </span>
      </dd>
    </div>

    <!-- Decades -->
    <div class="border-t border-(--fl-line) py-8 sm:border-r sm:pr-8 xl:border-t-0 xl:pl-8">
      <dt class="eyebrow">
        Decades explored
      </dt>
      <dd class="mt-4">
        <span class="block font-display text-7xl leading-none font-light tabular-nums">{{ stats.decades.length }}</span>
        <span
          v-if="stats.decades.length"
          class="sr-only"
        >: {{ exploredList }}</span>
        <span
          class="mt-5 flex h-16 items-end gap-1"
          aria-hidden="true"
        >
          <span
            v-for="d in decades"
            :key="d.decade"
            class="flex h-full flex-1 flex-col justify-end"
            :title="`${d.decade}s: ${plural(d.count, 'film', 'films')}`"
          >
            <span
              class="block w-full transition-[height] duration-700"
              :class="d.count ? 'bg-(--fl-accent)' : 'bg-(--fl-line)'"
              :style="{ height: d.count ? `${d.height}%` : '2px' }"
            />
          </span>
        </span>
        <span
          class="mt-2 flex justify-between text-[0.6rem] tracking-[0.14em] text-(--fl-dim) tabular-nums"
          aria-hidden="true"
        >
          <span>{{ decades[0]?.decade }}s</span>
          <span>{{ decades.at(-1)?.decade }}s</span>
        </span>
      </dd>
    </div>

    <!-- Mood -->
    <div class="border-t border-(--fl-line) py-8 sm:pl-8 xl:border-t-0">
      <dt class="eyebrow">
        Favourite mood
      </dt>
      <dd class="mt-4">
        <span class="block font-display text-3xl leading-tight font-light text-balance">
          {{ stats.favouriteMood ? QUADRANT_LABELS[stats.favouriteMood] : 'Still undecided' }}
        </span>
        <JournalMoodMap
          :moods="stats.moods"
          :favourite="stats.favouriteMood"
          class="mt-8 mb-6 px-12"
        />
        <NuxtLink
          v-if="stats.favouriteMood"
          :to="{ path: '/', query: QUADRANT_POINTS[stats.favouriteMood] }"
          class="mt-2 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-(--fl-muted) uppercase transition-colors duration-500 hover:text-(--fl-accent)"
        >
          Set the Compass here
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5"
          />
        </NuxtLink>
      </dd>
    </div>
  </dl>
</template>
