<script setup lang="ts">
const { enabled: atmosphere } = useAtmosphere()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative z-10 mt-32 border-t border-(--fl-line)">
    <div class="mx-auto grid max-w-360 gap-12 px-5 py-16 sm:px-8 md:grid-cols-12 lg:px-12">
      <div class="md:col-span-5">
        <UiWordmark />
        <p class="mt-5 max-w-sm font-display text-xl leading-snug text-(--fl-muted) italic">
          A cinematic atlas. Wander film history by mood, place, time, colour and connection.
        </p>
      </div>

      <nav
        aria-label="Footer"
        class="md:col-span-3 md:col-start-7"
      >
        <p class="eyebrow">
          Wings
        </p>
        <ul class="mt-4 space-y-2">
          <li
            v-for="section in NAV_SECTIONS"
            :key="section.to"
          >
            <NuxtLink
              :to="section.to"
              class="text-sm text-(--fl-text) transition-colors duration-500 hover:text-(--fl-accent)"
            >
              {{ section.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="md:col-span-3">
        <p class="eyebrow">
          Projection
        </p>
        <USwitch
          v-model="atmosphere"
          class="mt-4"
          label="Film grain & vignette"
          description="Turn off for a cleaner, flatter image."
          :ui="{ label: 'text-sm text-(--fl-text) font-normal', description: 'text-xs text-(--fl-muted)' }"
        />
      </div>
    </div>

    <div class="border-t border-(--fl-line)">
      <div class="mx-auto flex max-w-360 flex-col gap-3 px-5 py-6 text-xs text-(--fl-muted) sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <p>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-1 underline decoration-(--fl-line) underline-offset-4 transition-colors hover:text-(--fl-text) hover:decoration-(--fl-accent)"
          >
            themoviedb.org<span class="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <p class="tabular-nums">
          Frameline &middot; {{ year }}
        </p>
      </div>
    </div>
  </footer>
</template>
