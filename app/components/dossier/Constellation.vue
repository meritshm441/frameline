<script setup lang="ts">
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3'
import type { Simulation, SimulationNodeDatum } from 'd3'
import type { Constellation } from '#shared/types/dossier'

/**
 * Constellation: a force-directed star chart with this film at the centre,
 * five of its people around it, and the other films they connect to.
 *
 * D3 only runs the physics (d3-force); Vue renders the SVG from the node
 * positions, so the nodes are ordinary links that work with the keyboard,
 * middle-click and screen readers. Nodes can be dragged; a drag never
 * counts as a click. Under prefers-reduced-motion the layout is computed
 * up front and drawn still. The list underneath carries the same
 * information as text. Client-only: the dossier lazy-loads this component
 * (and with it, D3) when the reader scrolls near it.
 */
const props = defineProps<{ movieId: number }>()

const { data, status, error, refresh } = useFetch<Constellation>(
  () => `/api/movie/${props.movieId}/constellation`,
  { key: computed(() => `constellation-${props.movieId}`), lazy: true, server: false }
)

type GraphNode = Constellation['nodes'][number] & SimulationNodeDatum
interface GraphLink {
  source: GraphNode
  target: GraphNode
}

/** Collision radius per kind, in viewBox units. Films are 30×45 posters, the centre 72×108. */
const RADIUS: Record<GraphNode['kind'], number> = { centre: 70, person: 40, film: 30 }
const WIDE = { width: 960, height: 640 }
const NARROW = { width: 560, height: 780 }

const container = useTemplateRef<HTMLDivElement>('container')
const svg = useTemplateRef<SVGSVGElement>('svg')
const size = ref(WIDE)
const nodes = shallowRef<GraphNode[]>([])
const links = shallowRef<GraphLink[]>([])
const active = ref<string | null>(null)
const clipId = useId()
let simulation: Simulation<GraphNode, GraphLink> | undefined

function build(graph: Constellation) {
  simulation?.stop()
  size.value = (container.value?.clientWidth ?? WIDE.width) < 640 ? NARROW : WIDE
  const { width, height } = size.value
  const cx = width / 2
  const cy = height / 2

  // Seed a sensible starting layout (people on a ring, films beyond their
  // person) so the graph settles quickly and the same way every time.
  const people = graph.nodes.filter(n => n.kind === 'person').map(n => n.key)
  const angleOf = (personKey: string) => (people.indexOf(personKey) / people.length) * Math.PI * 2 - Math.PI / 2
  const firstPerson = (key: string) => graph.links.find(l => l.target === key)?.source ?? people[0]!

  const graphNodes: GraphNode[] = graph.nodes.map((node, i) => {
    if (node.kind === 'centre') return { ...node, x: cx, y: cy, fx: cx, fy: cy }
    const ring = node.kind === 'person' ? 150 : 270
    const angle = angleOf(node.kind === 'person' ? node.key : firstPerson(node.key))
      + (node.kind === 'film' ? ((i % 3) - 1) * 0.35 : 0)
    return { ...node, x: cx + Math.cos(angle) * ring, y: cy + Math.sin(angle) * ring }
  })
  const byKey = new Map(graphNodes.map(n => [n.key, n]))
  const graphLinks: GraphLink[] = graph.links
    .map(l => ({ source: byKey.get(l.source)!, target: byKey.get(l.target)! }))
    .filter(l => l.source && l.target)

  nodes.value = graphNodes
  links.value = graphLinks

  const pad = 40
  const onTick = () => {
    for (const n of graphNodes) {
      n.x = Math.max(pad, Math.min(width - pad, n.x ?? cx))
      n.y = Math.max(pad, Math.min(height - pad, n.y ?? cy))
    }
    triggerRef(nodes)
  }

  simulation = forceSimulation(graphNodes)
    .force('link', forceLink<GraphNode, GraphLink>(graphLinks)
      .distance(l => (l.source.kind === 'centre' ? 150 : 100))
      .strength(l => (l.source.kind === 'centre' ? 0.8 : 0.5)))
    .force('charge', forceManyBody<GraphNode>().strength(n => (n.kind === 'film' ? -180 : -480)))
    .force('collide', forceCollide<GraphNode>(n => RADIUS[n.kind]))
    .force('x', forceX<GraphNode>(cx).strength(0.03))
    .force('y', forceY<GraphNode>(cy).strength(0.05))
    .on('tick', onTick)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    simulation.stop()
    simulation.tick(300)
    onTick()
  }
}

watch(data, (graph) => {
  if (graph) nextTick(() => build(graph))
}, { immediate: true })
onBeforeUnmount(() => simulation?.stop())

/* --- Highlighting ------------------------------------------------------- */

const neighbours = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const { source, target } of links.value) {
    map.set(source.key, (map.get(source.key) ?? new Set()).add(target.key))
    map.set(target.key, (map.get(target.key) ?? new Set()).add(source.key))
  }
  return map
})

function isLit(key: string) {
  return !active.value || active.value === key || Boolean(neighbours.value.get(active.value)?.has(key))
}

const caption = computed(() => {
  // Read `active` before the lookup so it's tracked even while `nodes` is empty.
  const key = active.value
  const node = nodes.value.find(n => n.key === key)
  if (!node) return null
  const linked = [...(neighbours.value.get(node.key) ?? [])]
    .map(key => nodes.value.find(n => n.key === key))
    .filter(n => n?.kind === 'person')
    .map(n => (n as Extract<GraphNode, { kind: 'person' }>).name)

  if (node.kind === 'person') {
    const films = (neighbours.value.get(node.key)?.size ?? 1) - 1
    return {
      title: node.name,
      detail: node.role === 'Director' ? 'Director' : `as ${node.role}`,
      note: films ? `Leads to ${films} other ${films === 1 ? 'film' : 'films'} here` : null
    }
  }
  return {
    title: node.title,
    detail: node.year,
    note: node.kind === 'centre' ? 'The film on file' : `With ${linked.join(', ')}`
  }
})

/* --- Navigation and dragging --------------------------------------------- */

function hrefOf(node: GraphNode) {
  return node.kind === 'person' ? `/person/${node.id}` : `/movie/${node.id}`
}

function labelOf(node: GraphNode) {
  return node.kind === 'person'
    ? `${node.name}, ${node.role === 'Director' ? 'director' : `as ${node.role}`}`
    : `${node.title}${node.year ? ` (${node.year})` : ''}`
}

let drag: { node: GraphNode, x: number, y: number, moved: boolean } | null = null
let suppressClick = false

function toSvgPoint(event: PointerEvent) {
  const matrix = svg.value?.getScreenCTM()
  return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null
}

function onPointerDown(event: PointerEvent, node: GraphNode) {
  if (event.button !== 0) return
  suppressClick = false
  drag = { node, x: event.clientX, y: event.clientY, moved: false }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  // A few pixels of wobble is still a click.
  if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return
  if (!drag.moved) {
    drag.moved = true
    simulation?.alphaTarget(0.2).restart()
  }
  const point = toSvgPoint(event)
  if (point) {
    drag.node.fx = point.x
    drag.node.fy = point.y
  }
}

function onPointerUp() {
  if (drag?.moved) {
    suppressClick = true
    drag.node.fx = null
    drag.node.fy = null
    simulation?.alphaTarget(0)
  }
  drag = null
}

function onClick(event: MouseEvent, node: GraphNode) {
  // Let modified clicks open a new tab as usual.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (suppressClick) {
    suppressClick = false
    return
  }
  navigateTo(hrefOf(node))
}

/* --- Text index ---------------------------------------------------------- */

const index = computed(() => {
  const graph = data.value
  if (!graph) return []
  const byKey = new Map(graph.nodes.map(n => [n.key, n]))
  return graph.nodes.flatMap((person) => {
    if (person.kind !== 'person') return []
    const films = graph.links
      .filter(l => l.source === person.key && l.target !== `film-${props.movieId}`)
      .map(l => byKey.get(l.target))
      .filter(n => n?.kind === 'film')
      .map(n => n as Extract<Constellation['nodes'][number], { kind: 'film' }>)
    return [{ person, films }]
  })
})

const hasFilms = computed(() => nodes.value.some(n => n.kind === 'film'))

function truncate(text: string, max = 26) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
</script>

<template>
  <div ref="container">
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="grid aspect-3/2 place-items-center border border-(--fl-line)"
      aria-busy="true"
      aria-label="Charting the constellation"
    >
      <p class="font-display text-xl text-(--fl-muted) italic">
        Charting the constellation…
      </p>
    </div>

    <div
      v-else-if="error"
      class="border border-dashed border-(--fl-line) p-10 text-center"
    >
      <p class="font-display text-2xl font-light">
        The night sky is overcast. We couldn't chart this one.
      </p>
      <UButton
        class="mt-6"
        label="Try again"
        color="neutral"
        variant="outline"
        @click="() => refresh()"
      />
    </div>

    <p
      v-else-if="data && !data.nodes.some(n => n.kind === 'film')"
      class="border border-dashed border-(--fl-line) p-10 text-center font-display text-2xl font-light text-(--fl-muted) italic"
    >
      Too little on record to chart this film's connections.
    </p>

    <template v-else-if="hasFilms">
      <figure class="relative border border-(--fl-line) bg-(--fl-surface) bg-[radial-gradient(var(--fl-line)_1px,transparent_1px)] bg-size-[28px_28px]">
        <figcaption
          class="pointer-events-none absolute top-4 left-4 max-w-[60%] sm:top-6 sm:left-6"
          aria-live="polite"
        >
          <template v-if="caption">
            <span class="block font-display text-xl leading-tight sm:text-2xl">{{ caption.title }}</span>
            <span class="mt-1 block eyebrow tabular-nums">{{ caption.detail }}</span>
            <span
              v-if="caption.note"
              class="mt-2 block text-xs text-(--fl-muted)"
            >{{ caption.note }}</span>
          </template>
          <span
            v-else
            class="block text-xs text-(--fl-dim)"
          >Hover or focus a star to read it. Drag to rearrange.</span>
        </figcaption>

        <svg
          ref="svg"
          :viewBox="`0 0 ${size.width} ${size.height}`"
          class="block h-auto w-full select-none"
          role="group"
          aria-label="Constellation graph of this film's people and their other films"
        >
          <defs>
            <clipPath
              :id="clipId"
              clipPathUnits="objectBoundingBox"
            >
              <circle
                cx="0.5"
                cy="0.5"
                r="0.5"
              />
            </clipPath>
          </defs>

          <!-- Star-chart rings -->
          <g
            class="fill-none stroke-(--fl-line)"
            stroke-dasharray="2 6"
            aria-hidden="true"
          >
            <circle
              :cx="size.width / 2"
              :cy="size.height / 2"
              r="150"
            />
            <circle
              :cx="size.width / 2"
              :cy="size.height / 2"
              r="270"
            />
          </g>

          <g aria-hidden="true">
            <line
              v-for="link in links"
              :key="`${link.source.key}>${link.target.key}`"
              :x1="link.source.x"
              :y1="link.source.y"
              :x2="link.target.x"
              :y2="link.target.y"
              class="transition-[stroke,opacity] duration-500"
              :class="active && (link.source.key === active || link.target.key === active)
                ? 'stroke-(--fl-accent)'
                : 'stroke-(--fl-muted)'"
              :stroke-opacity="!active ? 0.35 : link.source.key === active || link.target.key === active ? 0.9 : 0.08"
              :stroke-width="link.source.kind === 'centre' ? 1.25 : 0.75"
            />
          </g>

          <template
            v-for="node in nodes"
            :key="node.key"
          >
            <!-- The film on file: fixed at the centre, not a link. -->
            <g
              v-if="node.kind === 'centre'"
              :transform="`translate(${node.x},${node.y})`"
              @pointerenter="active = node.key"
              @pointerleave="active = null"
            >
              <rect
                x="-40"
                y="-58"
                width="80"
                height="116"
                class="fill-(--fl-bg) stroke-(--fl-accent)"
              />
              <image
                v-if="node.poster_path"
                :href="tmdbImageUrl(node.poster_path, 'w154') ?? undefined"
                x="-36"
                y="-54"
                width="72"
                height="108"
                preserveAspectRatio="xMidYMid slice"
              />
              <title>{{ labelOf(node) }}</title>
            </g>

            <a
              v-else
              :href="hrefOf(node)"
              :aria-label="labelOf(node)"
              :transform="`translate(${node.x},${node.y})`"
              class="cursor-grab touch-none outline-none active:cursor-grabbing"
              :class="['transition-opacity duration-500', isLit(node.key) ? 'opacity-100' : 'opacity-25']"
              draggable="false"
              @click="onClick($event, node)"
              @pointerdown="onPointerDown($event, node)"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @pointerenter="active = node.key"
              @pointerleave="active = null"
              @focus="active = node.key"
              @blur="active = null"
              @dragstart.prevent
            >
              <template v-if="node.kind === 'person'">
                <circle
                  r="26"
                  class="fill-(--fl-raised) stroke-[1.5]"
                  :class="active === node.key ? 'stroke-(--fl-accent)' : 'stroke-(--fl-line)'"
                />
                <image
                  v-if="node.profile_path"
                  :href="tmdbImageUrl(node.profile_path, 'w185') ?? undefined"
                  x="-24"
                  y="-24"
                  width="48"
                  height="48"
                  preserveAspectRatio="xMidYMid slice"
                  :clip-path="`url(#${clipId})`"
                  class="grayscale"
                />
                <text
                  y="44"
                  text-anchor="middle"
                  class="fill-(--fl-text) stroke-(--fl-bg) font-display text-[13px] [paint-order:stroke]"
                  stroke-width="4"
                >{{ node.name }}</text>
              </template>

              <template v-else>
                <rect
                  x="-16"
                  y="-24"
                  width="32"
                  height="48"
                  class="fill-(--fl-raised)"
                  :class="active === node.key ? 'stroke-(--fl-accent)' : 'stroke-(--fl-line)'"
                />
                <image
                  v-if="node.poster_path"
                  :href="tmdbImageUrl(node.poster_path, 'w92') ?? undefined"
                  x="-15"
                  y="-23"
                  width="30"
                  height="46"
                  preserveAspectRatio="xMidYMid slice"
                />
                <text
                  v-if="active === node.key"
                  y="38"
                  text-anchor="middle"
                  class="fill-(--fl-accent) stroke-(--fl-bg) font-display text-[12px] italic [paint-order:stroke]"
                  stroke-width="4"
                >{{ truncate(node.title) }}</text>
              </template>
              <!-- Focus ring drawn in SVG, since outlines don't follow SVG shapes. -->
              <circle
                v-if="active === node.key"
                :r="node.kind === 'person' ? 32 : 34"
                class="pointer-events-none fill-none stroke-(--fl-accent)"
                stroke-dasharray="3 3"
              />
            </a>
          </template>
        </svg>
      </figure>

      <div class="mt-10">
        <h3 class="eyebrow">
          The constellation, as an index
        </h3>
        <ul class="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          <li
            v-for="entry in index"
            :key="entry.person.key"
          >
            <NuxtLink
              :to="`/person/${entry.person.id}`"
              class="font-display text-lg transition-colors duration-500 hover:text-(--fl-accent)"
            >
              {{ entry.person.name }}
            </NuxtLink>
            <ul class="mt-2 space-y-1">
              <li
                v-for="film in entry.films"
                :key="film.id"
                class="text-sm"
              >
                <NuxtLink
                  :to="`/movie/${film.id}`"
                  class="text-(--fl-muted) transition-colors duration-500 hover:text-(--fl-text)"
                >
                  {{ film.title }}<span
                    v-if="film.year"
                    class="text-(--fl-dim) tabular-nums"
                  > ({{ film.year }})</span>
                </NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
