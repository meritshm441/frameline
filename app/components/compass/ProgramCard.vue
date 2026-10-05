<script setup lang="ts">
import type { CompassPick } from '#shared/types/compass'

/**
 * One film on tonight's programme, set like a page from a repertory cinema
 * bill: double rule, numbered slot, credits in small caps, a perforated
 * "admit one" foot. The whole card is one link to the film's dossier.
 */
const props = defineProps<{
  pick: CompassPick
  /** 0, 1 or 2: the slot on tonight's bill. */
  index: number
}>()

const SLOTS = ['Early show', 'Main feature', 'Late show']

const slot = computed(() => SLOTS[props.index] ?? 'Encore')
const number = computed(() => String(props.index + 1).padStart(2, '0'))
const facts = computed(() => [
  props.pick.year,
  props.pick.runtime ? `${props.pick.runtime} min` : null,
  props.pick.vote_average ? `Rated ${props.pick.vote_average.toFixed(1)}` : null
].filter(Boolean).join(' · '))
</script>

<template>
  <article class="group relative border border-(--fl-line) bg-(--fl-surface) p-1.5 transition-colors duration-700 hover:border-(--fl-accent)/50">
    <div class="flex h-full flex-col border border-(--fl-line) px-5 pt-4 pb-5">
      <header class="flex items-baseline justify-between gap-4 border-b border-(--fl-line) pb-3">
        <p class="eyebrow tabular-nums">
          No. {{ number }}
        </p>
        <p class="font-display text-sm text-(--fl-accent) italic">
          {{ slot }}
        </p>
      </header>

      <div class="relative mt-5 overflow-hidden bg-(--fl-raised)">
        <NuxtImg
          v-if="pick.poster_path"
          provider="tmdb"
          :src="pick.poster_path"
          :alt="`Poster for ${pick.title}`"
          width="342"
          height="513"
          sizes="xs:100vw sm:50vw md:33vw"
          loading="lazy"
          class="aspect-2/3 w-full object-cover sepia-[0.25] saturate-[0.85] transition-[filter,transform] duration-1000 ease-(--ease-projector) group-hover:scale-[1.02] group-hover:sepia-0 group-hover:saturate-100"
        />
        <div
          v-else
          class="grid aspect-2/3 w-full place-items-center p-6 text-center font-display text-2xl text-(--fl-dim) italic"
          aria-hidden="true"
        >
          {{ pick.title }}
        </div>
      </div>

      <h3 class="mt-6 font-display text-3xl leading-[1.05] font-light text-balance">
        <NuxtLink
          :to="`/movie/${pick.id}`"
          class="after:absolute after:inset-0 after:content-['']"
        >
          {{ pick.title }}
        </NuxtLink>
      </h3>

      <p
        v-if="pick.director"
        class="mt-2 text-sm text-(--fl-muted)"
      >
        <span class="font-display italic">directed by</span> {{ pick.director }}
      </p>

      <p class="mt-4 eyebrow tabular-nums">
        {{ facts }}
      </p>
      <p
        v-if="pick.genres.length"
        class="mt-1 text-xs tracking-wide text-(--fl-dim)"
      >
        {{ pick.genres.join(' / ') }}
      </p>

      <p
        v-if="pick.tagline"
        class="mt-5 font-display text-lg leading-snug text-(--fl-text) italic"
      >
        “{{ pick.tagline }}”
      </p>
      <p class="mt-3 line-clamp-4 text-sm leading-relaxed text-(--fl-muted)">
        {{ pick.overview }}
      </p>

      <div
        class="min-h-6 flex-1"
        aria-hidden="true"
      />
      <footer class="flex items-center justify-between border-t border-dashed border-(--fl-line) pt-4">
        <span class="eyebrow">Admit one</span>
        <span
          class="flex items-center gap-2 text-xs tracking-[0.18em] text-(--fl-muted) uppercase transition-colors duration-500 group-hover:text-(--fl-accent)"
          aria-hidden="true"
        >
          Dossier
          <UIcon
            name="i-lucide-arrow-up-right"
            class="size-3.5"
          />
        </span>
      </footer>
    </div>
  </article>
</template>
