<script setup lang="ts">
import { decadeOfYear } from '#shared/utils/time-machine'

/**
 * A ruler of years, one tick per year, to scrub through by dragging (or
 * tapping) anywhere along it. The model follows the drag, so the page's year
 * and its decade styling change live; `commit` fires on release, and the
 * films are fetched once per gesture.
 *
 * Keyboard and assistive tech use a visually hidden native range input:
 * arrows move a year, Page Up / Page Down a decade, Home / End the ends.
 * The step buttons and the decade index are ordinary buttons.
 */
const props = defineProps<{
  min: number
  max: number
}>()

const model = defineModel<number>({ required: true })
const emit = defineEmits<{ commit: [year: number] }>()

/** Keyboard nudges wait this long before fetching, so holding an arrow doesn't fire a request per year. */
const KEY_COMMIT_DELAY = 450

const ruler = useTemplateRef<HTMLDivElement>('ruler')
const input = useTemplateRef<HTMLInputElement>('input')
const dragging = ref(false)
const focused = ref(false)

const clamp = (year: number) => Math.min(props.max, Math.max(props.min, Math.round(year)))
const percent = (year: number) => ((year - props.min) / (props.max - props.min)) * 100

const years = computed(() => Array.from({ length: props.max - props.min + 1 }, (_, i) => props.min + i))
const decades = computed(() => years.value.filter(y => y % 10 === 0))
const decade = computed(() => decadeOfYear(model.value))

/** The decade's band on the ruler, as left/width percentages. */
const band = computed(() => {
  const end = Math.min(props.max, decade.value + 9)
  // Each year owns the space up to the next tick, except the last one.
  const right = end === props.max ? 100 : percent(end + 1)
  return { left: `${percent(decade.value)}%`, width: `${right - percent(decade.value)}%` }
})

function tickClass(year: number) {
  const inDecade = decadeOfYear(year) === decade.value
  return [
    year % 10 === 0 ? 'h-full' : year % 5 === 0 ? 'h-3/5' : 'h-2/5',
    inDecade ? 'bg-(--fl-accent)/60' : 'bg-(--fl-dim)/50'
  ]
}

/* -- Pointer --------------------------------------------------------------- */

function yearFromEvent(event: PointerEvent): number | null {
  const rect = ruler.value?.getBoundingClientRect()
  if (!rect || !rect.width) return null
  return clamp(props.min + ((event.clientX - rect.left) / rect.width) * (props.max - props.min))
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const year = yearFromEvent(event)
  if (year === null) return
  event.preventDefault()
  dragging.value = true
  ruler.value?.setPointerCapture(event.pointerId)
  model.value = year
  input.value?.focus({ preventScroll: true })
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const year = yearFromEvent(event)
  if (year !== null) model.value = year
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

function jump(year: number) {
  model.value = clamp(year)
  commit()
}

const KEY_MOVES: Record<string, (year: number) => number> = {
  ArrowLeft: y => y - 1,
  ArrowDown: y => y - 1,
  ArrowRight: y => y + 1,
  ArrowUp: y => y + 1,
  PageDown: y => y - 10,
  PageUp: y => y + 10,
  Home: () => props.min,
  End: () => props.max
}

function onKeydown(event: KeyboardEvent) {
  const move = KEY_MOVES[event.key]
  if (!move) return
  event.preventDefault()
  focused.value = true
  model.value = clamp(move(model.value))
  scheduleCommit()
}

/** Only ring the playhead for keyboard focus, not when a drag moved focus here. */
function onFocus(event: FocusEvent) {
  focused.value = (event.target as HTMLElement).matches(':focus-visible')
}

/** Screen-reader gestures (e.g. swipe up on iOS) change the range value directly. */
function onRangeInput(event: Event) {
  model.value = clamp(Number((event.target as HTMLInputElement).value))
  scheduleCommit()
}

const shortDecade = (year: number) => `’${String(year).slice(2)}s`
</script>

<template>
  <div
    role="group"
    aria-labelledby="timeline-label"
    class="select-none"
  >
    <p
      id="timeline-label"
      class="sr-only"
    >
      Timeline. Arrow keys move a year, Page Up and Page Down a decade.
    </p>

    <div class="flex items-stretch gap-2 sm:gap-4">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        class="self-center"
        :disabled="model <= min"
        :aria-label="`Back to ${model - 1}`"
        @click="jump(model - 1)"
      />

      <div
        ref="ruler"
        class="relative h-24 flex-1 cursor-ew-resize touch-pan-y sm:h-28"
        :class="dragging && 'cursor-grabbing'"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onPointerUp"
      >
        <!-- The decade's band -->
        <span
          class="pointer-events-none absolute inset-y-0 bg-(--fl-accent)/[0.06] transition-[left,width] duration-700 ease-(--ease-projector)"
          :style="band"
          aria-hidden="true"
        />

        <!-- Baseline and ticks: one per year, longer every five, full height every ten. -->
        <div
          class="pointer-events-none absolute inset-x-0 top-1/2 h-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <span class="absolute inset-x-0 top-1/2 h-px bg-(--fl-line)" />
          <span
            v-for="year in years"
            :key="year"
            class="absolute top-1/2 w-px -translate-y-1/2 transition-colors duration-700"
            :class="tickClass(year)"
            :style="{ left: `${percent(year)}%` }"
          />
        </div>

        <!-- The playhead -->
        <div
          class="pointer-events-none absolute inset-y-0 -translate-x-1/2"
          :class="!dragging && 'transition-[left] duration-500 ease-(--ease-projector)'"
          :style="{ left: `${percent(model)}%` }"
          aria-hidden="true"
        >
          <span class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-(--fl-accent) shadow-[0_0_14px_var(--fl-accent)]" />
          <!-- The label slides from left- to right-aligned so it never leaves the ruler. -->
          <span
            class="absolute top-0 left-1/2 bg-(--fl-accent) px-1.5 py-0.5 text-[0.65rem] font-semibold text-(--fl-bg) tabular-nums"
            :class="focused && 'outline-2 outline-offset-3 outline-(--fl-text)'"
            :style="{ transform: `translateX(-${percent(model)}%)` }"
          >{{ model }}</span>
          <span class="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-(--fl-accent)" />
        </div>

        <label class="sr-only">
          Year
          <input
            ref="input"
            type="range"
            :min="min"
            :max="max"
            step="1"
            :value="model"
            @keydown="onKeydown"
            @input="onRangeInput"
            @focus="onFocus"
            @blur="focused = false"
          >
        </label>
      </div>

      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        class="self-center"
        :disabled="model >= max"
        :aria-label="`On to ${model + 1}`"
        @click="jump(model + 1)"
      />
    </div>

    <!-- Decade index: jump to the start of any decade. -->
    <nav
      aria-label="Decades"
      class="mt-3 px-10 sm:px-12"
    >
      <ul class="relative h-6">
        <li
          v-for="(start, i) in decades"
          :key="start"
          class="absolute top-0 -translate-x-1/2"
          :class="i % 2 === 1 && 'max-sm:hidden'"
          :style="{ left: `${percent(Math.min(max, start + 5))}%` }"
        >
          <button
            type="button"
            class="px-1 py-0.5 text-xs tracking-wide tabular-nums transition-colors duration-500 hover:text-(--fl-accent)"
            :class="start === decade ? 'text-(--fl-accent)' : 'text-(--fl-dim)'"
            :aria-label="`The ${start}s`"
            :aria-current="start === decade ? 'true' : undefined"
            @click="jump(start)"
          >
            {{ shortDecade(start) }}
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
