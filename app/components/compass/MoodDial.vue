<script setup lang="ts">
import type { MoodPoint, MoodQuadrant } from '#shared/types/compass'
import { clampAxis, moodQuadrant, quantizeAxis } from '#shared/utils/compass'

/**
 * A 2D mood dial. Drag (or click) anywhere on the plane to place the point;
 * on release it settles into the nearest detent (0.25 steps, matching what the
 * API resolves) and emits `commit`.
 *
 * Keyboard and assistive tech use two visually hidden native range inputs, one
 * per axis. Arrow keys always mean the same thing on either of them:
 * left/right for Light/Heavy, up/down for Calm/Intense.
 */
const model = defineModel<MoodPoint>({ required: true })
const emit = defineEmits<{ commit: [point: MoodPoint] }>()

const STEP = 0.25
/** Keyboard nudges wait this long before fetching, so holding an arrow doesn't fire a request per step. */
const KEY_COMMIT_DELAY = 450

const plane = useTemplateRef<HTMLDivElement>('plane')
const xInput = useTemplateRef<HTMLInputElement>('xInput')
const dragging = ref(false)
const focused = ref(false)

const quadrant = computed(() => moodQuadrant(model.value))
const left = computed(() => `${((model.value.x + 1) / 2) * 100}%`)
const top = computed(() => `${((1 - model.value.y) / 2) * 100}%`)

const CORNERS: { quadrant: MoodQuadrant, label: string, position: string }[] = [
  { quadrant: 'light-intense', label: 'Thrills', position: 'top-3 left-3' },
  { quadrant: 'heavy-intense', label: 'White-knuckle', position: 'top-3 right-3 text-right' },
  { quadrant: 'light-calm', label: 'Gentle', position: 'bottom-3 left-3' },
  { quadrant: 'heavy-calm', label: 'Slow burn', position: 'bottom-3 right-3 text-right' }
]

/** Detent positions, as percentages, for tick marks along each edge. */
const TICKS = Array.from({ length: 9 }, (_, i) => i * 12.5)

function describe(value: number, negative: string, positive: string): string {
  const magnitude = Math.abs(value)
  const word = value < 0 ? negative : positive
  if (magnitude < STEP / 2) return 'Balanced'
  if (magnitude >= 0.75) return `Very ${word.toLowerCase()}`
  if (magnitude >= 0.375) return word
  return `Slightly ${word.toLowerCase()}`
}

const xText = computed(() => describe(model.value.x, 'Light', 'Heavy'))
const yText = computed(() => describe(model.value.y, 'Calm', 'Intense'))

/* -- Pointer --------------------------------------------------------------- */

function pointFromEvent(event: PointerEvent): MoodPoint | null {
  const rect = plane.value?.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return null
  return {
    x: clampAxis(((event.clientX - rect.left) / rect.width) * 2 - 1),
    y: clampAxis(1 - ((event.clientY - rect.top) / rect.height) * 2)
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const point = pointFromEvent(event)
  if (!point) return
  event.preventDefault()
  dragging.value = true
  plane.value?.setPointerCapture(event.pointerId)
  model.value = point
  // Move focus onto the dial so keyboard nudges continue from here.
  xInput.value?.focus({ preventScroll: true })
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const point = pointFromEvent(event)
  if (point) model.value = point
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  commit()
}

/* -- Keyboard / assistive tech -------------------------------------------- */

let commitTimer: ReturnType<typeof setTimeout> | undefined

function commit() {
  clearTimeout(commitTimer)
  const snapped = { x: quantizeAxis(model.value.x), y: quantizeAxis(model.value.y) }
  model.value = snapped
  emit('commit', snapped)
}

function scheduleCommit() {
  clearTimeout(commitTimer)
  commitTimer = setTimeout(commit, KEY_COMMIT_DELAY)
}

onBeforeUnmount(() => clearTimeout(commitTimer))

const KEY_MOVES: Record<string, MoodPoint> = {
  ArrowLeft: { x: -STEP, y: 0 },
  ArrowRight: { x: STEP, y: 0 },
  ArrowUp: { x: 0, y: STEP },
  ArrowDown: { x: 0, y: -STEP }
}

function onKeydown(event: KeyboardEvent) {
  const move = KEY_MOVES[event.key]
  if (event.key === 'Home') {
    event.preventDefault()
    model.value = { x: 0, y: 0 }
    scheduleCommit()
    return
  }
  if (!move) return
  event.preventDefault()
  focused.value = true
  model.value = {
    x: clampAxis(quantizeAxis(model.value.x) + move.x),
    y: clampAxis(quantizeAxis(model.value.y) + move.y)
  }
  scheduleCommit()
}

/** Only ring the point for keyboard focus, not when a click moved focus here. */
function onFocus(event: FocusEvent) {
  focused.value = (event.target as HTMLElement).matches(':focus-visible')
}

/** Screen-reader gestures (e.g. swipe up on iOS) change the range value directly. */
function onRangeInput(axis: keyof MoodPoint, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  model.value = { ...model.value, [axis]: clampAxis(value) }
  scheduleCommit()
}
</script>

<template>
  <div
    role="group"
    aria-labelledby="mood-dial-label"
    class="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] items-center gap-3 select-none"
  >
    <p
      id="mood-dial-label"
      class="sr-only"
    >
      Mood dial. Arrow keys move the point; Home returns to the centre.
    </p>

    <!-- Axis labels -->
    <span
      class="col-start-2 justify-self-center eyebrow"
      aria-hidden="true"
    >Intense</span>
    <span
      class="row-start-2 eyebrow [writing-mode:vertical-rl] rotate-180"
      aria-hidden="true"
    >Light</span>
    <span
      class="col-start-3 row-start-2 eyebrow [writing-mode:vertical-rl]"
      aria-hidden="true"
    >Heavy</span>
    <span
      class="col-start-2 row-start-3 justify-self-center eyebrow"
      aria-hidden="true"
    >Calm</span>

    <div
      ref="plane"
      class="relative col-start-2 row-start-2 aspect-square w-full cursor-crosshair touch-none border border-(--fl-line) bg-(--fl-surface)/60"
      :class="dragging && 'cursor-grabbing'"
      :style="{
        backgroundImage: `radial-gradient(circle at ${left} ${top}, color-mix(in oklab, var(--fl-accent) 16%, transparent), transparent 42%)`
      }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @lostpointercapture="onPointerUp"
    >
      <!-- Compass rose: rings, crosshair, detent ticks. Decorative. -->
      <svg
        class="pointer-events-none absolute inset-0 size-full text-(--fl-line)"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-width="0.5"
        >
          <circle
            cx="100"
            cy="100"
            r="25"
          />
          <circle
            cx="100"
            cy="100"
            r="50"
            stroke-dasharray="1 3"
          />
          <circle
            cx="100"
            cy="100"
            r="75"
          />
          <circle
            cx="100"
            cy="100"
            r="99"
            stroke-dasharray="1 3"
          />
          <line
            x1="100"
            y1="0"
            x2="100"
            y2="200"
          />
          <line
            x1="0"
            y1="100"
            x2="200"
            y2="100"
          />
        </g>
      </svg>
      <div
        class="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <span
          v-for="tick in TICKS"
          :key="`t${tick}`"
          class="absolute top-0 h-2 w-px bg-(--fl-dim)/60"
          :style="{ left: `${tick}%` }"
        />
        <span
          v-for="tick in TICKS"
          :key="`l${tick}`"
          class="absolute left-0 h-px w-2 bg-(--fl-dim)/60"
          :style="{ top: `${tick}%` }"
        />
      </div>

      <!-- Corner names; the active one lights up. -->
      <span
        v-for="corner in CORNERS"
        :key="corner.quadrant"
        class="pointer-events-none absolute font-display text-sm italic transition-colors duration-700 sm:text-base"
        :class="[corner.position, quadrant === corner.quadrant ? 'text-(--fl-accent)' : 'text-(--fl-dim)']"
        aria-hidden="true"
      >{{ corner.label }}</span>

      <!-- Guides that follow the point -->
      <span
        class="pointer-events-none absolute inset-y-0 w-px bg-(--fl-accent)/25"
        :class="!dragging && 'transition-[left] duration-500 ease-(--ease-projector)'"
        :style="{ left }"
        aria-hidden="true"
      />
      <span
        class="pointer-events-none absolute inset-x-0 h-px bg-(--fl-accent)/25"
        :class="!dragging && 'transition-[top] duration-500 ease-(--ease-projector)'"
        :style="{ top }"
        aria-hidden="true"
      />

      <!-- The point -->
      <span
        class="pointer-events-none absolute size-5 -translate-1/2 rounded-full bg-(--fl-accent) shadow-[0_0_0_6px_color-mix(in_oklab,var(--fl-accent)_18%,transparent),0_0_32px_color-mix(in_oklab,var(--fl-accent)_55%,transparent)]"
        :class="[
          !dragging && 'transition-[left,top] duration-500 ease-(--ease-projector)',
          focused && 'outline-2 outline-offset-4 outline-(--fl-text)'
        ]"
        :style="{ left, top }"
        aria-hidden="true"
      />

      <!-- Accessible controls, one per axis -->
      <div class="sr-only">
        <label>
          Light to heavy
          <input
            ref="xInput"
            type="range"
            min="-1"
            max="1"
            :step="STEP"
            :value="model.x"
            :aria-valuetext="xText"
            @keydown="onKeydown"
            @input="onRangeInput('x', $event)"
            @focus="onFocus"
            @blur="focused = false"
          >
        </label>
        <label>
          Calm to intense
          <input
            type="range"
            min="-1"
            max="1"
            :step="STEP"
            :value="model.y"
            :aria-valuetext="yText"
            @keydown="onKeydown"
            @input="onRangeInput('y', $event)"
            @focus="onFocus"
            @blur="focused = false"
          >
        </label>
      </div>
    </div>
  </div>
</template>
