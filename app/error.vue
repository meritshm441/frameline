<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => (is404.value ? 'Reel not found' : 'Projector fault')
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <NuxtLayout>
      <section class="mx-auto max-w-360 px-5 py-24 sm:px-8 md:py-40 lg:px-12">
        <p class="eyebrow tabular-nums">
          Error {{ error.statusCode }}
        </p>
        <h1 class="mt-6 max-w-3xl font-display text-6xl leading-[0.95] font-light sm:text-8xl">
          {{ is404 ? 'This reel was never catalogued.' : 'The projector has jammed.' }}
        </h1>
        <p class="mt-8 max-w-lg text-lg text-(--fl-muted)">
          {{ is404
            ? 'The page you were looking for isn\'t in the archive.'
            : 'Something went wrong on our side. Give it a moment and try again.' }}
        </p>
        <UButton
          class="mt-10"
          variant="outline"
          color="neutral"
          label="Return to the Compass"
          @click="goHome"
        />
      </section>
    </NuxtLayout>
  </UApp>
</template>
