<script setup lang="ts">
import type { DoubleFeatureResponse, FilmStub } from '#shared/types/dossier'

/**
 * Double Feature: one film to programme after this one, set as a two-title
 * bill with the reason underneath. Fetched on the client after the dossier
 * renders, since it costs a handful of TMDB calls on a cold cache.
 */
const props = defineProps<{ film: FilmStub }>()

const { data, status, error, refresh } = useFetch<DoubleFeatureResponse>(
  () => `/api/movie/${props.film.id}/double-feature`,
  { key: computed(() => `double-feature-${props.film.id}`), lazy: true, server: false }
)

const pairing = computed(() => data.value?.pairing ?? null)
</script>

<template>
  <div>
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="grid items-center gap-8 border border-(--fl-line) p-6 md:grid-cols-[1fr_auto_1fr] md:p-10"
      aria-busy="true"
      aria-label="Choosing a second feature"
    >
      <USkeleton class="h-40 w-full" />
      <USkeleton class="mx-auto size-12" />
      <USkeleton class="h-40 w-full" />
    </div>

    <div
      v-else-if="error"
      class="border border-dashed border-(--fl-line) p-10 text-center"
    >
      <p class="font-display text-2xl font-light">
        The second reel didn't arrive.
      </p>
      <UButton
        class="mt-6"
        label="Try again"
        color="neutral"
        variant="outline"
        @click="() => refresh()"
      />
    </div>

    <p
      v-else-if="!pairing"
      class="border border-dashed border-(--fl-line) p-10 text-center font-display text-2xl font-light text-(--fl-muted) italic"
    >
      This one plays best alone. No pairing on file.
    </p>

    <article
      v-else
      class="fl-rise group relative overflow-hidden border border-(--fl-line) bg-(--fl-surface)"
    >
      <NuxtImg
        v-if="pairing.film.backdrop_path"
        provider="tmdb"
        :src="pairing.film.backdrop_path"
        alt=""
        width="780"
        height="439"
        densities="x1"
        loading="lazy"
        class="absolute inset-0 size-full object-cover opacity-20 sepia-[0.5] transition-opacity duration-1000 group-hover:opacity-30"
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-(--fl-surface) via-(--fl-surface)/85 to-(--fl-surface)/40"
        aria-hidden="true"
      />

      <div class="relative grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[auto_auto_auto_1fr] md:gap-10">
        <figure class="hidden w-28 md:block">
          <NuxtImg
            v-if="film.poster_path"
            provider="tmdb"
            :src="film.poster_path"
            alt=""
            width="154"
            height="231"
            sizes="112px"
            loading="lazy"
            class="aspect-2/3 w-full object-cover opacity-80 sepia-[0.3]"
          />
          <figcaption class="mt-2 eyebrow text-[0.6rem]">
            First feature
          </figcaption>
        </figure>

        <p
          class="hidden font-display text-6xl font-light text-(--fl-accent) italic md:block"
          aria-hidden="true"
        >
          &amp;
        </p>

        <figure class="w-36 sm:w-40">
          <NuxtImg
            v-if="pairing.film.poster_path"
            provider="tmdb"
            :src="pairing.film.poster_path"
            :alt="`Poster for ${pairing.film.title}`"
            width="185"
            height="278"
            sizes="160px"
            loading="lazy"
            class="aspect-2/3 w-full object-cover shadow-xl shadow-black/50"
          />
          <figcaption class="mt-2 eyebrow text-[0.6rem]">
            Second feature
          </figcaption>
        </figure>

        <div class="max-w-xl">
          <p class="eyebrow">
            After {{ film.title }}, stay for
          </p>
          <h3 class="mt-3 font-display text-4xl leading-none font-light text-balance sm:text-5xl">
            <NuxtLink
              :to="`/movie/${pairing.film.id}`"
              class="after:absolute after:inset-0 after:content-['']"
            >
              {{ pairing.film.title }}
            </NuxtLink>
          </h3>
          <p class="mt-3 text-sm text-(--fl-muted) tabular-nums">
            {{ pairing.film.year }}<template v-if="pairing.film.director">
              &middot; <span class="font-display italic">directed by</span> {{ pairing.film.director }}
            </template>
          </p>

          <p
            v-if="pairing.shares.length"
            class="mt-6 border-l-2 border-(--fl-accent) pl-4"
          >
            <span class="eyebrow text-(--fl-accent)">Shares</span>
            <span class="mt-1 block font-display text-xl text-(--fl-text) italic">
              {{ pairing.shares.join(', ') }}
            </span>
          </p>

          <p class="mt-5 line-clamp-3 text-sm leading-relaxed text-(--fl-muted)">
            {{ pairing.film.overview }}
          </p>
        </div>
      </div>
    </article>
  </div>
</template>
