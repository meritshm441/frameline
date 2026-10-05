<script setup lang="ts">
import type { CompassCompany, CompassResponse, CompassRuntime, MoodPoint } from '#shared/types/compass'
import { moodQuadrant, QUADRANT_LABELS } from '#shared/utils/compass'

useSeoMeta({
  title: null,
  ogTitle: 'Frameline: a cinematic atlas',
  description: 'What kind of night is it? Find three films for tonight by mood, time and company.',
  ogDescription: 'What kind of night is it? Find three films for tonight by mood, time and company.'
})

const { query, update, reshuffle, programme } = useCompass()
const { data, status, error, refresh } = programme

// The dial moves freely while dragging; the URL (and the fetch) only follow on release.
const draft = ref<MoodPoint>({ x: query.value.x, y: query.value.y })
watch(() => [query.value.x, query.value.y] as const, ([x, y]) => {
  draft.value = { x, y }
})

const runtime = computed<CompassRuntime>({
  get: () => query.value.runtime,
  set: value => update({ runtime: value })
})
const company = computed<CompassCompany>({
  get: () => query.value.company,
  set: value => update({ company: value })
})

const heading = computed(() => QUADRANT_LABELS[moodQuadrant(draft.value)])
// A new brief means a new fetch key, which empties `data` until it lands. Keep the
// previous bill on screen (dimmed) meanwhile rather than flashing skeletons.
// (A computed, not a watcher alone, because watchers don't run during SSR.)
const previous = shallowRef<CompassResponse | null>(null)
watch(data, (value) => {
  if (value) previous.value = value
})
const shown = computed(() => data.value ?? previous.value)

const picks = computed(() => shown.value?.picks ?? [])
const loading = computed(() => status.value === 'pending')

const reading = computed(() => {
  const names = shown.value?.reading ?? []
  if (!names.length) return 'any genre at all'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
})
</script>

<template>
  <div>
    <section class="mx-auto grid max-w-360 items-start gap-14 px-5 pt-10 sm:px-8 md:pt-20 lg:grid-cols-12 lg:px-12">
      <div class="fl-rise lg:col-span-5">
        <p class="eyebrow">
          The Compass
        </p>
        <h1 class="mt-6 font-display text-6xl leading-[0.95] font-light text-balance sm:text-7xl xl:text-8xl">
          What kind of night is it?
        </h1>
        <p class="mt-8 max-w-md text-lg leading-relaxed text-(--fl-muted)">
          Set the point on the dial, from light to heavy and calm to intense. Frameline will put three films on tonight's bill.
        </p>

        <div class="mt-12 space-y-8">
          <CompassChoiceGroup
            v-model="runtime"
            legend="How much time do you have?"
            name="runtime"
            :options="RUNTIME_OPTIONS"
          />
          <CompassChoiceGroup
            v-model="company"
            legend="Watching with?"
            name="company"
            :options="COMPANY_OPTIONS"
          />
        </div>
      </div>

      <div class="fl-rise mx-auto w-full max-w-xl [animation-delay:200ms] lg:col-span-6 lg:col-start-7 lg:mt-6">
        <CompassMoodDial
          v-model="draft"
          @commit="update"
        />
      </div>
    </section>

    <section
      aria-labelledby="programme-heading"
      class="mx-auto mt-24 max-w-360 px-5 sm:px-8 md:mt-32 lg:px-12"
    >
      <div class="flex flex-col gap-6 border-b border-(--fl-line) pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">
            Tonight's programme
          </p>
          <h2
            id="programme-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            {{ heading }}
          </h2>
          <p
            class="mt-3 text-(--fl-muted)"
            aria-live="polite"
          >
            <template v-if="shown">
              Tonight reads as <span class="font-display text-(--fl-text) italic">{{ reading }}</span>.
            </template>
            <template v-else>
              &nbsp;
            </template>
          </p>
        </div>
        <UButton
          label="Reshuffle"
          icon="i-lucide-shuffle"
          color="neutral"
          variant="outline"
          size="lg"
          :loading="loading"
          :disabled="!picks.length && !loading"
          class="self-start md:self-auto"
          @click="reshuffle"
        />
      </div>

      <!-- First load: skeleton bill -->
      <div
        v-if="loading && !picks.length"
        class="mt-12 grid gap-10 md:grid-cols-3 lg:gap-14"
        aria-busy="true"
        aria-label="Setting tonight's programme"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="space-y-4 border border-(--fl-line) p-6"
          :class="i === 2 && 'md:mt-16'"
        >
          <USkeleton class="h-3 w-20" />
          <USkeleton class="aspect-2/3 w-full" />
          <USkeleton class="h-8 w-3/4" />
          <USkeleton class="h-3 w-1/2" />
          <USkeleton class="h-16 w-full" />
        </div>
      </div>

      <div
        v-else-if="error && !loading"
        class="py-24 text-center"
      >
        <p class="eyebrow">
          Projector trouble
        </p>
        <p class="mt-4 font-display text-4xl font-light">
          The reel slipped. We couldn't set tonight's bill.
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
        v-else-if="!picks.length"
        class="py-24 text-center"
      >
        <p class="eyebrow">
          An empty house
        </p>
        <p class="mx-auto mt-4 max-w-2xl font-display text-4xl font-light text-balance">
          Nothing in the archive fits that exact brief.
        </p>
        <p class="mx-auto mt-4 max-w-md text-(--fl-muted)">
          Try a different running time, or move the point a little toward the centre of the dial.
        </p>
      </div>

      <ol
        v-else
        class="mt-12 grid gap-10 transition-opacity duration-500 md:grid-cols-3 lg:gap-14"
        :class="loading && 'opacity-40'"
        :aria-busy="loading"
      >
        <li
          v-for="(pick, i) in picks"
          :key="pick.id"
          class="fl-rise"
          :class="i === 1 && 'md:mt-16'"
          :style="{ animationDelay: `${i * 140}ms` }"
        >
          <CompassProgramCard
            :pick="pick"
            :index="i"
            class="h-full"
          />
        </li>
      </ol>
    </section>
  </div>
</template>
