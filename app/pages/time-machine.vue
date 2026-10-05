<script setup lang="ts">
useSeoMeta({
  title: 'Time Machine',
  ogTitle: 'Time Machine · Frameline',
  description: 'Choose any year since 1920 and see what was playing, along with the films that outlasted it.',
  ogDescription: 'Choose any year since 1920 and see what was playing, along with the films that outlasted it.'
})
</script>

<template>
  <UiComingSoon
    eyebrow="The Time Machine"
    title="What was playing in 1927?"
    lede="Scrub through a century of release calendars. The room itself changes with each decade: sepia, Technicolor, neon."
    :phase="5"
  />
</template>
