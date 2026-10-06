<script setup lang="ts">
import { pickTrailer, toFilmStub, yearOf } from '#shared/utils/dossier'

const route = useRoute()
const id = computed(() => String(route.params.id))

const request = useMovie(id)
const { data: movie, status, error } = request

// A missing film should be a real 404 for crawlers, not a 200 with an apology.
// (Not awaited in setup, so client-side navigation still shows the skeleton.)
const event = useRequestEvent()
onServerPrefetch(async () => {
  await request
  const code = error.value?.statusCode
  if (event && (code === 404 || code === 400)) setResponseStatus(event, 404)
})

const year = computed(() => yearOf(movie.value?.release_date))
const directors = computed(() => movie.value?.credits.crew.filter(c => c.job === 'Director').map(c => c.name) ?? [])
const trailer = computed(() => pickTrailer(movie.value?.videos.results ?? []))
const stub = computed(() => (movie.value ? toFilmStub(movie.value) : null))

const ogImage = useTmdbImage(() => movie.value?.backdrop_path, 'w1280')
const ogTitle = computed(() => (movie.value ? `${movie.value.title}${year.value ? ` (${year.value})` : ''} · Frameline` : 'Frameline'))
const ogDescription = computed(() => {
  const m = movie.value
  if (!m) return 'A film in the Frameline archive.'
  const by = directors.value.length ? `Directed by ${directors.value.join(' and ')}. ` : ''
  return `${by}${m.tagline || m.overview || 'A film in the Frameline archive.'}`.slice(0, 200)
})

useSeoMeta({
  title: () => movie.value?.title ?? 'Film',
  ogTitle,
  description: () => movie.value?.overview || ogDescription.value,
  ogDescription,
  ogImage: () => ogImage.value ?? undefined,
  ogType: 'video.movie',
  twitterCard: 'summary_large_image'
})

// Defer the Constellation (D3 + six TMDB calls) until it's nearly on screen.
const constellationAnchor = useTemplateRef<HTMLElement>('constellationAnchor')
const showConstellation = useNearViewport(constellationAnchor)
</script>

<template>
  <div>
    <!-- Loading -->
    <section
      v-if="status === 'pending' && !movie"
      class="mx-auto max-w-360 px-5 pt-10 sm:px-8 lg:px-12"
      aria-busy="true"
      aria-label="Opening the case file"
    >
      <USkeleton class="h-[60svh] w-full" />
      <div class="mt-12 grid gap-10 lg:grid-cols-12">
        <div class="space-y-4 lg:col-span-7">
          <USkeleton class="h-10 w-3/4" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-5/6" />
          <USkeleton class="h-4 w-2/3" />
        </div>
        <USkeleton class="h-96 w-full lg:col-span-4 lg:col-start-9" />
      </div>
    </section>

    <!-- Missing -->
    <section
      v-else-if="error || !movie"
      class="mx-auto max-w-360 px-5 py-24 sm:px-8 md:py-40 lg:px-12"
    >
      <p class="eyebrow">
        Case file missing
      </p>
      <h1 class="mt-6 max-w-3xl font-display text-5xl leading-[0.95] font-light sm:text-7xl">
        {{ error?.statusCode === 404 || error?.statusCode === 400
          ? 'This reel was never catalogued.'
          : 'The archive drawer is stuck.' }}
      </h1>
      <p class="mt-6 max-w-lg text-lg text-(--fl-muted)">
        {{ error?.statusCode === 404 || error?.statusCode === 400
          ? 'There\'s no film on file under that number.'
          : 'We couldn\'t reach the archive just now. Try again in a moment.' }}
      </p>
      <UButton
        to="/"
        class="mt-10"
        variant="outline"
        color="neutral"
        label="Back to the Compass"
      />
    </section>

    <article v-else>
      <!-- Hero: graded backdrop, title plate -->
      <header class="relative isolate flex min-h-[min(78svh,52rem)] items-end overflow-hidden">
        <div
          class="absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <NuxtImg
            v-if="movie.backdrop_path"
            provider="tmdb"
            :src="movie.backdrop_path"
            alt=""
            width="1280"
            height="720"
            densities="x1"
            preload
            class="size-full scale-[1.03] object-cover brightness-[0.8] contrast-[1.05] saturate-[0.7] sepia-[0.35]"
          />
          <!-- Colour grade: warm the highlights, push the shadows toward the page. -->
          <div class="absolute inset-0 bg-(--color-amber-800)/25 mix-blend-soft-light" />
          <div class="absolute inset-0 bg-linear-to-t from-(--fl-bg) via-(--fl-bg)/55 to-(--fl-bg)/10" />
          <div class="absolute inset-0 bg-linear-to-r from-(--fl-bg)/85 via-(--fl-bg)/25 to-transparent" />
        </div>

        <!-- Registration marks, as on an archive print. -->
        <div
          class="pointer-events-none absolute inset-5 sm:inset-8 lg:inset-12"
          aria-hidden="true"
        >
          <span class="absolute top-0 left-0 size-5 border-t border-l border-(--fl-text)/30" />
          <span class="absolute top-0 right-0 size-5 border-t border-r border-(--fl-text)/30" />
          <span class="absolute bottom-0 left-0 size-5 border-b border-l border-(--fl-text)/30" />
          <span class="absolute right-0 bottom-0 size-5 border-r border-b border-(--fl-text)/30" />
        </div>

        <div class="fl-rise mx-auto w-full max-w-360 px-5 pt-40 pb-14 sm:px-8 md:pb-20 lg:px-12">
          <p class="eyebrow tabular-nums">
            Dossier<template v-if="year">
              &middot; {{ year }}
            </template><template v-if="movie.genres.length">
              &middot; {{ movie.genres.slice(0, 3).map(g => g.name).join(' / ') }}
            </template>
          </p>
          <h1 class="mt-5 max-w-5xl font-display text-6xl leading-[0.92] font-light text-balance sm:text-7xl lg:text-8xl xl:text-9xl">
            {{ movie.title }}
          </h1>
          <p
            v-if="directors.length"
            class="mt-6 text-lg text-(--fl-muted)"
          >
            <span class="font-display italic">a film by</span>&nbsp;<span class="text-(--fl-text)">{{ directors.join(' & ') }}</span>
          </p>
          <div class="mt-10 flex flex-wrap items-center gap-4">
            <DossierTrailer
              v-if="trailer"
              :trailer="trailer"
              :title="movie.title"
            />
            <p
              v-else
              class="text-xs tracking-[0.18em] text-(--fl-dim) uppercase"
            >
              No official trailer on file
            </p>
            <UButton
              to="#watch-heading"
              label="Where to watch"
              icon="i-lucide-tv"
              size="lg"
              color="neutral"
              variant="outline"
            />
            <JournalLogButton :movie="movie" />
          </div>
        </div>
      </header>

      <!-- Tagline, synopsis, case file -->
      <section class="mx-auto grid max-w-360 gap-14 px-5 pt-6 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div class="lg:col-span-7">
          <blockquote
            v-if="movie.tagline"
            class="relative border-l-2 border-(--fl-accent) pl-6 sm:pl-10"
          >
            <span
              class="absolute -top-6 left-3 font-display text-8xl leading-none text-(--fl-accent)/25 sm:left-6"
              aria-hidden="true"
            >“</span>
            <p class="relative font-display text-3xl leading-tight font-light text-balance italic sm:text-4xl lg:text-5xl">
              {{ movie.tagline }}
            </p>
          </blockquote>

          <h2 class="mt-16 eyebrow">
            Summary of the case
          </h2>
          <p class="mt-5 max-w-2xl text-lg leading-relaxed text-(--fl-text)/90 first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:leading-[0.8] first-letter:text-(--fl-accent)">
            {{ movie.overview || 'No synopsis has been filed for this film.' }}
          </p>

          <ul
            v-if="movie.production_companies.length"
            class="mt-10 flex flex-wrap gap-x-6 gap-y-2"
            aria-label="Production companies"
          >
            <li
              v-for="company in movie.production_companies.slice(0, 4)"
              :key="company.id"
              class="eyebrow text-(--fl-dim)"
            >
              {{ company.name }}
            </li>
          </ul>
        </div>

        <DossierCaseFile
          :movie="movie"
          class="relative z-10 lg:col-span-4 lg:col-start-9 lg:-mt-32"
        />
      </section>

      <!-- Where to watch -->
      <section
        aria-labelledby="watch-heading"
        class="mx-auto mt-28 grid max-w-360 gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:px-12"
      >
        <div class="lg:col-span-4">
          <p class="eyebrow">
            Screenings
          </p>
          <h2
            id="watch-heading"
            class="mt-3 scroll-mt-24 font-display text-4xl font-light text-balance sm:text-5xl"
          >
            Where to watch it tonight
          </h2>
          <p class="mt-4 max-w-sm text-sm text-(--fl-muted)">
            Official services showing {{ movie.title }} where you are. Each logo opens the full list of offers.
          </p>
        </div>
        <DossierWhereToWatch
          :movie-id="movie.id"
          :title="movie.title"
          class="lg:col-span-8"
        />
      </section>

      <!-- Cast -->
      <section
        v-if="movie.credits.cast.length"
        aria-labelledby="cast-heading"
        class="mx-auto mt-28 max-w-360 px-5 sm:px-8 lg:px-12"
      >
        <div class="flex items-end justify-between gap-6 border-b border-(--fl-line) pb-6">
          <div>
            <p class="eyebrow">
              Persons of interest
            </p>
            <h2
              id="cast-heading"
              class="mt-3 font-display text-4xl font-light sm:text-5xl"
            >
              The cast
            </h2>
          </div>
          <p class="hidden text-xs text-(--fl-dim) sm:block">
            Scroll sideways &rarr;
          </p>
        </div>
        <DossierCastStrip
          :cast="movie.credits.cast"
          class="mt-8"
        />
      </section>

      <!-- Double Feature -->
      <section
        v-if="stub"
        aria-labelledby="double-heading"
        class="mx-auto mt-28 max-w-360 px-5 sm:px-8 lg:px-12"
      >
        <div class="border-b border-(--fl-line) pb-6">
          <p class="eyebrow">
            Double feature
          </p>
          <h2
            id="double-heading"
            class="mt-3 font-display text-4xl font-light sm:text-5xl"
          >
            And for the second half of the evening
          </h2>
        </div>
        <DossierDoubleFeature
          :film="stub"
          class="mt-10"
        />
      </section>

      <!-- Constellation -->
      <section
        ref="constellationAnchor"
        aria-labelledby="constellation-heading"
        class="mx-auto mt-28 max-w-360 px-5 sm:px-8 lg:px-12"
      >
        <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="eyebrow">
              Constellation
            </p>
            <h2
              id="constellation-heading"
              class="mt-3 font-display text-4xl font-light sm:text-5xl"
            >
              Where these people meet again
            </h2>
          </div>
          <p class="max-w-sm text-sm text-(--fl-muted)">
            The director and four leads, and the films that connect them. Select any star to follow it.
          </p>
        </div>
        <div class="mt-10">
          <ClientOnly>
            <LazyDossierConstellation
              v-if="showConstellation"
              :movie-id="movie.id"
            />
            <div
              v-else
              class="aspect-3/2 border border-(--fl-line)"
            />
            <template #fallback>
              <div class="aspect-3/2 border border-(--fl-line)" />
            </template>
          </ClientOnly>
        </div>
      </section>
    </article>
  </div>
</template>
