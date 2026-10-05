<script setup lang="ts">
import type { CastMember } from '#shared/types/tmdb'

/**
 * "Persons of interest": the billed cast as a strip of archive portraits.
 * Each card links to that person's dossier. The strip scrolls sideways with
 * snap points; every card is a link, so keyboard focus scrolls it too.
 */
const props = defineProps<{ cast: CastMember[] }>()

const MAX = 16
const shown = computed(() => props.cast.slice(0, MAX))

function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')
}
</script>

<template>
  <ul class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12">
    <li
      v-for="(person, i) in shown"
      :key="person.credit_id"
      class="w-36 shrink-0 snap-start sm:w-40"
    >
      <NuxtLink
        :to="`/person/${person.id}`"
        class="group block"
      >
        <div class="relative overflow-hidden border border-(--fl-line) bg-(--fl-raised) p-1">
          <NuxtImg
            v-if="person.profile_path"
            provider="tmdb"
            :src="person.profile_path"
            :alt="`Portrait of ${person.name}`"
            width="185"
            height="278"
            sizes="160px"
            loading="lazy"
            class="aspect-2/3 w-full object-cover grayscale-[0.85] transition-[filter] duration-1000 ease-(--ease-projector) group-hover:grayscale-0 group-focus-visible:grayscale-0"
          />
          <div
            v-else
            class="grid aspect-2/3 w-full place-items-center font-display text-4xl text-(--fl-dim) italic"
            aria-hidden="true"
          >
            {{ initials(person.name) }}
          </div>
          <span
            class="absolute top-2 left-2 bg-(--fl-bg)/80 px-1.5 py-0.5 font-mono text-[0.6rem] text-(--fl-muted) tabular-nums"
            aria-hidden="true"
          >
            {{ String(i + 1).padStart(2, '0') }}
          </span>
        </div>
        <p class="mt-3 font-display text-lg leading-tight transition-colors duration-500 group-hover:text-(--fl-accent)">
          {{ person.name }}
        </p>
        <p
          v-if="person.character"
          class="mt-1 line-clamp-2 text-xs text-(--fl-muted)"
        >
          <span class="sr-only">as </span>{{ person.character }}
        </p>
      </NuxtLink>
    </li>
  </ul>
</template>
