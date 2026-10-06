<script setup lang="ts">
import type { TimeMachineResponse } from '#shared/types/time-machine'
import { currentYear, FIRST_YEAR } from '#shared/utils/time-machine'

const { year, go, reel } = useTimeMachine()
const { data, status, error, refresh } = reel

const lastYear = currentYear()

// The timeline moves freely while scrubbing, and the room restyles with it;
// the URL (and the fetch) only follow on release.
const draft = ref(year.value)
watch(year, (value) => {
  draft.value = value
})

const { era, style } = useEra(draft)

// A new year means a new fetch key, which empties `data` until it lands. Keep
// the previous year on screen (dimmed) meanwhile rather than flashing skeletons.
const previous = shallowRef<TimeMachineResponse | null>(null)
watch(data, (value) => {
  if (value) previous.value = value
})
const shown = computed(() => data.value ?? previous.value)
const loading = computed(() => status.value === 'pending')

const description = computed(() =>
  `What was playing in ${year.value}, and the films from that year that lasted. Frameline's Time Machine runs from ${FIRST_YEAR} to today.`)

useSeoMeta({
  title: () => `${year.value} · Time Machine`,
  ogTitle: () => `What was playing in ${year.value}? · Frameline`,
  description,
  ogDescription: description
})
</script>

<template>
  <div :style="style">
    <section
      aria-labelledby="time-machine-heading"
      class="mx-auto max-w-360 px-5 pt-10 sm:px-8 md:pt-16 lg:px-12"
    >
      <div class="fl-rise grid items-end gap-8 lg:grid-cols-12">
        <div class="lg:col-span-8">
          <p class="eyebrow">
            The Time Machine &middot; <span class="text-(--fl-accent) transition-colors duration-700">{{ era.name }}</span>
          </p>
          <h1
            id="time-machine-heading"
            class="mt-6"
          >
            <span class="block font-display text-3xl font-light sm:text-5xl">What was playing in</span>
            <span class="mt-2 block text-[clamp(6rem,24vw,18rem)] leading-[0.82] tabular-nums era-type">{{ draft }}<span class="text-(--fl-accent)">?</span></span>
          </h1>
        </div>
        <p class="max-w-sm pb-3 leading-relaxed text-(--fl-muted) lg:col-span-4 lg:justify-self-end">
          <span class="font-display text-(--fl-text) italic">{{ era.note }}</span>
          Drag along the years below; the room changes with each decade.
        </p>
      </div>

      <TimeMachineTimeline
        v-model="draft"
        :min="FIRST_YEAR"
        :max="lastYear"
        class="fl-rise mt-12 [animation-delay:200ms] md:mt-16"
        @commit="go"
      />
    </section>

    <!-- First load: skeleton bill -->
    <div
      v-if="loading && !shown"
      class="mx-auto mt-24 grid max-w-360 gap-12 px-5 sm:px-8 md:grid-cols-12 lg:px-12"
      aria-busy="true"
      aria-label="Threading the projector"
    >
      <div class="space-y-4 md:col-span-5">
        <USkeleton class="h-3 w-28" />
        <USkeleton class="aspect-2/3 w-full" />
        <USkeleton class="h-10 w-3/4" />
      </div>
      <div class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-7 md:pt-10">
        <div
          v-for="i in 6"
          :key="i"
          class="space-y-3"
        >
          <USkeleton class="aspect-2/3 w-full" />
          <USkeleton class="h-4 w-3/4" />
        </div>
      </div>
    </div>

    <div
      v-else-if="error && !loading"
      class="mx-auto max-w-360 px-5 py-24 text-center sm:px-8 lg:px-12"
    >
      <p class="eyebrow">
        Projector trouble
      </p>
      <p class="mt-4 font-display text-4xl font-light">
        The film jammed in the gate. We couldn't reach {{ year }}.
      </p>
      <UButton
        class="mt-8"
        label="Try again"
        color="neutral"
        variant="outline"
        @click="() => refresh()"
      />
    </div>

    <div
      v-else-if="shown"
      class="transition-opacity duration-500"
      :class="loading && 'opacity-40'"
      :aria-busy="loading"
    >
      <section
        aria-labelledby="playing-heading"
        class="mx-auto mt-24 max-w-360 px-5 sm:px-8 md:mt-32 lg:px-12"
      >
        <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="eyebrow">
              What was playing
            </p>
            <h2
              id="playing-heading"
              class="mt-3 text-4xl sm:text-5xl era-type"
            >
              On the bill in {{ shown.year }}
            </h2>
          </div>
          <p class="max-w-sm text-sm text-(--fl-muted)">
            Films released that year, the most watched today first.
          </p>
        </div>

        <TimeMachineNowShowing
          v-if="shown.playing.length"
          :films="shown.playing"
          class="mt-12"
        />
        <p
          v-else
          class="py-20 text-center font-display text-3xl font-light text-balance"
        >
          The reels from {{ shown.year }} are lost. Nothing from that year has enough votes on record.
        </p>
      </section>

      <section
        v-if="shown.acclaimed.length"
        aria-labelledby="lasted-heading"
        class="mx-auto mt-24 max-w-360 px-5 sm:px-8 md:mt-32 lg:px-12"
      >
        <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="eyebrow">
              Highest rated
            </p>
            <h2
              id="lasted-heading"
              class="mt-3 text-4xl sm:text-5xl era-type"
            >
              The ones that lasted
            </h2>
          </div>
          <p class="max-w-sm text-sm text-(--fl-muted)">
            {{ shown.year }}'s best-rated films among those with {{ shown.acclaimed_min_votes }} or more votes on TMDB.
          </p>
        </div>
        <TimeMachineHonourRoll
          :films="shown.acclaimed"
          class="mt-4"
        />
      </section>

      <!-- Neighbouring years, as real links. -->
      <nav
        aria-label="Neighbouring years"
        class="mx-auto mt-24 flex max-w-360 items-center justify-between gap-6 px-5 sm:px-8 lg:px-12"
      >
        <NuxtLink
          v-if="year > FIRST_YEAR"
          :to="{ query: { year: year - 1 } }"
          replace
          class="group flex items-center gap-3 text-(--fl-muted) transition-colors duration-500 hover:text-(--fl-accent)"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          <span class="font-display text-2xl tabular-nums">{{ year - 1 }}</span>
        </NuxtLink>
        <span v-else />
        <NuxtLink
          v-if="year < lastYear"
          :to="{ query: { year: year + 1 } }"
          replace
          class="group flex items-center gap-3 text-(--fl-muted) transition-colors duration-500 hover:text-(--fl-accent)"
        >
          <span class="font-display text-2xl tabular-nums">{{ year + 1 }}</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-4"
          />
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
