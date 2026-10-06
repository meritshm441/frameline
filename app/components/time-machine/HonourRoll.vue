<script setup lang="ts">
import type { TimeMachineFilm } from '#shared/types/time-machine'

/**
 * The year's highest-rated films, as a ranked roll set in the decade's
 * lettering. Reads down the first column, then the second.
 */
defineProps<{
  films: TimeMachineFilm[]
}>()

const count = new Intl.NumberFormat('en-GB')
</script>

<template>
  <ol class="gap-x-16 lg:columns-2">
    <li
      v-for="(film, i) in films"
      :key="film.id"
      class="group relative flex break-inside-avoid items-center gap-5 border-b border-(--fl-line) py-5"
    >
      <span
        class="w-14 shrink-0 text-right text-4xl leading-none text-(--fl-dim) tabular-nums era-type transition-colors duration-500 group-hover:text-(--fl-accent) sm:w-16 sm:text-5xl"
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
          class="size-full object-cover era-stock"
        />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="font-display text-xl leading-snug">
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
          Rated {{ film.vote_average.toFixed(1) }} &middot; {{ count.format(film.vote_count) }} votes
        </p>
      </div>
    </li>
  </ol>
</template>
