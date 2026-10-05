<script setup lang="ts">
// Interim page so search results have a destination. The full dossier is Phase 3.
const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: movie, status, error } = useMovie(id)

const year = computed(() => movie.value?.release_date?.slice(0, 4) ?? null)
const ogImage = useTmdbImage(() => movie.value?.backdrop_path, 'w1280')

useSeoMeta({
  title: () => movie.value?.title ?? 'Film',
  ogTitle: () => (movie.value ? `${movie.value.title}${year.value ? ` (${year.value})` : ''} · Frameline` : 'Frameline'),
  description: () => movie.value?.overview || 'A film in the Frameline archive.',
  ogDescription: () => movie.value?.overview || 'A film in the Frameline archive.',
  ogImage: () => ogImage.value ?? undefined
})
</script>

<template>
  <section class="mx-auto max-w-360 px-5 pt-12 sm:px-8 md:pt-20 lg:px-12">
    <div
      v-if="status === 'pending'"
      class="grid gap-10 md:grid-cols-12"
      aria-busy="true"
      aria-label="Loading film"
    >
      <USkeleton class="aspect-2/3 w-full md:col-span-4" />
      <div class="space-y-4 md:col-span-7 md:col-start-6">
        <USkeleton class="h-3 w-24" />
        <USkeleton class="h-16 w-3/4" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-5/6" />
      </div>
    </div>

    <div
      v-else-if="error || !movie"
      class="py-24 text-center"
    >
      <p class="eyebrow">
        Case file missing
      </p>
      <p class="mt-4 font-display text-4xl">
        We couldn't find that reel.
      </p>
      <UButton
        to="/"
        class="mt-8"
        variant="outline"
        color="neutral"
        label="Back to the Compass"
      />
    </div>

    <article
      v-else
      class="fl-rise grid gap-10 md:grid-cols-12"
    >
      <div class="md:col-span-4">
        <NuxtImg
          v-if="movie.poster_path"
          provider="tmdb"
          :src="movie.poster_path"
          :alt="`Poster for ${movie.title}`"
          width="500"
          height="750"
          sizes="100vw md:33vw"
          class="aspect-2/3 w-full object-cover"
        />
      </div>
      <div class="md:col-span-7 md:col-start-6">
        <p class="eyebrow tabular-nums">
          {{ year }}<template v-if="movie.runtime">
            &middot; {{ movie.runtime }} min
          </template>
        </p>
        <h1 class="mt-4 font-display text-5xl leading-none font-light text-balance sm:text-7xl">
          {{ movie.title }}
        </h1>
        <p
          v-if="movie.tagline"
          class="mt-6 font-display text-xl text-(--fl-accent) italic"
        >
          “{{ movie.tagline }}”
        </p>
        <p class="mt-8 max-w-2xl leading-relaxed text-(--fl-muted)">
          {{ movie.overview }}
        </p>
        <p class="mt-10 text-xs text-(--fl-dim)">
          The full dossier arrives in Phase 3.
        </p>
      </div>
    </article>
  </section>
</template>
