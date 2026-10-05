<script setup lang="ts">
import { DECADES, FIRST_DECADE, LAST_DECADE, spanLabel } from '#shared/utils/atlas'

/**
 * Two-thumb decade slider, 1920s to 2020s. Both thumbs on one stop means a
 * single decade. The model follows the drag; `commit` fires on release, so
 * the drawer refetches once per gesture rather than once per stop passed.
 */
const span = defineModel<[number, number]>({ required: true })
const emit = defineEmits<{ commit: [span: [number, number]] }>()

const label = computed(() => {
  const text = spanLabel({ from: span.value[0], to: span.value[1] })
  return text.charAt(0).toUpperCase() + text.slice(1)
})

const shortName = (decade: number) => `’${String(decade).slice(2)}`
</script>

<template>
  <div>
    <p
      class="font-display text-xl italic"
      aria-live="polite"
    >
      {{ label }}
    </p>
    <USlider
      v-model="span"
      :min="FIRST_DECADE"
      :max="LAST_DECADE"
      :step="10"
      :min-steps-between-thumbs="0"
      size="sm"
      class="mt-4"
      aria-label="Decades"
      :ui="{ track: 'rounded-none h-px', range: 'rounded-none', thumb: 'rounded-none size-3.5 ring-(--fl-accent) bg-(--fl-bg)' }"
      @change="emit('commit', span)"
    />
    <!-- Each label sits under its stop; the end labels are pinned to the edges. -->
    <ol
      class="relative mt-3 h-4 text-[0.65rem] text-(--fl-dim) tabular-nums"
      aria-hidden="true"
    >
      <li
        v-for="(decade, i) in DECADES"
        :key="decade"
        class="absolute top-0"
        :style="{ left: `${(i / (DECADES.length - 1)) * 100}%` }"
        :class="[
          i === 0 ? '' : i === DECADES.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
          // Phones: every other decade, or the labels run together.
          i % 2 === 1 && 'max-sm:hidden',
          decade >= span[0] && decade <= span[1] && 'text-(--fl-text)'
        ]"
      >
        {{ decade === FIRST_DECADE || decade === LAST_DECADE ? decade : shortName(decade) }}
      </li>
    </ol>
  </div>
</template>
