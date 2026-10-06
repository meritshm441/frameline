<script setup lang="ts">
import type { WatchProvider, WatchResponse } from '#shared/types/tmdb'

/**
 * Official places to stream, rent or buy the film in the viewer's region,
 * from TMDB's watch-provider data (sourced from JustWatch, credited below).
 * TMDB gives one link per region, to its own watch page, which in turn links
 * out to each service, so every logo points there.
 */
const props = defineProps<{ movieId: number, title: string }>()

const { region, setRegion } = useWatchRegion()

const { data, status } = useFetch<WatchResponse>(() => `/api/movie/${props.movieId}/watch`, {
  key: computed(() => `watch-${props.movieId}-${region.value}`),
  query: { region },
  lazy: true
})

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
function regionName(code: string) {
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

const regionItems = computed(() =>
  (data.value?.regions ?? [])
    .map(code => ({ label: regionName(code), value: code }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const model = computed({
  get: () => region.value,
  set: (code: string | undefined) => {
    if (code) setRegion(code)
  }
})

function byPriority(list: WatchProvider[] = []) {
  const seen = new Set<number>()
  return [...list]
    .sort((a, b) => a.display_priority - b.display_priority)
    .filter(p => !seen.has(p.provider_id) && seen.add(p.provider_id))
}

const groups = computed(() => {
  const offers = data.value?.offers
  if (!offers) return []
  return [
    { label: 'Stream', note: 'with a subscription', providers: byPriority(offers.flatrate) },
    { label: 'Free', note: 'with or without ads', providers: byPriority([...(offers.free ?? []), ...(offers.ads ?? [])]) },
    { label: 'Rent', note: 'pay once, watch for a while', providers: byPriority(offers.rent) },
    { label: 'Buy', note: 'keep a digital copy', providers: byPriority(offers.buy) }
  ].filter(group => group.providers.length)
})
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-(--fl-muted)">
        Showing offers in <span class="text-(--fl-text)">{{ regionName(region) }}</span>.
      </p>
      <USelectMenu
        v-if="regionItems.length > 1"
        v-model="model"
        :items="regionItems"
        value-key="value"
        :search-input="{ placeholder: 'Type a country…', icon: 'i-lucide-search' }"
        icon="i-lucide-globe"
        color="neutral"
        variant="outline"
        aria-label="Country for streaming offers"
        class="w-full sm:w-64"
        :ui="{
          base: 'rounded-none',
          content: 'rounded-none bg-(--fl-surface) ring-(--fl-line)',
          item: 'rounded-none'
        }"
      />
    </div>

    <div
      v-if="status === 'pending' && !data"
      class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
    >
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-32"
      />
    </div>

    <p
      v-else-if="!groups.length"
      class="mt-8 max-w-xl border-l-2 border-(--fl-line) pl-5 font-display text-xl font-light text-(--fl-muted) italic"
    >
      {{ status === 'error'
        ? 'The listings couldn\'t be reached just now. Try again in a moment.'
        : `No official streaming, rental or purchase offers are on file for ${title} here. Try another country, or your local cinema or library.` }}
    </p>

    <template v-else>
      <div class="mt-8 grid gap-px border border-(--fl-line) bg-(--fl-line) sm:grid-cols-2 lg:grid-cols-4">
        <section
          v-for="group in groups"
          :key="group.label"
          class="bg-(--fl-surface) p-5"
        >
          <h3 class="eyebrow">
            {{ group.label }}
          </h3>
          <p class="mt-1 text-xs text-(--fl-dim)">
            {{ group.note }}
          </p>
          <ul class="mt-4 flex flex-wrap gap-3">
            <li
              v-for="provider in group.providers"
              :key="provider.provider_id"
            >
              <a
                :href="data!.offers!.link"
                target="_blank"
                rel="noopener noreferrer"
                :title="provider.provider_name"
                class="block size-12 overflow-hidden rounded-md ring-1 ring-(--fl-line) transition hover:ring-(--fl-accent) focus-visible:ring-2 focus-visible:ring-(--fl-accent) focus-visible:outline-none"
              >
                <NuxtImg
                  v-if="provider.logo_path"
                  provider="tmdb"
                  :src="provider.logo_path"
                  :alt="provider.provider_name"
                  width="92"
                  height="92"
                  loading="lazy"
                  class="size-full object-cover"
                />
                <span
                  v-else
                  class="grid size-full place-items-center bg-(--fl-raised) p-1 text-center text-[0.55rem] leading-tight"
                >{{ provider.provider_name }}</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <p class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-(--fl-dim)">
        <span>Availability from JustWatch, via TMDB. Offers change often.</span>
        <a
          :href="data!.offers!.link"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-(--fl-line) underline-offset-4 hover:text-(--fl-text)"
        >All options for {{ regionName(region) }} &rarr;</a>
      </p>
    </template>
  </div>
</template>
