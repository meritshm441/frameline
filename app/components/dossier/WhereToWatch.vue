<script setup lang="ts">
import type { WatchProvider, WatchResponse } from '#shared/types/tmdb'
import { countryName } from '#shared/utils/atlas'

/**
 * Official places to stream, rent or buy the film in the viewer's region,
 * from TMDB's watch-provider data (sourced from JustWatch, credited below).
 * TMDB gives one link per region, to its own watch page, which in turn links
 * out to each service, so every logo points there.
 *
 * Laid out as a ledger, one row per kind of offer, so the block keeps its
 * shape whatever the film has. The fetch key doesn't include the region, so
 * switching country keeps the old rows on screen until the new ones arrive
 * instead of collapsing to a skeleton.
 */
const props = defineProps<{ movieId: number, title: string }>()

const { region, setRegion } = useWatchRegion()

const { data, status } = useFetch<WatchResponse>(() => `/api/movie/${props.movieId}/watch`, {
  key: computed(() => `watch-${props.movieId}`),
  query: { region },
  lazy: true
})

// Names come from the Atlas table so server and browser agree (Intl.DisplayNames
// varies by ICU version and breaks hydration). Small territories it lacks get
// Intl's name, but only after mount.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const displayNames = import.meta.client ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

function regionName(code: string) {
  const known = countryName(code)
  if (known !== code || !mounted.value) return known
  try {
    return displayNames?.of(code) ?? code
  } catch {
    return code
  }
}

const regionItems = computed(() => {
  const codes = new Set(data.value?.regions ?? [])
  codes.add(region.value)
  return [...codes]
    .map(code => ({ label: regionName(code), value: code }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

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

const offers = computed(() => data.value?.offers ?? null)

const rows = computed(() => {
  const o = offers.value
  if (!o) return []
  return [
    { label: 'Stream', note: 'Subscription', providers: byPriority(o.flatrate) },
    { label: 'Free', note: 'With or without ads', providers: byPriority([...(o.free ?? []), ...(o.ads ?? [])]) },
    { label: 'Rent', note: 'Pay per view', providers: byPriority(o.rent) },
    { label: 'Buy', note: 'Digital copy', providers: byPriority(o.buy) }
  ].filter(row => row.providers.length)
})

const refreshing = computed(() => status.value === 'pending' && Boolean(data.value))
</script>

<template>
  <div class="border border-(--fl-line) bg-(--fl-surface) p-1.5">
    <div class="border border-(--fl-line) px-5 pt-4 pb-5 sm:px-6">
      <header class="flex flex-col gap-3 border-b border-(--fl-line) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="eyebrow">
          Showings in {{ regionName(region) }}
        </p>
        <USelectMenu
          v-model="model"
          :items="regionItems"
          value-key="value"
          :search-input="{ placeholder: 'Type a country…', icon: 'i-lucide-search' }"
          :disabled="regionItems.length < 2"
          icon="i-lucide-globe"
          color="neutral"
          variant="outline"
          size="sm"
          aria-label="Country for streaming offers"
          class="w-full sm:w-56"
          :ui="{
            base: 'rounded-none',
            content: 'rounded-none bg-(--fl-surface) ring-(--fl-line)',
            item: 'rounded-none'
          }"
        />
      </header>

      <div
        class="transition-opacity duration-300"
        :class="refreshing ? 'opacity-50' : 'opacity-100'"
        :aria-busy="status === 'pending'"
      >
        <!-- First load only: rows the same height as the real ones. -->
        <div
          v-if="!data && status !== 'error'"
          class="divide-y divide-dashed divide-(--fl-line)"
        >
          <div
            v-for="n in 3"
            :key="n"
            class="grid gap-3 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"
          >
            <USkeleton class="h-4 w-20" />
            <div class="flex gap-2">
              <USkeleton
                v-for="m in 4"
                :key="m"
                class="size-10 rounded-md"
              />
            </div>
          </div>
        </div>

        <p
          v-else-if="!rows.length"
          class="py-6 font-display text-lg font-light text-(--fl-muted) italic"
        >
          {{ status === 'error'
            ? 'The listings couldn\'t be reached just now. Try again in a moment.'
            : `No official offers for ${title} are on file in ${regionName(region)}. Try another country, or your local cinema or library.` }}
        </p>

        <dl
          v-else
          class="divide-y divide-dashed divide-(--fl-line)"
        >
          <div
            v-for="row in rows"
            :key="row.label"
            class="grid gap-3 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"
          >
            <dt>
              <span class="eyebrow">{{ row.label }}</span>
              <span class="mt-0.5 block text-xs text-(--fl-dim)">{{ row.note }}</span>
            </dt>
            <dd>
              <ul class="flex flex-wrap gap-2">
                <li
                  v-for="provider in row.providers"
                  :key="provider.provider_id"
                >
                  <a
                    :href="offers!.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="provider.provider_name"
                    class="block size-10 overflow-hidden rounded-md ring-1 ring-(--fl-line) transition hover:ring-(--fl-accent) focus-visible:ring-2 focus-visible:ring-(--fl-accent) focus-visible:outline-none"
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
                      class="grid size-full place-items-center bg-(--fl-raised) p-0.5 text-center text-[0.5rem] leading-tight"
                    >{{ provider.provider_name }}</span>
                  </a>
                </li>
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      <footer class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-(--fl-line) pt-4 text-xs text-(--fl-dim)">
        <span>Availability from JustWatch, via TMDB. Offers change often.</span>
        <a
          v-if="offers"
          :href="offers.link"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-(--fl-line) underline-offset-4 hover:text-(--fl-text)"
        >All options &rarr;</a>
      </footer>
    </div>
  </div>
</template>
