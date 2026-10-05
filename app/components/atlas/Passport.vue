<script setup lang="ts">
import type { PassportStamp } from '#shared/types/atlas'
import { countryName } from '#shared/utils/atlas'

/**
 * The travel log: every country visited, as a row of passport stamps, oldest
 * first. Each stamp reopens its country, so this doubles as a keyboard route
 * back to anywhere already visited.
 */
defineProps<{
  stamps: readonly PassportStamp[]
  loaded: boolean
  selected: string | null
}>()

const emit = defineEmits<{ select: [code: string] }>()

const format = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dateOf = (stamp: PassportStamp) => format.format(new Date(stamp.at))

/** Each stamp is tilted a little, by a fixed amount per country, as if inked by hand. */
function tiltOf(code: string) {
  const hash = [...code].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 997, 7)
  return ((hash % 9) - 4) * 1.5
}
</script>

<template>
  <div>
    <p
      v-if="!loaded"
      class="font-display text-xl text-(--fl-dim) italic"
    >
      Opening your passport…
    </p>
    <p
      v-else-if="!stamps.length"
      class="max-w-md font-display text-xl text-(--fl-muted) italic"
    >
      No stamps yet. Choose a country on the map or in the finder, and it will be stamped here.
    </p>
    <ol
      v-else
      class="flex flex-wrap gap-4"
    >
      <li
        v-for="(stamp, i) in stamps"
        :key="stamp.code"
      >
        <button
          type="button"
          class="group block border border-dashed px-4 py-3 text-left transition-colors duration-500 hover:border-(--fl-accent)"
          :class="stamp.code === selected ? 'border-(--fl-accent) bg-(--fl-accent)/10' : 'border-(--fl-line)'"
          :style="{ transform: `rotate(${tiltOf(stamp.code)}deg)` }"
          :aria-current="stamp.code === selected ? 'true' : undefined"
          @click="emit('select', stamp.code)"
        >
          <span class="block eyebrow text-(--fl-accent) tabular-nums">No. {{ String(i + 1).padStart(2, '0') }}</span>
          <span class="mt-1 block font-display text-lg leading-tight group-hover:text-(--fl-accent)">{{ countryName(stamp.code) }}</span>
          <span class="mt-1 block text-[0.65rem] tracking-[0.18em] text-(--fl-dim) uppercase tabular-nums">{{ dateOf(stamp) }}</span>
        </button>
      </li>
    </ol>
  </div>
</template>
