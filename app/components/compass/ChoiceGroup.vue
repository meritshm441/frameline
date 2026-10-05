<script setup lang="ts" generic="T extends string">
import type { CompassOption } from '~/composables/useCompass'

/** A row of radio "tiles". Native radios underneath, so arrow keys and screen readers just work. */
const props = defineProps<{
  legend: string
  name: string
  options: readonly CompassOption<T>[]
}>()

const model = defineModel<T>({ required: true })

const columns = computed(() => props.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')
</script>

<template>
  <fieldset>
    <legend class="eyebrow">
      {{ legend }}
    </legend>
    <div
      class="mt-4 grid gap-px border border-(--fl-line) bg-(--fl-line)"
      :class="columns"
    >
      <label
        v-for="option in options"
        :key="option.value"
        class="group relative cursor-pointer bg-(--fl-bg) px-3 py-3 transition-colors sm:px-4 duration-500 hover:bg-(--fl-surface) has-checked:bg-(--fl-surface) has-focus-visible:z-10 has-focus-visible:outline-2 has-focus-visible:outline-(--fl-accent)"
      >
        <input
          v-model="model"
          type="radio"
          class="peer sr-only"
          :name="name"
          :value="option.value"
        >
        <span
          class="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-(--fl-accent) transition-transform duration-700 ease-(--ease-projector) peer-checked:scale-x-100"
          aria-hidden="true"
        />
        <span class="block font-display text-lg transition-colors duration-500 peer-checked:text-(--fl-accent)">
          {{ option.label }}
        </span>
        <span class="mt-0.5 block text-xs text-(--fl-muted)">
          {{ option.hint }}
        </span>
      </label>
    </div>
  </fieldset>
</template>
