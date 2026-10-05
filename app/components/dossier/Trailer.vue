<script setup lang="ts">
import type { Video } from '#shared/types/tmdb'

/**
 * "Watch the trailer" button plus a modal holding the official YouTube embed.
 * The iframe only exists while the modal is open, so closing it stops playback
 * and nothing from YouTube loads until it's asked for. Uses the privacy-enhanced
 * youtube-nocookie.com domain.
 */
const props = defineProps<{
  trailer: Video
  title: string
}>()

const open = ref(false)
const src = computed(() =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(props.trailer.key)}?autoplay=1&rel=0&modestbranding=1`
)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`${title}: official trailer`"
    :description="trailer.name"
    :ui="{
      content: 'sm:max-w-5xl',
      title: 'font-display text-xl font-light',
      description: 'eyebrow',
      body: 'p-0 sm:p-0'
    }"
  >
    <UButton
      label="Watch the trailer"
      icon="i-lucide-play"
      size="lg"
      color="primary"
      variant="solid"
    />

    <template #body>
      <div class="aspect-video w-full bg-black">
        <iframe
          :src="src"
          :title="`${title}: official trailer`"
          class="size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="strict-origin-when-cross-origin"
        />
      </div>
    </template>
  </UModal>
</template>
