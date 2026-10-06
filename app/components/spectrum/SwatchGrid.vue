<script setup lang="ts">
import type { SpectrumFilm, Swatch } from '#shared/types/spectrum'
import { pointName, swatchColour } from '#shared/utils/spectrum'

/**
 * The posters nearest the chosen colour, as paint-sample cards: the poster,
 * a chip of the colour Frameline read from it, then the film. Nearest first.
 * When colours couldn't be read at all, the swatch is null and the chip is
 * left blank.
 */
defineProps<{
  items: readonly { film: SpectrumFilm, swatch: Swatch | null }[]
}>()

const chipName = (swatch: Swatch) => pointName({ hue: swatch.h, vivid: swatch.vivid })
</script>

<template>
  <ol class="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
    <li
      v-for="({ film, swatch }, i) in items"
      :key="film.id"
      class="group relative"
    >
      <div class="overflow-hidden bg-(--fl-raised)">
        <NuxtImg
          provider="tmdb"
          :src="film.poster_path"
          :alt="`Poster for ${film.title}`"
          width="342"
          height="513"
          sizes="xs:50vw sm:33vw lg:16vw"
          loading="lazy"
          class="aspect-2/3 w-full object-cover transition-transform duration-1000 ease-(--ease-projector) group-hover:scale-[1.03]"
        />
      </div>
      <div
        class="h-10 w-full"
        :class="!swatch && 'border border-t-0 border-dashed border-(--fl-line)'"
        :style="swatch ? { background: swatchColour(swatch) } : undefined"
        aria-hidden="true"
      />
      <p class="mt-3 flex items-baseline justify-between gap-3 text-[0.65rem] tracking-[0.18em] uppercase tabular-nums">
        <span
          class="text-(--fl-dim)"
          aria-hidden="true"
        >No. {{ String(i + 1).padStart(2, '0') }}</span>
        <span
          v-if="swatch"
          class="text-(--fl-muted)"
        >{{ chipName(swatch) }}</span>
      </p>
      <h3 class="mt-2 font-display text-lg leading-snug text-balance">
        <NuxtLink
          :to="`/movie/${film.id}`"
          class="transition-colors duration-500 after:absolute after:inset-0 after:content-[''] group-hover:text-(--fl-accent)"
        >
          {{ film.title }}
        </NuxtLink>
      </h3>
      <p
        v-if="film.year"
        class="mt-1 text-xs text-(--fl-dim) tabular-nums"
      >
        {{ film.year }}
      </p>
    </li>
  </ol>
</template>
