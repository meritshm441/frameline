<script setup lang="ts">
useSeoMeta({
  title: null,
  ogTitle: 'Frameline: a cinematic atlas',
  description: 'What kind of night is it? Find three films for tonight by mood, time and company.',
  ogDescription: 'What kind of night is it? Find three films for tonight by mood, time and company.'
})
</script>

<template>
  <UiComingSoon
    eyebrow="The Compass"
    title="What kind of night is it?"
    lede="Drag a point across the compass, from light to heavy, calm to intense, and Frameline will set out three films for tonight's programme."
    :phase="2"
  />
</template>
