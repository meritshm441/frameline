<script setup lang="ts">
import type { Swatch, WheelPoint } from '#shared/types/spectrum'
import { fromXY, hueName, MONOCHROME, normaliseHue, pointColour, pointName, swatchColour, toXY } from '#shared/utils/spectrum'

/**
 * The colour wheel. Angle is hue, distance from the centre is vividness.
 * Every poster in the pool is plotted as a dot in its own colour, so the
 * wheel doubles as a map of the pool; the posters currently shown are lit.
 *
 * Drag (or click) to move the marker; on release it emits `commit`.
 * Keyboard and assistive tech use two visually hidden native range inputs,
 * one for hue and one for vividness. On either, left/right turn the hue,
 * up/down change vividness, Page Up/Down turn a twelfth of the way round,
 * Home goes to the centre and End to the rim.
 */
const model = defineModel<WheelPoint>({ required: true })
const props = defineProps<{
  dots: readonly { key: string, swatch: Swatch, lit: boolean }[]
}>()
const emit = defineEmits<{ commit: [point: WheelPoint] }>()

const HUE_STEP = 5
const HUE_PAGE = 30
const VIVID_STEP = 0.05
const KEY_COMMIT_DELAY = 450

/** SVG units: the disc has radius R; the hue ring and labels sit outside it. */
const R = 100
const RING_IN = 104
const RING_OUT = 112
const LABEL_R = 124
const VIEW = 136

const surface = useTemplateRef<SVGSVGElement>('surface')
const hueInput = useTemplateRef<HTMLInputElement>('hueInput')
const dragging = ref(false)
const focused = ref(false)

/**
 * A point on the wheel in SVG units, rounded: Node and the browser can
 * disagree in the last digit of a sine, which would break hydration.
 */
function place(point: WheelPoint, radius = R) {
  const { x, y } = toXY(point)
  return { x: Math.round(x * radius * 100) / 100, y: Math.round(y * radius * 100) / 100 }
}

const marker = computed(() => place(model.value))
const markerFill = computed(() => pointColour(model.value))

/** The hue ring, in 72 slightly overlapping slices so no seams show. */
const RING = Array.from({ length: 72 }, (_, i) => {
  const from = i * 5 - 0.4
  const to = i * 5 + 5.4
  const at = (deg: number, r: number) => {
    const { x, y } = place({ hue: deg, vivid: 1 }, r)
    return `${x} ${y}`
  }
  return {
    d: `M ${at(from, RING_IN)} A ${RING_IN} ${RING_IN} 0 0 1 ${at(to, RING_IN)} L ${at(to, RING_OUT)} A ${RING_OUT} ${RING_OUT} 0 0 0 ${at(from, RING_OUT)} Z`,
    fill: pointColour({ hue: i * 5 + 2.5, vivid: 1 }, 0.7)
  }
})

const SPOKES = Array.from({ length: 12 }, (_, i) => place({ hue: i * 30, vivid: 1 }))

const LABELS = [0, 27, 75, 125, 178, 235, 292].map(hue => ({
  name: hueName(hue),
  ...place({ hue, vivid: 1 }, LABEL_R)
}))

/**
 * Dots stay in pool order, so a new one never makes the rest re-render or
 * re-bloom; the lit ones are drawn again on top, larger and outlined.
 */
const placedDots = computed(() => props.dots.map(dot => ({
  ...dot,
  ...place({ hue: dot.swatch.h, vivid: dot.swatch.vivid }),
  fill: swatchColour(dot.swatch)
})))
const litDots = computed(() => placedDots.value.filter(d => d.lit))

const anyLit = computed(() => props.dots.some(d => d.lit))

const hueText = computed(() => `${hueName(model.value.hue)}, ${Math.round(model.value.hue)} degrees`)
const vividText = computed(() => `${Math.round(model.value.vivid * 100)}% vivid: ${pointName(model.value)}`)

/* -- Pointer --------------------------------------------------------------- */

function pointFromEvent(event: PointerEvent): WheelPoint | null {
  const rect = surface.value?.getBoundingClientRect()
  if (!rect?.width) return null
  const scale = rect.width / (VIEW * 2)
  const radius = R * scale
  const x = (event.clientX - (rect.left + rect.width / 2)) / radius
  const y = (event.clientY - (rect.top + rect.height / 2)) / radius
  return fromXY(x, y)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const point = pointFromEvent(event)
  if (!point) return
  event.preventDefault()
  dragging.value = true
  surface.value?.setPointerCapture(event.pointerId)
  model.value = point
  hueInput.value?.focus({ preventScroll: true })
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
  emit('commit', model.value)
}

function scheduleCommit() {
  clearTimeout(commitTimer)
  commitTimer = setTimeout(commit, KEY_COMMIT_DELAY)
}

onBeforeUnmount(() => clearTimeout(commitTimer))

const clampVivid = (v: number) => Math.min(1, Math.max(0, Math.round(v * 100) / 100))
const snapHue = (h: number, step: number) => normaliseHue(Math.round(h / step) * step)

function onKeydown(event: KeyboardEvent) {
  const { hue, vivid } = model.value
  let next: WheelPoint | null = null
  switch (event.key) {
    case 'ArrowLeft': next = { hue: snapHue(hue - HUE_STEP, HUE_STEP), vivid }
      break
    case 'ArrowRight': next = { hue: snapHue(hue + HUE_STEP, HUE_STEP), vivid }
      break
    case 'PageDown': next = { hue: snapHue(hue - HUE_PAGE, HUE_STEP), vivid }
      break
    case 'PageUp': next = { hue: snapHue(hue + HUE_PAGE, HUE_STEP), vivid }
      break
    case 'ArrowUp': next = { hue, vivid: clampVivid(vivid + VIVID_STEP) }
      break
    case 'ArrowDown': next = { hue, vivid: clampVivid(vivid - VIVID_STEP) }
      break
    case 'Home': next = { hue, vivid: 0 }
      break
    case 'End': next = { hue, vivid: 1 }
      break
  }
  if (!next) return
  event.preventDefault()
  focused.value = true
  model.value = next
  scheduleCommit()
}

/** Only ring the marker for keyboard focus, not when a click moved focus here. */
function onFocus(event: FocusEvent) {
  focused.value = (event.target as HTMLElement).matches(':focus-visible')
}

/** Screen-reader gestures change the range value directly. */
function onHueInput(event: Event) {
  model.value = { ...model.value, hue: normaliseHue(Number((event.target as HTMLInputElement).value)) }
  scheduleCommit()
}

function onVividInput(event: Event) {
  model.value = { ...model.value, vivid: clampVivid(Number((event.target as HTMLInputElement).value) / 100) }
  scheduleCommit()
}
</script>

<template>
  <div
    role="group"
    aria-labelledby="colour-wheel-label"
    class="relative select-none"
  >
    <p
      id="colour-wheel-label"
      class="sr-only"
    >
      Colour wheel. Left and right arrows turn the hue, up and down change how vivid it is. Home goes to black and white.
    </p>

    <svg
      ref="surface"
      :viewBox="`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`"
      class="block aspect-square w-full touch-none overflow-visible"
      :class="dragging ? 'cursor-grabbing' : 'cursor-crosshair'"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @lostpointercapture="onPointerUp"
    >
      <!-- Disc, guides, and the black-and-white centre -->
      <circle
        :r="R"
        class="fill-(--fl-surface)/70"
      />
      <g
        fill="none"
        class="stroke-(--fl-line)"
        stroke-width="0.5"
      >
        <line
          v-for="(s, i) in SPOKES"
          :key="i"
          x1="0"
          y1="0"
          :x2="s.x"
          :y2="s.y"
          stroke-dasharray="1 3"
        />
        <circle :r="R * 0.4" />
        <circle
          :r="R * 0.7"
          stroke-dasharray="1 3"
        />
        <circle :r="R" />
      </g>
      <circle
        :r="R * MONOCHROME"
        fill="none"
        class="stroke-(--fl-dim)/60"
        stroke-width="0.6"
        stroke-dasharray="2 2"
      />

      <!-- The hue ring -->
      <path
        v-for="(slice, i) in RING"
        :key="i"
        :d="slice.d"
        :fill="slice.fill"
      />

      <!-- Hue names, outside the ring. Hidden on phones, where they'd be unreadably small. -->
      <g class="hidden fill-(--fl-muted) font-display text-[7px] italic sm:inline">
        <text
          v-for="label in LABELS"
          :key="label.name"
          :x="label.x"
          :y="label.y"
          text-anchor="middle"
          dominant-baseline="middle"
        >{{ label.name }}</text>
      </g>

      <!-- Every poster in the pool, where its colour falls -->
      <g
        class="transition-opacity duration-500"
        :class="anyLit && 'opacity-50'"
      >
        <circle
          v-for="dot in placedDots"
          :key="dot.key"
          :cx="dot.x"
          :cy="dot.y"
          r="2.2"
          :fill="dot.fill"
          stroke-width="0.4"
          class="fl-bloom stroke-black/60"
        />
      </g>
      <g>
        <circle
          v-for="dot in litDots"
          :key="dot.key"
          :cx="dot.x"
          :cy="dot.y"
          r="3.4"
          :fill="dot.fill"
          stroke-width="0.9"
          class="stroke-(--fl-text)"
        />
      </g>

      <!-- The needle and marker -->
      <line
        x1="0"
        y1="0"
        :x2="marker.x"
        :y2="marker.y"
        class="stroke-(--fl-text)/40"
        stroke-width="0.6"
      />
      <circle
        r="1.5"
        class="fill-(--fl-text)/60"
      />
      <circle
        v-if="focused"
        :cx="marker.x"
        :cy="marker.y"
        r="11"
        fill="none"
        class="stroke-(--fl-accent)"
        stroke-width="1.2"
      />
      <circle
        :cx="marker.x"
        :cy="marker.y"
        r="7"
        :fill="markerFill"
        class="stroke-(--fl-text)"
        stroke-width="1.6"
      />
    </svg>

    <!-- Accessible controls -->
    <div class="sr-only">
      <label>
        Hue
        <input
          ref="hueInput"
          type="range"
          min="0"
          max="359"
          :step="HUE_STEP"
          :value="Math.round(model.hue)"
          :aria-valuetext="hueText"
          @keydown="onKeydown"
          @input="onHueInput"
          @focus="onFocus"
          @blur="focused = false"
        >
      </label>
      <label>
        Vividness
        <input
          type="range"
          min="0"
          max="100"
          :step="VIVID_STEP * 100"
          :value="Math.round(model.vivid * 100)"
          :aria-valuetext="vividText"
          @keydown="onKeydown"
          @input="onVividInput"
          @focus="onFocus"
          @blur="focused = false"
        >
      </label>
    </div>
  </div>
</template>
