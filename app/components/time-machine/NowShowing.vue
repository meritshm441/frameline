<script setup lang="ts">
import type { TimeMachineFilm } from '#shared/types/time-machine'

/**
 * "What was playing": a year's bill set like a newspaper's cinema listings.
 * The most-watched film tops the bill with its poster and synopsis; the rest
 * are listed beside it with the day they opened. Posters are printed in the
 * decade's film stock (`era-stock`).
 */
const props = defineProps<{
  films: TimeMachineFilm[]
}>()

const lead = computed(() => props.films[0] ?? null)
const rest = computed(() => props.films.slice(1))

// Release dates are plain ISO days; format them in UTC so the server and browser agree.
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function opened(film: TimeMachineFilm) {
  return film.release_date ? `Opened ${dayMonth.format(new Date(film.release_date))}` : 'Opening date unknown'
}
</script>

<template>
  <div
    v-if="lead"
    class="grid gap-12 md:grid-cols-12 lg:gap-16"
  >
    <article class="group relative md:col-span-5">
      <p class="eyebrow">
        Top of the bill
      </p>
      <div class="mt-5 overflow-hidden bg-(--fl-raised)">
        <NuxtImg
          v-if="lead.poster_path"
          provider="tmdb"
          :src="lead.poster_path"
          :alt="`Poster for ${lead.title}`"
          width="500"
          height="750"
          sizes="xs:100vw md:42vw lg:500px"
          class="aspect-2/3 w-full object-cover era-stock transition-transform duration-1000 ease-(--ease-projector) group-hover:scale-[1.02]"
        />
        <div
          v-else
          class="grid aspect-2/3 w-full place-items-center p-6 text-center font-display text-3xl text-(--fl-dim) italic"
          aria-hidden="true"
        >
          {{ lead.title }}
        </div>
      </div>
      <h3 class="mt-6 text-4xl leading-[1.05] text-balance era-type sm:text-5xl">
        <NuxtLink
          :to="`/movie/${lead.id}`"
          class="transition-colors duration-500 after:absolute after:inset-0 after:content-[''] group-hover:text-(--fl-accent)"
        >
          {{ lead.title }}
        </NuxtLink>
      </h3>
      <p
        v-if="lead.original_title"
        class="mt-2 font-display text-(--fl-muted) italic"
      >
        {{ lead.original_title }}
      </p>
      <p class="mt-4 eyebrow tabular-nums">
        {{ opened(lead) }}
      </p>
      <p
        v-if="lead.overview"
        class="mt-4 line-clamp-5 max-w-prose leading-relaxed text-(--fl-muted)"
      >
        {{ lead.overview }}
      </p>
    </article>

    <ol
      v-if="rest.length"
      class="grid grid-cols-2 content-start gap-x-6 gap-y-10 sm:grid-cols-3 md:col-span-7 md:pt-10 lg:gap-x-8"
    >
      <li
        v-for="(film, i) in rest"
        :key="film.id"
        class="group relative"
      >
        <div class="overflow-hidden bg-(--fl-raised)">
          <NuxtImg
            v-if="film.poster_path"
            provider="tmdb"
            :src="film.poster_path"
            alt=""
            width="185"
            height="278"
            sizes="xs:50vw sm:33vw md:20vw lg:220px"
            loading="lazy"
            class="aspect-2/3 w-full object-cover era-stock transition-transform duration-1000 ease-(--ease-projector) group-hover:scale-[1.03]"
          />
          <div
            v-else
            class="grid aspect-2/3 w-full place-items-center p-4 text-center font-display text-lg text-(--fl-dim) italic"
            aria-hidden="true"
          >
            {{ film.title }}
          </div>
        </div>
        <p
          class="mt-3 text-[0.65rem] text-(--fl-dim) tabular-nums"
          aria-hidden="true"
        >
          {{ String(i + 2).padStart(2, '0') }}
        </p>
        <h3 class="mt-1 font-display text-lg leading-snug text-balance">
          <NuxtLink
            :to="`/movie/${film.id}`"
            class="transition-colors duration-500 after:absolute after:inset-0 after:content-[''] group-hover:text-(--fl-accent)"
          >
            {{ film.title }}
          </NuxtLink>
        </h3>
        <p class="mt-1 text-xs text-(--fl-dim) tabular-nums">
          {{ opened(film) }}
        </p>
      </li>
    </ol>
  </div>
</template>
