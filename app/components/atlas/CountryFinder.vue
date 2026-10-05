<script setup lang="ts">
import { countryName, HISTORIC_COUNTRIES, MAP_COUNTRIES, MARKER_COUNTRIES, UNNUMBERED_COUNTRIES } from '#shared/utils/atlas'

/**
 * Search box for every country the Atlas knows, including the ones too
 * small for the map and the ones that no longer exist. This is also how
 * keyboard and screen-reader users travel, since the map itself is drawn
 * for pointers.
 */
const props = defineProps<{ selected: string | null }>()
const emit = defineEmits<{ select: [code: string] }>()

interface CountryItem {
  label: string
  value: string
  suffix?: string
}

const byName = (a: CountryItem, b: CountryItem) => a.label.localeCompare(b.label, 'en')

const items: CountryItem[][] = [
  [
    ...Object.values(MAP_COUNTRIES).map(([code]) => code),
    ...Object.values(UNNUMBERED_COUNTRIES),
    ...MARKER_COUNTRIES.map(m => m.code)
  ].map(code => ({ label: countryName(code), value: code })).sort(byName),
  HISTORIC_COUNTRIES.map(h => ({ label: h.name, value: h.code, suffix: h.years })).sort(byName)
]

const model = computed({
  get: () => props.selected ?? undefined,
  set: (code: string | undefined) => {
    if (code) emit('select', code)
  }
})
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    value-key="value"
    :search-input="{ placeholder: 'Type a country…', icon: 'i-lucide-search' }"
    placeholder="Find a country"
    icon="i-lucide-map-pin"
    color="neutral"
    variant="outline"
    size="lg"
    aria-label="Find a country"
    class="w-full bg-(--fl-bg)/80 backdrop-blur-sm"
    :ui="{
      base: 'rounded-none',
      content: 'rounded-none bg-(--fl-surface) ring-(--fl-line)',
      item: 'rounded-none',
      itemLabel: 'font-display text-base',
      separator: 'bg-(--fl-line)'
    }"
  >
    <template #item-trailing="{ item }">
      <span
        v-if="item.suffix"
        class="text-xs text-(--fl-dim) tabular-nums"
      >{{ item.suffix }}</span>
    </template>
  </USelectMenu>
</template>
