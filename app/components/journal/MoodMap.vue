<script setup lang="ts">
import type { MoodQuadrant } from '#shared/types/compass'
import { QUADRANT_LABELS } from '#shared/utils/compass'

/**
 * The Compass dial in miniature, with each corner (and the centre) shaded by
 * how many logged films fall there. The favourite is outlined in amber.
 */
const props = defineProps<{
  moods: Record<MoodQuadrant, number>
  favourite: MoodQuadrant | null
}>()

const CELLS: readonly { quadrant: Exclude<MoodQuadrant, 'centre'>, x: number, y: number }[] = [
  { quadrant: 'light-intense', x: 0, y: 0 },
  { quadrant: 'heavy-intense', x: 50, y: 0 },
  { quadrant: 'light-calm', x: 0, y: 50 },
  { quadrant: 'heavy-calm', x: 50, y: 50 }
]

const max = computed(() => Math.max(1, ...Object.values(props.moods)))
const shade = (q: MoodQuadrant) => (props.moods[q] ? 0.12 + 0.6 * (props.moods[q] / max.value) : 0)
</script>

<template>
  <div>
    <div class="relative mx-auto aspect-square w-full max-w-44">
      <svg
        viewBox="0 0 100 100"
        class="size-full overflow-visible"
        aria-hidden="true"
      >
        <rect
          v-for="cell in CELLS"
          :key="cell.quadrant"
          :x="cell.x + 0.5"
          :y="cell.y + 0.5"
          width="49"
          height="49"
          fill="var(--fl-accent)"
          :fill-opacity="shade(cell.quadrant)"
          :stroke="cell.quadrant === favourite ? 'var(--fl-accent)' : 'var(--fl-line)'"
          :stroke-width="cell.quadrant === favourite ? 1.5 : 1"
        />
        <circle
          cx="50"
          cy="50"
          r="10"
          fill="var(--fl-bg)"
          :stroke="favourite === 'centre' ? 'var(--fl-accent)' : 'var(--fl-line)'"
          :stroke-width="favourite === 'centre' ? 1.5 : 1"
        />
        <circle
          cx="50"
          cy="50"
          r="10"
          fill="var(--fl-accent)"
          :fill-opacity="shade('centre')"
        />
        <text
          v-for="cell in CELLS"
          :key="`n-${cell.quadrant}`"
          :x="cell.x + 25"
          :y="cell.y + 29"
          text-anchor="middle"
          class="fill-(--fl-text) font-display text-[11px] tabular-nums"
        >{{ moods[cell.quadrant] || '' }}</text>
      </svg>
      <span class="absolute top-1/2 -left-1 -translate-x-full -translate-y-1/2 text-[0.6rem] tracking-[0.18em] text-(--fl-dim) uppercase">Light</span>
      <span class="absolute top-1/2 -right-1 translate-x-full -translate-y-1/2 text-[0.6rem] tracking-[0.18em] text-(--fl-dim) uppercase">Heavy</span>
      <span class="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[0.6rem] tracking-[0.18em] text-(--fl-dim) uppercase">Intense</span>
      <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full text-[0.6rem] tracking-[0.18em] text-(--fl-dim) uppercase">Calm</span>
    </div>
    <ul class="sr-only">
      <li
        v-for="(label, quadrant) in QUADRANT_LABELS"
        :key="quadrant"
      >
        {{ label }}: {{ moods[quadrant] }} {{ moods[quadrant] === 1 ? 'film' : 'films' }}
      </li>
    </ul>
  </div>
</template>
