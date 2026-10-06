<script setup lang="ts">
import type { WheelPoint } from '#shared/types/spectrum'
import { MONOCHROME, nearest, pointColour, pointName, PRESETS, roundPoint } from '#shared/utils/spectrum'

const SHOWN = 18

const { point, go, pool } = useSpectrum()
const { data, status, error, refresh } = pool

const films = computed(() => data.value?.films ?? [])
const { swatches, failures, reading, ready, mounted, unreadable } = useSwatches(films)

// The wheel moves freely while dragging and the lit dots follow it; the
// URL and the grid only follow on release.
const draft = ref<WheelPoint>(point.value)
watch(point, (value) => {
  draft.value = value
})

const entries = computed(() => films.value.flatMap((film) => {
  const swatch = swatches.value.get(film.poster_path)
  return swatch ? [{ film, swatch }] : []
}))

const matches = computed(() => nearest(point.value, entries.value, SHOWN))
const lit = computed(() => new Set(nearest(draft.value, entries.value, SHOWN).map(e => e.film.poster_path)))
const dots = computed(() => entries.value.map(e => ({
  key: e.film.poster_path,
  swatch: e.swatch,
  lit: lit.value.has(e.film.poster_path)
})))

/** Without readable colours, the pool is still worth browsing, as it comes. */
const fallback = computed(() => films.value.slice(0, SHOWN).map(film => ({ film, swatch: null })))

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const name = computed(() => pointName(point.value))
const draftName = computed(() => pointName(draft.value))
const draftRounded = computed(() => roundPoint(draft.value))

const progress = computed(() => {
  const total = films.value.length
  const done = swatches.value.size + failures.value
  return { done, total, ratio: total ? done / total : 0 }
})

function choose(preset: WheelPoint) {
  draft.value = preset
  go(preset)
}

const isCurrent = (preset: WheelPoint) => {
  const p = roundPoint(preset)
  return p.hue === point.value.hue && p.vivid === point.value.vivid
}

const announcement = computed(() => {
  if (!ready.value || unreadable.value) return ''
  return `${matches.value.length} posters nearest ${name.value}.`
})

// Wash the room faintly in the chosen colour. The grade is registered with
// @property in main.css, so it cross-fades, and it's removed on leaving.
useHead({
  htmlAttrs: {
    style: () => {
      const { hue, vivid } = point.value
      const grade = vivid < MONOCHROME ? 'transparent' : `oklch(0.55 ${(0.14 * vivid).toFixed(3)} ${hue} / 0.07)`
      return `--fl-grade:${grade}`
    }
  }
})

const description = computed(() =>
  `Films whose posters are ${name.value}, sorted from a pool of popular and top-rated films by the dominant colour of each poster.`)

useSeoMeta({
  title: () => `${capitalise(name.value)} · Spectrum`,
  ogTitle: () => `${capitalise(name.value)} posters · Spectrum · Frameline`,
  description,
  ogDescription: description
})
</script>

<template>
  <div>
    <!-- Phones: intro, wheel, then controls. Large screens: text on the left, the wheel beside it. -->
    <section
      aria-labelledby="spectrum-heading"
      class="mx-auto grid max-w-360 gap-x-8 gap-y-10 px-5 pt-10 sm:px-8 md:pt-16 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:px-12"
    >
      <div class="fl-rise lg:col-span-5">
        <p class="eyebrow">
          The Spectrum
        </p>
        <h1
          id="spectrum-heading"
          class="mt-6 font-display text-5xl leading-[0.95] font-light text-balance sm:text-7xl"
        >
          Films, by the colour of their posters.
        </h1>
        <p class="mt-6 max-w-md leading-relaxed text-(--fl-muted)">
          Every dot on the wheel is a poster, placed by its dominant colour: hue around the rim, vivid at the edge, black and white at the centre. Choose a point and the nearest posters come forward.
        </p>
      </div>

      <div class="order-last fl-rise [animation-delay:300ms] lg:order-none lg:col-span-5 lg:row-start-2">
        <!-- What's under the marker -->
        <div class="flex items-center gap-5 border-t border-(--fl-line) pt-6">
          <span
            class="size-16 shrink-0 ring-1 ring-(--fl-line) transition-colors duration-300"
            :style="{ background: pointColour(draft) }"
            aria-hidden="true"
          />
          <div>
            <p class="eyebrow">
              Under the marker
            </p>
            <p class="mt-1 font-display text-3xl leading-tight">
              {{ capitalise(draftName) }}
            </p>
            <p class="mt-1 text-xs tracking-[0.14em] text-(--fl-dim) uppercase tabular-nums">
              Hue {{ draftRounded.hue }}° &middot; {{ Math.round(draftRounded.vivid * 100) }}% vivid
            </p>
          </div>
        </div>

        <!-- Presets: the quickest way round the wheel, by keyboard or not -->
        <div
          role="group"
          aria-label="Jump to a colour"
          class="mt-8 flex flex-wrap gap-2"
        >
          <button
            v-for="preset in PRESETS"
            :key="preset.label"
            type="button"
            class="flex items-center gap-2 border px-3 py-2 text-xs tracking-[0.14em] uppercase transition-colors duration-500 hover:border-(--fl-accent) hover:text-(--fl-text)"
            :class="isCurrent(preset.point) ? 'border-(--fl-accent) text-(--fl-text)' : 'border-(--fl-line) text-(--fl-muted)'"
            :aria-pressed="isCurrent(preset.point)"
            @click="choose(preset.point)"
          >
            <span
              class="size-3 ring-1 ring-black/40"
              :style="{ background: pointColour(preset.point, 0.66) }"
              aria-hidden="true"
            />
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="fl-rise self-center [animation-delay:200ms] lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
        <!-- On phones the wheel stops short of the edges, leaving room to scroll past it (it takes over touch to drag). -->
        <SpectrumColourWheel
          v-model="draft"
          :dots="dots"
          class="mx-auto w-[84%] max-w-160 sm:w-full"
          @commit="go"
        />
        <!-- Reading progress. Visual only; the result is announced once, when it's ready. -->
        <div
          class="mx-auto mt-6 h-10 max-w-sm text-center transition-opacity duration-700"
          :class="reading ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        >
          <p class="text-[0.65rem] tracking-[0.2em] text-(--fl-muted) uppercase tabular-nums">
            Reading posters &middot; {{ progress.done }} of {{ progress.total }}
          </p>
          <div class="mt-2 h-px bg-(--fl-line)">
            <div
              class="h-px origin-left bg-(--fl-accent) transition-transform duration-300"
              :style="{ transform: `scaleX(${progress.ratio})` }"
            />
          </div>
        </div>
      </div>
    </section>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ announcement }}
    </p>

    <section
      aria-labelledby="matches-heading"
      class="mx-auto mt-16 max-w-360 px-5 sm:px-8 md:mt-24 lg:px-12"
    >
      <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">
            Nearest posters
          </p>
          <h2
            id="matches-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            <template v-if="point.vivid < MONOCHROME">
              In <span class="italic">black and white</span>
            </template>
            <template v-else>
              In the key of <span
                class="italic transition-colors duration-700"
                :style="{ color: pointColour(point, 0.8) }"
              >{{ name }}</span>
            </template>
          </h2>
        </div>
        <p class="max-w-sm text-sm text-(--fl-muted)">
          The {{ SHOWN }} posters closest to this colour, nearest first, from {{ films.length || 'a pool of' }} popular and top-rated films.
        </p>
      </div>

      <!-- Pool failed to load -->
      <div
        v-if="error && !data"
        class="py-24 text-center"
      >
        <p class="eyebrow">
          Projector trouble
        </p>
        <p class="mt-4 font-display text-4xl font-light text-balance">
          The posters didn't arrive. The lamp may need a moment.
        </p>
        <UButton
          class="mt-8"
          label="Try again"
          color="neutral"
          variant="outline"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
      </div>

      <!-- Colours couldn't be read on this device: show the pool as it comes -->
      <div v-else-if="unreadable">
        <p class="mt-10 max-w-2xl font-display text-2xl leading-snug font-light text-balance">
          This browser wouldn't let Frameline read the posters' colours, so the wheel is empty. Here is the pool as it comes, most popular first.
        </p>
        <SpectrumSwatchGrid
          :items="fallback"
          class="mt-12"
        />
      </div>

      <SpectrumSwatchGrid
        v-else-if="ready && matches.length"
        :items="matches"
        class="mt-12"
      />

      <!-- Loading the pool, or reading its colours -->
      <div
        v-else
        class="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-6"
        aria-busy="true"
        :aria-label="mounted && films.length ? 'Reading the posters’ colours' : 'Gathering posters'"
      >
        <div
          v-for="i in SHOWN"
          :key="i"
        >
          <USkeleton class="aspect-2/3 w-full" />
          <USkeleton class="h-10 w-full opacity-60" />
          <USkeleton class="mt-3 h-4 w-3/4" />
        </div>
      </div>

      <p
        v-if="ready && failures && !unreadable"
        class="mt-16 text-xs text-(--fl-dim)"
      >
        {{ failures }} {{ failures === 1 ? 'poster' : 'posters' }} couldn't be read and {{ failures === 1 ? 'is' : 'are' }} left off the wheel.
      </p>
      <p class="mt-4 max-w-xl text-xs leading-relaxed text-(--fl-dim)">
        Colours are read in your browser from each poster's pixels and remembered on this device, so the wheel fills at once next time.
      </p>
    </section>
  </div>
</template>
