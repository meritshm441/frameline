<script setup lang="ts">
import type { JournalEntry } from '#shared/types/journal'
import { countryName } from '#shared/utils/atlas'
import { RATING_WORDS } from '#shared/utils/journal'

/**
 * One viewing, as a torn-off cinema ticket: the film on the body, the date
 * and seat on the stub, a perforated line between them and a scalloped edge
 * where it was torn. Ticket stock comes in a few faded paper colours, chosen
 * by the entry so each stub always prints the same.
 */
const props = defineProps<{
  entry: JournalEntry
  /** Its number in the journal, oldest first. */
  number: number
}>()

const emit = defineEmits<{ edit: [], remove: [] }>()

const STOCKS = ['#ece2cd', '#e9d2c9', '#d7e0cf', '#d2dde1', '#ebdfb2'] as const

const stock = computed(() => {
  let hash = 7
  for (const ch of props.entry.id) hash = (hash * 31 + ch.charCodeAt(0)) % 9973
  return STOCKS[hash % STOCKS.length]
})

// `watchedOn` is a calendar date, so it's read and printed in UTC to keep it from shifting a day.
const date = computed(() => new Date(`${props.entry.watchedOn}T00:00:00Z`))
const day = computed(() => String(date.value.getUTCDate()).padStart(2, '0'))
const month = computed(() => date.value.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }))
const year = computed(() => date.value.getUTCFullYear())
const longDate = computed(() => date.value.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))

const row = computed(() => props.entry.seat.charAt(0))
const seat = computed(() => props.entry.seat.slice(1))
const serial = computed(() => String(props.number).padStart(4, '0'))

const origin = computed(() => props.entry.film.countries.slice(0, 2).map(countryName).join(' / '))
const ratingLabel = computed(() => props.entry.rating
  ? `Rated ${props.entry.rating} of 5: ${RATING_WORDS[props.entry.rating]}`
  : 'Not rated')
</script>

<template>
  <article
    class="fl-ticket relative flex text-[#241f1a] [&_:focus-visible]:outline-[#241f1a]"
    :style="{ backgroundColor: stock }"
    :aria-label="`${entry.film.title}, watched ${longDate}`"
  >
    <!-- Body -->
    <div class="flex min-w-0 flex-1 gap-4 p-4 sm:p-5">
      <div class="w-14 shrink-0 sm:w-16">
        <NuxtImg
          v-if="entry.film.poster_path"
          provider="tmdb"
          :src="entry.film.poster_path"
          alt=""
          width="92"
          height="138"
          sizes="64px"
          loading="lazy"
          class="aspect-2/3 w-full object-cover mix-blend-multiply contrast-[1.05] grayscale-[0.35] sepia-[0.3]"
        />
        <div
          v-else
          class="grid aspect-2/3 w-full place-items-center border border-dashed border-[#241f1a]/30"
          aria-hidden="true"
        >
          <UIcon
            name="i-lucide-film"
            class="size-5 opacity-50"
          />
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <p class="font-sans text-[0.6rem] font-semibold tracking-[0.24em] text-[#8f2a1e] uppercase">
          Frameline Picture House
        </p>
        <h3 class="mt-1.5 font-display text-xl leading-tight font-normal text-balance sm:text-2xl">
          <NuxtLink
            :to="`/movie/${entry.film.id}`"
            class="underline-offset-4 decoration-1 hover:underline"
          >
            {{ entry.film.title }}
          </NuxtLink>
        </h3>
        <p class="mt-1 text-xs text-[#5b5248] tabular-nums">
          {{ [entry.film.year, origin].filter(Boolean).join(' · ') }}
        </p>

        <p
          class="mt-3 flex items-center gap-0.5"
          :title="ratingLabel"
        >
          <span class="sr-only">{{ ratingLabel }}</span>
          <template v-if="entry.rating">
            <JournalStar
              v-for="r in 5"
              :key="r"
              :filled="r <= entry.rating"
              class="size-3.5"
              :class="r <= entry.rating ? 'text-[#241f1a]' : 'text-[#241f1a]/35'"
            />
          </template>
          <span
            v-else
            class="text-[0.65rem] tracking-[0.18em] text-[#5b5248] uppercase"
            aria-hidden="true"
          >Unrated</span>
        </p>

        <p
          v-if="entry.note"
          class="mt-2 font-display text-base leading-snug italic"
        >
          “{{ entry.note }}”
        </p>

        <div class="mt-auto flex gap-4 pt-3">
          <button
            type="button"
            class="text-[0.65rem] tracking-[0.18em] text-[#5b5248] uppercase underline-offset-4 hover:text-[#241f1a] hover:underline"
            @click="emit('edit')"
          >
            Edit<span class="sr-only"> the stub for {{ entry.film.title }}</span>
          </button>
          <button
            type="button"
            class="text-[0.65rem] tracking-[0.18em] text-[#5b5248] uppercase underline-offset-4 hover:text-[#8f2a1e] hover:underline"
            @click="emit('remove')"
          >
            Tear up<span class="sr-only"> the stub for {{ entry.film.title }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Perforation. The notches at each end are cut by the .fl-ticket mask. -->
    <div
      class="w-0 border-l-2 border-dotted border-[#241f1a]/35"
      aria-hidden="true"
    />

    <!-- Stub -->
    <div class="flex w-22 shrink-0 flex-col items-center justify-between py-4 pr-3 pl-2 text-center sm:w-26 sm:py-5">
      <p class="font-sans text-[0.55rem] font-semibold tracking-[0.2em] text-[#8f2a1e] uppercase">
        Admit one
      </p>
      <p class="my-2 leading-none">
        <span class="block font-display text-4xl font-normal tabular-nums">{{ day }}</span>
        <span class="mt-1 block text-[0.65rem] font-semibold tracking-[0.24em] uppercase">{{ month }}</span>
        <span class="mt-0.5 block text-[0.65rem] tracking-[0.18em] text-[#5b5248] tabular-nums">{{ year }}</span>
      </p>
      <dl class="grid w-full grid-cols-2 border-t border-[#241f1a]/25 pt-2 text-[0.55rem] tracking-[0.14em] uppercase">
        <div>
          <dt class="text-[#5b5248]">
            Row
          </dt>
          <dd class="font-mono text-sm font-semibold">
            {{ row }}
          </dd>
        </div>
        <div>
          <dt class="text-[#5b5248]">
            Seat
          </dt>
          <dd class="font-mono text-sm font-semibold tabular-nums">
            {{ seat }}
          </dd>
        </div>
      </dl>
      <p class="mt-2 font-mono text-[0.55rem] tracking-wider text-[#5b5248] tabular-nums">
        Nº {{ serial }}
      </p>
    </div>
  </article>
</template>
