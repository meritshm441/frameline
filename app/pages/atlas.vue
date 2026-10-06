<script setup lang="ts">
import { countryInSentence, countryName } from '#shared/utils/atlas'

const { query, open, close, setSpan, films } = useAtlas()
const { data, status, error, refresh } = films
const { stamps, visited, stamp, clear, loaded } = usePassport()

// Clearing can't be undone, so it asks once, inline, before it happens.
// Focus follows the swap between the trigger and the confirm buttons, so
// keyboard users aren't dropped back at the top of the page.
const confirmingClear = ref(false)
const clearControls = useTemplateRef<HTMLDivElement>('clearControls')

async function setConfirming(value: boolean) {
  confirmingClear.value = value
  await nextTick()
  clearControls.value?.querySelector<HTMLButtonElement>(value ? '[data-keep]' : 'button')?.focus()
}

function clearPassport() {
  clear()
  confirmingClear.value = false
}

const country = computed(() => query.value.country)
const name = computed(() => (country.value ? countryName(country.value) : null))

// Stamp after mount, never during hydration: the server rendered an empty
// passport, and changing it mid-hydration would make the two disagree.
onMounted(() => {
  if (country.value) stamp(country.value)
})
watch(country, (code) => {
  if (code) stamp(code)
})

const entry = computed(() => {
  const i = stamps.value.findIndex(s => s.code === country.value)
  return i === -1 ? null : i + 1
})
const currentStamp = computed(() => (entry.value ? stamps.value[entry.value - 1] ?? null : null))

const visitedLine = computed(() => {
  const n = stamps.value.length
  return `You've visited ${n} ${n === 1 ? 'country’s' : 'countries’'} cinema`
})

const description = computed(() => name.value
  ? `The most acclaimed films made in ${countryInSentence(country.value!)}, decade by decade, in Frameline's atlas of world cinema.`
  : 'A world map of cinema. Choose a country and travel through its most acclaimed films, decade by decade.')

useSeoMeta({
  title: () => (name.value ? `${name.value} · Atlas` : 'Atlas'),
  ogTitle: () => (name.value ? `${name.value} · Atlas · Frameline` : 'Atlas · Frameline'),
  description,
  ogDescription: description
})
</script>

<template>
  <div>
    <section
      aria-labelledby="atlas-heading"
      class="relative border-b border-(--fl-line) bg-(--fl-bg) sm:h-[calc(100svh-5.5rem)] sm:min-h-136 sm:border-t"
    >
      <!-- Title plate. Only the plate itself catches the pointer; the map shows through around it. -->
      <div class="pointer-events-none inset-x-0 top-0 sm:absolute sm:z-10">
        <div class="fl-rise pointer-events-auto max-w-md px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-0 lg:px-12">
          <p class="eyebrow">
            The Atlas
          </p>
          <h1
            id="atlas-heading"
            class="mt-4 font-display text-4xl leading-[0.95] font-light text-balance sm:text-6xl"
          >
            Every country keeps a cinema.
          </h1>
          <p class="mt-4 hidden max-w-sm leading-relaxed text-(--fl-muted) sm:block">
            Choose a country to open its most acclaimed films, then set the decades you want to travel through.
          </p>
          <div class="mt-6 max-w-xs">
            <AtlasCountryFinder
              :selected="country"
              @select="open"
            />
          </div>
          <p
            class="mt-4 text-xs tracking-[0.18em] uppercase tabular-nums"
            :class="stamps.length ? 'text-(--fl-accent)' : 'text-(--fl-dim)'"
            aria-live="polite"
          >
            <template v-if="!loaded">
              &nbsp;
            </template>
            <a
              v-else
              href="#travel-log"
              class="underline-offset-4 hover:underline"
            >{{ stamps.length ? visitedLine : 'Your passport is empty' }}</a>
          </p>
        </div>
      </div>

      <!-- Phones: the plate sits above a map that fits the width. Larger screens: the map fills the frame and the plate floats on it. -->
      <div class="relative aspect-8/5 border-t border-(--fl-line) sm:absolute sm:inset-0 sm:aspect-auto sm:border-t-0">
        <ClientOnly>
          <LazyAtlasWorldMap
            :selected="country"
            :visited="visited"
            class="absolute inset-0"
            @select="open"
          />
          <template #fallback>
            <div
              class="absolute inset-0 grid place-items-center bg-[radial-gradient(var(--fl-line)_1px,transparent_1px)] bg-size-[28px_28px]"
              aria-busy="true"
              aria-label="Unrolling the map"
            >
              <p class="font-display text-xl text-(--fl-muted) italic">
                Unrolling the map…
              </p>
            </div>
          </template>
        </ClientOnly>
      </div>
    </section>

    <section
      id="travel-log"
      aria-labelledby="travel-log-heading"
      class="mx-auto mt-24 max-w-360 scroll-mt-8 px-5 sm:px-8 lg:px-12"
    >
      <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">
            Travel log
          </p>
          <h2
            id="travel-log-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            <template v-if="loaded && stamps.length">
              {{ visitedLine }}.
            </template>
            <template v-else>
              Your passport
            </template>
          </h2>
        </div>
        <div class="max-w-sm">
          <p class="text-sm text-(--fl-muted)">
            Every country you open is stamped here, in this browser only. Select a stamp to return.
          </p>
          <div
            v-if="loaded && stamps.length"
            ref="clearControls"
            class="mt-4 flex flex-wrap items-center gap-3"
          >
            <UButton
              v-if="!confirmingClear"
              label="Clear passport"
              icon="i-lucide-eraser"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="setConfirming(true)"
            />
            <template v-else>
              <span
                class="text-sm text-(--fl-text)"
                role="status"
              >Remove all {{ stamps.length }} {{ stamps.length === 1 ? 'stamp' : 'stamps' }}?</span>
              <UButton
                label="Clear"
                size="sm"
                color="error"
                variant="outline"
                @click="clearPassport"
              />
              <UButton
                label="Keep"
                size="sm"
                color="neutral"
                variant="ghost"
                data-keep
                @click="setConfirming(false)"
              />
            </template>
          </div>
        </div>
      </div>
      <AtlasPassport
        :stamps="stamps"
        :loaded="loaded"
        :selected="country"
        class="mt-10"
        @select="open"
      />
    </section>

    <AtlasCountryDrawer
      :query="query"
      :response="data ?? null"
      :pending="status === 'pending'"
      :failed="Boolean(error)"
      :stamp="currentStamp"
      :entry="entry"
      @close="close"
      @select="open"
      @span="setSpan"
      @retry="() => refresh()"
    />
  </div>
</template>
