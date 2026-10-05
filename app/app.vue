<script setup lang="ts">
const { enabled: atmosphere } = useAtmosphere()

useHead({
  htmlAttrs: {
    class: () => (atmosphere.value ? 'dark' : 'dark fl-fx-off')
  }
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} · Frameline` : 'Frameline: a cinematic atlas'),
  description: 'Wander film history by mood, place, time, colour and connection.',
  ogSiteName: 'Frameline',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp :tooltip="{ delayDuration: 400 }">
    <NuxtLoadingIndicator
      color="var(--fl-accent)"
      :height="2"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
