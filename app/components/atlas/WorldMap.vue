<script setup lang="ts">
import { geoArea, geoEqualEarth, geoGraticule10, geoPath, select, zoom, zoomIdentity } from 'd3'
import type { ZoomBehavior, ZoomTransform } from 'd3'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { feature } from 'topojson-client'
import { historicCountry, MAP_COUNTRIES, MARKER_COUNTRIES, UNNUMBERED_COUNTRIES } from '#shared/utils/atlas'

/**
 * The Atlas map: Natural Earth's 1:110m countries on an Equal Earth
 * projection (honest about Africa's size), drawn like an engraved plate.
 *
 * D3 does the geography (projection, paths) and the zoom maths; Vue renders
 * the SVG. Gestures are cooperative so the page still scrolls: a plain
 * scroll wheel passes through (Ctrl/⌘ + wheel or a trackpad pinch zooms),
 * one finger scrolls the page and two fingers move the map. Mouse drag pans.
 * Choosing a country flies to it, off-centre to leave room for the drawer.
 *
 * Client-only, and lazy: the map data (~100 KB) and D3 load with it. The
 * map is pointer-first; keyboard and screen-reader users choose countries
 * from the finder and the travel log on the page, which open the same drawer.
 */
const props = defineProps<{
  selected: string | null
  visited: ReadonlySet<string>
}>()

const emit = defineEmits<{ select: [code: string] }>()

type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>

interface CountryShape {
  key: string
  /** Null for the few shapes TMDB has no code for (e.g. Somaliland); drawn but inert. */
  code: string | null
  name: string
  feature: CountryFeature
  /** The largest landmass, so France flies to France and not to French Guiana. */
  mainland: Feature<Polygon>
}

/** Matches the drawer's `sm:max-w-md`, so a flight centres the country in the space that's left. */
const DRAWER_WIDTH = 448
const MAX_ZOOM = 8
const MAX_FLIGHT_ZOOM = 3
const PAD = 24
const OCEANS: readonly { name: string, lonLat: [number, number] }[] = [
  { name: 'Atlantic Ocean', lonLat: [-38, 28] },
  { name: 'Pacific Ocean', lonLat: [-125, -32] },
  { name: 'Indian Ocean', lonLat: [78, -22] }
]

const container = useTemplateRef<HTMLDivElement>('container')
const svg = useTemplateRef<SVGSVGElement>('svg')
const size = ref({ width: 0, height: 0 })
const shapes = shallowRef<CountryShape[]>([])
const failed = ref(false)
const transform = shallowRef<ZoomTransform>(zoomIdentity)
/** What the pointer is over: a country shape or a city-state marker. */
const hovered = ref<Pick<CountryShape, 'key' | 'code' | 'name'> | null>(null)
const hint = ref<string | null>(null)
const patternId = useId()

let behavior: ZoomBehavior<SVGSVGElement, unknown> | undefined
let resizeObserver: ResizeObserver | undefined
let hintTimer: ReturnType<typeof setTimeout> | undefined

function mainlandOf(f: CountryFeature): Feature<Polygon> {
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const largest = polygons
    .map(coordinates => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates } }))
    .sort((a, b) => geoArea(b) - geoArea(a))[0]!
  return largest
}

async function loadShapes() {
  try {
    const topology = (await import('world-atlas/countries-110m.json')).default as unknown as Topology<{
      countries: GeometryCollection<{ name: string }>
    }>
    const collection = feature(topology, topology.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>
    shapes.value = collection.features
      // Antarctica: no national cinema, and a fifth of the map's height.
      .filter(f => f.id !== '010')
      .map((f, i) => {
        const entry = f.id ? MAP_COUNTRIES[String(f.id)] : undefined
        const code = entry?.[0] ?? UNNUMBERED_COUNTRIES[f.properties.name] ?? null
        return {
          key: String(f.id ?? `unnumbered-${i}`),
          code,
          name: entry?.[1] ?? f.properties.name,
          feature: f,
          mainland: mainlandOf(f)
        }
      })
  } catch {
    failed.value = true
  }
}

/* --- Geography ----------------------------------------------------------- */

const projection = computed(() => {
  const p = geoEqualEarth()
  const { width, height } = size.value
  if (shapes.value.length && width && height) {
    p.fitExtent([[PAD, PAD], [width - PAD, height - PAD]], {
      type: 'FeatureCollection',
      features: shapes.value.map(s => s.feature)
    })
  }
  return p
})

const path = computed(() => geoPath(projection.value))
const outline = computed(() => path.value({ type: 'Sphere' }) ?? '')
const graticule = computed(() => path.value(geoGraticule10()) ?? '')
const countries = computed(() => shapes.value.map(s => ({ ...s, d: path.value(s.feature) ?? '' })))

/** Successor states lit up when a historic country (e.g. the Soviet Union) is open. */
const successors = computed(() => new Set(props.selected ? historicCountry(props.selected)?.successors ?? [] : []))

/** Labels and markers are drawn outside the zoomed layer so they keep their size. */
function onScreen(lonLat: [number, number]) {
  const point = projection.value(lonLat)
  return point ? transform.value.apply(point) : null
}

const oceans = computed(() => OCEANS.map(o => ({ ...o, at: onScreen(o.lonLat) })))
const markers = computed(() => MARKER_COUNTRIES.map(m => ({ ...m, at: onScreen(m.lonLat) })))

function fillOf(code: string | null) {
  if (!code) return 'var(--map-inert)'
  if (code === props.selected) return 'var(--color-amber-400)'
  if (props.visited.has(code)) return `url(#${patternId})`
  return 'var(--map-land)'
}

/* --- Zoom and flight ----------------------------------------------------- */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform)

function showHint(text: string) {
  hint.value = text
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (hint.value = null), 1600)
}

function setUpZoom() {
  if (!svg.value) return
  behavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, MAX_ZOOM])
    .filter((event: Event) => {
      if (event instanceof WheelEvent) {
        // Trackpad pinches arrive as wheel events with ctrlKey set.
        if (event.ctrlKey || event.metaKey) return true
        showHint(`Hold ${isMac() ? '⌘' : 'Ctrl'} and scroll to zoom the map`)
        return false
      }
      if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) return event.touches.length > 1
      return !(event as MouseEvent).button
    })
    .on('zoom', (event: { transform: ZoomTransform }) => {
      transform.value = event.transform
    })
  select(svg.value).call(behavior)
}

function syncExtent() {
  const { width, height } = size.value
  behavior?.extent([[0, 0], [width, height]]).translateExtent([[0, 0], [width, height]])
}

function animateTo(target: ZoomTransform, duration = 1400) {
  if (!svg.value || !behavior) return
  const selection = select(svg.value)
  if (reducedMotion()) selection.call(behavior.transform, target)
  else selection.transition().duration(duration).call(behavior.transform, target)
}

function flyTo(code: string) {
  const codes = historicCountry(code)?.successors ?? [code]
  const targets = shapes.value.filter(s => s.code && codes.includes(s.code))
  const { width, height } = size.value
  const marker = MARKER_COUNTRIES.find(m => m.code === code)
  const available = width >= 768 ? width - DRAWER_WIDTH : width

  let box: [[number, number], [number, number]] | null = null
  if (targets.length) {
    box = targets
      .map(s => path.value.bounds(s.mainland))
      .reduce((a, b) => [[Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])], [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])]])
  } else if (marker) {
    const point = projection.value(marker.lonLat)
    // A notional 40px box around a city-state, so it lands at a sensible zoom.
    if (point) box = [[point[0] - 20, point[1] - 20], [point[0] + 20, point[1] + 20]]
  }
  if (!box || !width) return

  const [[x0, y0], [x1, y1]] = box
  const k = Math.max(1, Math.min(MAX_FLIGHT_ZOOM, 0.45 / Math.max((x1 - x0) / available, (y1 - y0) / height)))
  animateTo(zoomIdentity
    .translate(available / 2, height / 2)
    .scale(k)
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2))
}

function zoomBy(factor: number) {
  if (!svg.value || !behavior) return
  const selection = select(svg.value)
  if (reducedMotion()) behavior.scaleBy(selection, factor)
  else behavior.scaleBy(selection.transition().duration(500), factor)
}

function resetView() {
  animateTo(zoomIdentity, 900)
}

/* --- Lifecycle ----------------------------------------------------------- */

onMounted(async () => {
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return
    size.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  if (container.value) resizeObserver.observe(container.value)
  await loadShapes()
  await nextTick()
  setUpZoom()
  syncExtent()
  if (props.selected) flyTo(props.selected)
})

watch(size, syncExtent)
watch(() => props.selected, (code) => {
  if (code) flyTo(code)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearTimeout(hintTimer)
  if (svg.value) select(svg.value).on('.zoom', null).interrupt()
})

const caption = computed(() => {
  const shape = hovered.value
  if (!shape) return null
  if (!shape.code) return { title: shape.name, note: 'Not in the film archive' }
  return {
    title: shape.name,
    note: shape.code === props.selected ? 'Open now' : props.visited.has(shape.code) ? 'Stamped in your passport' : 'Not yet visited'
  }
})
</script>

<template>
  <div
    ref="container"
    class="relative size-full overflow-hidden [--map-land-hover:color-mix(in_oklab,var(--color-amber-400)_30%,var(--map-land))] [--map-inert:#221e19] [--map-land:#2e2922] [--map-sea:#110f0d]"
  >
    <p
      v-if="failed"
      class="absolute inset-0 grid place-items-center p-8 text-center font-display text-2xl text-(--fl-muted) italic"
    >
      The map plates are missing. You can still choose a country from the finder.
    </p>

    <svg
      v-else
      ref="svg"
      :width="size.width"
      :height="size.height"
      class="block size-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      role="img"
      aria-label="World map of film-making countries. Countries you have visited are hatched in amber."
    >
      <defs>
        <pattern
          :id="patternId"
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
          :patternTransform="`rotate(45) scale(${1 / transform.k})`"
        >
          <rect
            width="5"
            height="5"
            fill="var(--map-land)"
          />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="5"
            stroke="var(--color-amber-400)"
            stroke-width="2"
            stroke-opacity="0.65"
          />
        </pattern>
      </defs>

      <g :transform="transform.toString()">
        <path
          :d="outline"
          class="fill-(--map-sea) stroke-(--fl-line)"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="graticule"
          class="fill-none stroke-(--fl-line)"
          stroke-dasharray="1 3"
          stroke-width="0.6"
          vector-effect="non-scaling-stroke"
        />
        <path
          v-for="country in countries"
          :key="country.key"
          :d="country.d"
          :fill="fillOf(country.code)"
          class="stroke-(--fl-bg) transition-[fill,fill-opacity] duration-500"
          :class="[
            country.code ? 'cursor-pointer' : 'cursor-default',
            hovered?.key === country.key && country.code && country.code !== selected && 'fill-(--map-land-hover)'
          ]"
          stroke-width="0.6"
          vector-effect="non-scaling-stroke"
          @pointerenter="hovered = country"
          @pointerleave="hovered = null"
          @click="country.code && emit('select', country.code)"
        />
        <!-- A historic state's successors, outlined together. -->
        <path
          v-for="country in countries.filter(c => c.code && successors.has(c.code))"
          :key="`successor-${country.key}`"
          :d="country.d"
          class="pointer-events-none fill-(--color-amber-400)/15 stroke-(--color-amber-400)"
          stroke-dasharray="3 2"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <g
        aria-hidden="true"
        class="pointer-events-none"
      >
        <template
          v-for="ocean in oceans"
          :key="ocean.name"
        >
          <text
            v-if="ocean.at"
            :x="ocean.at[0]"
            :y="ocean.at[1]"
            text-anchor="middle"
            class="fill-(--fl-dim) font-display text-[11px] tracking-[0.35em] uppercase italic sm:text-[13px]"
          >{{ ocean.name }}</text>
        </template>
      </g>

      <template
        v-for="marker in markers"
        :key="marker.code"
      >
        <g
          v-if="marker.at"
          :transform="`translate(${marker.at[0]},${marker.at[1]})`"
          class="cursor-pointer"
          @pointerenter="hovered = { key: marker.code, code: marker.code, name: marker.name }"
          @pointerleave="hovered = null"
          @click="emit('select', marker.code)"
        >
          <!-- Generous invisible hit area around a tiny dot. -->
          <circle
            r="10"
            fill="transparent"
          />
          <circle
            r="3.5"
            :fill="marker.code === selected ? 'var(--color-amber-400)' : visited.has(marker.code) ? 'var(--color-amber-600)' : 'var(--fl-muted)'"
            class="stroke-(--fl-bg)"
            stroke-width="1.5"
          />
        </g>
      </template>
    </svg>

    <!-- Hover caption -->
    <div
      class="pointer-events-none absolute bottom-5 left-5 hidden min-h-12 sm:block lg:bottom-8 lg:left-12"
      aria-hidden="true"
    >
      <template v-if="caption">
        <p class="font-display text-2xl leading-tight">
          {{ caption.title }}
        </p>
        <p class="mt-1 eyebrow">
          {{ caption.note }}
        </p>
      </template>
    </div>

    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-700"
    >
      <p
        v-if="hint"
        class="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 bg-(--fl-bg)/85 px-5 py-3 text-sm text-(--fl-text) ring-1 ring-(--fl-line)"
        role="status"
      >
        {{ hint }}
      </p>
    </Transition>

    <div
      v-if="!failed"
      class="absolute right-5 bottom-5 flex flex-col border border-(--fl-line) bg-(--fl-bg)/80 backdrop-blur-sm lg:right-12 lg:bottom-8"
    >
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        aria-label="Zoom in"
        @click="zoomBy(1.6)"
      />
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="ghost"
        aria-label="Zoom out"
        class="border-t border-(--fl-line)"
        @click="zoomBy(1 / 1.6)"
      />
      <UButton
        icon="i-lucide-globe"
        color="neutral"
        variant="ghost"
        aria-label="Show the whole world"
        class="border-t border-(--fl-line)"
        @click="resetView"
      />
    </div>
  </div>
</template>
