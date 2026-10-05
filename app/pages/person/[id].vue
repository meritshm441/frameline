<script setup lang="ts">
import type { PersonDossier } from '#shared/types/dossier'

const route = useRoute()
const id = computed(() => String(route.params.id))

const request = useFetch<PersonDossier>(() => `/api/person/${id.value}`, {
  key: computed(() => `person-${id.value}`)
})
const { data: person, status, error } = request

const event = useRequestEvent()
onServerPrefetch(async () => {
  await request
  const code = error.value?.statusCode
  if (event && (code === 404 || code === 400)) setResponseStatus(event, 404)
})

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const formatDate = (value: string | null) => (value ? date.format(new Date(value)) : null)

const facts = computed(() => {
  const p = person.value
  if (!p) return []
  return [
    { label: 'Known for', value: p.known_for_department },
    { label: 'Born', value: formatDate(p.birthday) },
    { label: 'Died', value: formatDate(p.deathday) },
    { label: 'Place of birth', value: p.place_of_birth },
    { label: 'On file', value: `${p.filmography.length} ${p.filmography.length === 1 ? 'film' : 'films'}` }
  ].filter((f): f is { label: string, value: string } => Boolean(f.value))
})

/* Long biographies fold after the first two paragraphs. */
const paragraphs = computed(() => (person.value?.biography ?? '').split(/\n+/).map(p => p.trim()).filter(Boolean))
const bioOpen = ref(false)
const shownParagraphs = computed(() => (bioOpen.value ? paragraphs.value : paragraphs.value.slice(0, 2)))

/* The full record can run to hundreds of lines; show it a reel at a time. */
const PAGE = 40
const recordLimit = ref(PAGE)
const record = computed(() => person.value?.filmography.slice(0, recordLimit.value) ?? [])

const ogImage = useTmdbImage(() => person.value?.profile_path, 'h632')
useSeoMeta({
  title: () => person.value?.name ?? 'Person',
  ogTitle: () => (person.value ? `${person.value.name} · Frameline` : 'Frameline'),
  description: () => paragraphs.value[0]?.slice(0, 200) || 'A person in the Frameline archive.',
  ogDescription: () => paragraphs.value[0]?.slice(0, 200) || 'A person in the Frameline archive.',
  ogImage: () => ogImage.value ?? undefined,
  ogType: 'profile'
})
</script>

<template>
  <div class="mx-auto max-w-360 px-5 pt-10 sm:px-8 md:pt-16 lg:px-12">
    <div
      v-if="status === 'pending' && !person"
      class="grid gap-12 md:grid-cols-12"
      aria-busy="true"
      aria-label="Opening the file"
    >
      <USkeleton class="aspect-2/3 w-full md:col-span-4" />
      <div class="space-y-5 md:col-span-7 md:col-start-6">
        <USkeleton class="h-3 w-24" />
        <USkeleton class="h-20 w-3/4" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-5/6" />
        <USkeleton class="h-4 w-2/3" />
      </div>
    </div>

    <section
      v-else-if="error || !person"
      class="py-24 md:py-32"
    >
      <p class="eyebrow">
        File missing
      </p>
      <h1 class="mt-6 max-w-3xl font-display text-5xl leading-[0.95] font-light sm:text-7xl">
        {{ error?.statusCode === 404 || error?.statusCode === 400
          ? 'Nobody on file by that number.'
          : 'The archive drawer is stuck.' }}
      </h1>
      <UButton
        to="/"
        class="mt-10"
        variant="outline"
        color="neutral"
        label="Back to the Compass"
      />
    </section>

    <article
      v-else
      class="fl-rise"
    >
      <div class="grid gap-12 md:grid-cols-12">
        <figure class="md:col-span-4">
          <div class="border border-(--fl-line) bg-(--fl-surface) p-1.5">
            <NuxtImg
              v-if="person.profile_path"
              provider="tmdb"
              :src="person.profile_path"
              :alt="`Portrait of ${person.name}`"
              width="500"
              height="750"
              sizes="xs:100vw md:33vw"
              preload
              class="aspect-2/3 w-full object-cover grayscale-[0.6] sepia-[0.2]"
            />
            <div
              v-else
              class="grid aspect-2/3 w-full place-items-center font-display text-3xl text-(--fl-dim) italic"
              aria-hidden="true"
            >
              No portrait on file
            </div>
          </div>
          <figcaption class="mt-3 flex justify-between eyebrow">
            <span>Subject</span>
            <span class="font-mono tracking-wider text-(--fl-accent) tabular-nums">P-{{ String(person.id).padStart(6, '0') }}</span>
          </figcaption>
        </figure>

        <div class="md:col-span-7 md:col-start-6">
          <p class="eyebrow">
            Person of interest
          </p>
          <h1 class="mt-5 font-display text-6xl leading-[0.92] font-light text-balance sm:text-7xl lg:text-8xl">
            {{ person.name }}
          </h1>

          <dl class="mt-10 grid gap-x-10 gap-y-4 border-y border-(--fl-line) py-6 sm:grid-cols-2">
            <div
              v-for="fact in facts"
              :key="fact.label"
            >
              <dt class="eyebrow">
                {{ fact.label }}
              </dt>
              <dd class="mt-1 text-(--fl-text) tabular-nums">
                {{ fact.value }}
              </dd>
            </div>
          </dl>

          <div
            v-if="paragraphs.length"
            id="biography"
            class="mt-10 max-w-2xl space-y-5 text-lg leading-relaxed text-(--fl-text)/90"
          >
            <p
              v-for="(paragraph, i) in shownParagraphs"
              :key="i"
            >
              {{ paragraph }}
            </p>
          </div>
          <p
            v-else
            class="mt-10 font-display text-xl text-(--fl-muted) italic"
          >
            No biography has been filed.
          </p>
          <UButton
            v-if="paragraphs.length > 2"
            class="mt-6"
            :label="bioOpen ? 'Fold the file' : 'Read the full file'"
            color="neutral"
            variant="link"
            :trailing-icon="bioOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            aria-controls="biography"
            :aria-expanded="bioOpen"
            @click="bioOpen = !bioOpen"
          />
        </div>
      </div>

      <section
        v-if="person.known_for.length"
        aria-labelledby="known-heading"
        class="mt-28"
      >
        <div class="border-b border-(--fl-line) pb-6">
          <p class="eyebrow">
            Exhibits
          </p>
          <h2
            id="known-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            Best known for
          </h2>
        </div>
        <ul class="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-10">
          <li
            v-for="(film, i) in person.known_for"
            :key="film.id"
            :class="i % 2 === 1 && 'md:mt-10'"
          >
            <NuxtLink
              :to="`/movie/${film.id}`"
              class="group block"
            >
              <div class="overflow-hidden border border-(--fl-line) bg-(--fl-raised) p-1">
                <NuxtImg
                  v-if="film.poster_path"
                  provider="tmdb"
                  :src="film.poster_path"
                  :alt="`Poster for ${film.title}`"
                  width="342"
                  height="513"
                  sizes="xs:50vw md:25vw"
                  loading="lazy"
                  class="aspect-2/3 w-full object-cover sepia-[0.25] transition-[filter] duration-1000 group-hover:sepia-0"
                />
                <div
                  v-else
                  class="grid aspect-2/3 w-full place-items-center p-4 text-center font-display text-xl text-(--fl-dim) italic"
                  aria-hidden="true"
                >
                  {{ film.title }}
                </div>
              </div>
              <p class="mt-3 font-display text-xl leading-tight transition-colors duration-500 group-hover:text-(--fl-accent)">
                {{ film.title }}
              </p>
              <p class="mt-1 text-xs text-(--fl-muted) tabular-nums">
                {{ film.year }}<template v-if="film.roles.length">
                  &middot; {{ film.roles.slice(0, 2).join(', ') }}
                </template>
              </p>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section
        v-if="person.filmography.length"
        aria-labelledby="record-heading"
        class="mt-28"
      >
        <div class="border-b border-(--fl-line) pb-6">
          <p class="eyebrow">
            The record
          </p>
          <h2
            id="record-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            Filmography
          </h2>
        </div>
        <ol class="divide-y divide-(--fl-line)">
          <li
            v-for="film in record"
            :key="film.id"
          >
            <NuxtLink
              :to="`/movie/${film.id}`"
              class="group grid grid-cols-[3.5rem_1fr] gap-4 py-3 sm:grid-cols-[5rem_1fr_1fr] sm:gap-8"
            >
              <span class="pt-1 font-mono text-sm text-(--fl-dim) tabular-nums">{{ film.year }}</span>
              <span class="font-display text-lg transition-colors duration-500 group-hover:text-(--fl-accent)">{{ film.title }}</span>
              <span class="col-start-2 text-sm text-(--fl-muted) sm:col-start-3 sm:pt-1">{{ film.roles.join(', ') }}</span>
            </NuxtLink>
          </li>
        </ol>
        <UButton
          v-if="person.filmography.length > recordLimit"
          class="mt-8"
          :label="`Show more (${person.filmography.length - recordLimit} remaining)`"
          color="neutral"
          variant="outline"
          @click="recordLimit += PAGE"
        />
      </section>
    </article>
  </div>
</template>
