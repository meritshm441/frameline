<script setup lang="ts">
import type { MovieDetails } from '#shared/types/tmdb'

/**
 * The "case file": a typed index card of the film's particulars, with the
 * poster clipped on as Exhibit A. Rows with no data are left out rather than
 * shown as "Unknown", except budget/box office, which TMDB often lacks.
 */
const props = defineProps<{ movie: MovieDetails }>()

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1
})
const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const caseNumber = computed(() => `FL-${String(props.movie.id).padStart(6, '0')}`)

function names(list: { name: string }[], max = 3) {
  const unique = [...new Set(list.map(item => item.name))]
  return unique.length ? unique.slice(0, max).join(', ') + (unique.length > max ? ' et al.' : '') : null
}

const rows = computed(() => {
  const m = props.movie
  const crew = m.credits.crew
  const hours = m.runtime ? Math.floor(m.runtime / 60) : 0
  const minutes = m.runtime ? m.runtime % 60 : 0

  return [
    { label: 'Released', value: m.release_date ? date.format(new Date(m.release_date)) : null },
    {
      label: 'Running time',
      value: m.runtime ? `${hours ? `${hours} h ` : ''}${minutes} min (${m.runtime} min)` : null
    },
    { label: 'Directed by', value: names(crew.filter(c => c.job === 'Director')) },
    { label: 'Written by', value: names(crew.filter(c => c.job === 'Screenplay' || c.job === 'Writer')) },
    { label: 'Countries', value: names(m.production_countries, 4) },
    { label: 'Languages', value: m.spoken_languages.map(l => l.english_name || l.name).slice(0, 4).join(', ') || null },
    { label: 'Original title', value: m.original_title !== m.title ? m.original_title : null },
    { label: 'Budget', value: m.budget > 0 ? money.format(m.budget) : null },
    { label: 'Box office', value: m.revenue > 0 ? money.format(m.revenue) : null },
    { label: 'Status', value: m.status && m.status !== 'Released' ? m.status : null }
  ].filter((row): row is { label: string, value: string } => Boolean(row.value))
})
</script>

<template>
  <aside
    aria-labelledby="case-file-heading"
    class="border border-(--fl-line) bg-(--fl-surface) p-1.5"
  >
    <div class="border border-(--fl-line) px-5 pt-4 pb-6 sm:px-6">
      <header class="flex items-baseline justify-between gap-4 border-b border-(--fl-line) pb-3">
        <h2
          id="case-file-heading"
          class="eyebrow"
        >
          Case file
        </h2>
        <p class="font-mono text-xs tracking-wider text-(--fl-accent) tabular-nums">
          {{ caseNumber }}
        </p>
      </header>

      <figure
        v-if="movie.poster_path"
        class="mx-auto mt-6 w-40 -rotate-2 bg-(--fl-raised) p-1.5 shadow-xl shadow-black/50 sm:w-44"
      >
        <NuxtImg
          provider="tmdb"
          :src="movie.poster_path"
          :alt="`Poster for ${movie.title}`"
          width="185"
          height="278"
          sizes="176px"
          class="aspect-2/3 w-full object-cover sepia-[0.2]"
        />
        <figcaption class="mt-1.5 text-center eyebrow text-[0.6rem]">
          Exhibit A
        </figcaption>
      </figure>

      <dl class="mt-6 divide-y divide-dashed divide-(--fl-line)">
        <div
          v-for="row in rows"
          :key="row.label"
          class="grid grid-cols-[7.5rem_1fr] gap-4 py-2.5"
        >
          <dt class="pt-0.5 eyebrow">
            {{ row.label }}
          </dt>
          <dd class="text-sm leading-snug text-(--fl-text) tabular-nums">
            {{ row.value }}
          </dd>
        </div>
      </dl>

      <p
        v-if="movie.vote_count"
        class="mt-5 border-t border-(--fl-line) pt-4 text-xs text-(--fl-muted) tabular-nums"
      >
        Rated <span class="font-display text-base text-(--fl-text)">{{ movie.vote_average.toFixed(1) }}</span>
        by {{ movie.vote_count.toLocaleString('en-US') }} TMDB members
      </p>
    </div>
  </aside>
</template>
