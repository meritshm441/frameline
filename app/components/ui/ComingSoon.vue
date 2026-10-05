<script setup lang="ts">
defineProps<{
  /** Small label above the title, e.g. "Wing III". */
  eyebrow: string
  title: string
  lede: string
  phase: number
}>()
</script>

<template>
  <section class="mx-auto grid max-w-360 gap-10 px-5 pt-16 pb-8 sm:px-8 md:grid-cols-12 md:pt-28 lg:px-12">
    <div class="fl-rise md:col-span-8 md:col-start-2">
      <p class="eyebrow">
        {{ eyebrow }}
      </p>
      <h1 class="mt-6 font-display text-6xl leading-[0.95] font-light text-balance sm:text-8xl">
        {{ title }}
      </h1>
      <p class="mt-8 max-w-xl text-lg leading-relaxed text-(--fl-muted)">
        {{ lede }}
      </p>
    </div>
    <div
      class="fl-rise self-end border-l border-(--fl-line) pl-6 [animation-delay:300ms] md:col-span-2 md:col-start-11"
    >
      <p class="eyebrow">
        Status
      </p>
      <p class="mt-2 font-display text-lg italic">
        In the cutting room
      </p>
      <p class="mt-1 text-xs text-(--fl-dim) tabular-nums">
        Phase {{ phase }}
      </p>
    </div>
  </section>
</template>
