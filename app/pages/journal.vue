<script setup lang="ts">
import type { JournalEntry } from '#shared/types/journal'
import { journalStats } from '#shared/utils/journal'

const { entries, loaded, unsaved, remove, restore, clear, exportFile, importFile } = useJournal()
const { stamps } = usePassport()
const toast = useToast()

const stats = computed(() => journalStats(entries.value, stamps.value.map(s => s.code)))

/** Stub numbers run oldest first, like a roll of tickets, whatever order they're shown in. */
const serials = computed(() => {
  const byAge = [...entries.value].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  return new Map(byAge.map((e, i) => [e.id, i + 1]))
})

/** Stubs grouped by the month they were watched, newest first. */
const months = computed(() => {
  const format = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const groups: { key: string, label: string, entries: JournalEntry[] }[] = []
  for (const entry of entries.value) {
    const key = entry.watchedOn.slice(0, 7)
    let group = groups.at(-1)
    if (group?.key !== key) {
      group = { key, label: format.format(new Date(`${key}-01T00:00:00Z`)), entries: [] }
      groups.push(group)
    }
    group.entries.push(entry)
  }
  return groups
})

/* Logging and editing ------------------------------------------------- */

const dialogOpen = ref(false)
const editing = ref<JournalEntry | null>(null)

function logFilm() {
  editing.value = null
  dialogOpen.value = true
}

function edit(entry: JournalEntry) {
  editing.value = entry
  dialogOpen.value = true
}

function saved(entry: JournalEntry, mode: 'new' | 'edit') {
  toast.add({
    title: mode === 'new' ? 'Stub kept' : 'Stub rewritten',
    description: `${entry.film.title}, row ${entry.seat.charAt(0)}, seat ${entry.seat.slice(1)}.`,
    icon: 'i-lucide-ticket'
  })
}

/* Tearing up, with undo ----------------------------------------------- */

const stubsHeading = useTemplateRef<HTMLElement>('stubsHeading')

function tearUp(entry: JournalEntry) {
  const removed = remove(entry.id)
  if (!removed) return
  // The button that was focused has gone; land on the list's heading instead of the top of the page.
  stubsHeading.value?.focus()
  toast.add({
    title: 'Stub torn up',
    description: removed.film.title,
    icon: 'i-lucide-scissors',
    actions: [{
      label: 'Undo',
      color: 'neutral',
      variant: 'outline',
      onClick: () => restore(removed)
    }]
  })
}

/* Export and import --------------------------------------------------- */

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const importing = ref(false)

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importing.value = true
  try {
    const { added, skipped, invalid } = await importFile(file)
    const notes = [
      skipped ? `${skipped} already here` : '',
      invalid ? `${invalid} couldn’t be read` : ''
    ].filter(Boolean).join(', ')
    toast.add({
      title: added ? `${added} ${added === 1 ? 'stub' : 'stubs'} added` : 'Nothing new to add',
      description: notes ? `${notes.charAt(0).toUpperCase()}${notes.slice(1)}.` : undefined,
      icon: 'i-lucide-download'
    })
  } catch (error) {
    toast.add({
      title: 'Import failed',
      description: error instanceof JournalImportError ? error.message : 'That file couldn’t be opened.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    importing.value = false
  }
}

/* Clearing, confirmed inline (as with the Atlas passport) -------------- */

const confirmingClear = ref(false)
const clearControls = useTemplateRef<HTMLDivElement>('clearControls')

async function setConfirming(value: boolean) {
  confirmingClear.value = value
  await nextTick()
  clearControls.value?.querySelector<HTMLButtonElement>(value ? '[data-keep]' : 'button')?.focus()
}

function clearJournal() {
  clear()
  confirmingClear.value = false
}

useSeoMeta({
  title: 'Journal',
  ogTitle: 'Reel Journal · Frameline',
  description: 'A personal watch log kept as ticket stubs. No account needed.',
  ogDescription: 'A personal watch log kept as ticket stubs. No account needed.'
})
</script>

<template>
  <div>
    <section
      aria-labelledby="journal-heading"
      class="mx-auto grid max-w-360 gap-10 px-5 pt-10 sm:px-8 md:pt-16 lg:grid-cols-12 lg:px-12"
    >
      <div class="fl-rise lg:col-span-7">
        <p class="eyebrow">
          The Reel Journal
        </p>
        <h1
          id="journal-heading"
          class="mt-6 font-display text-6xl leading-[0.95] font-light text-balance sm:text-8xl"
        >
          Keep the stub.
        </h1>
        <p class="mt-8 max-w-xl text-lg leading-relaxed text-(--fl-muted)">
          Every film you log becomes a ticket stub with the date, a seat, your rating and a line to remember it by. It stays in this browser and is yours to export.
        </p>
      </div>

      <div class="fl-rise flex flex-col justify-end gap-3 [animation-delay:200ms] lg:col-span-4 lg:col-start-9">
        <UButton
          label="Log a film"
          icon="i-lucide-plus"
          size="lg"
          class="justify-center"
          @click="logFilm"
        />
        <div class="grid grid-cols-2 gap-3">
          <UButton
            label="Export"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            class="justify-center"
            :disabled="!loaded || !entries.length"
            @click="exportFile"
          />
          <UButton
            label="Import"
            icon="i-lucide-upload"
            color="neutral"
            variant="outline"
            class="justify-center"
            :loading="importing"
            :disabled="!loaded"
            @click="fileInput?.click()"
          />
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          aria-hidden="true"
          tabindex="-1"
          @change="onImport"
        >
        <p class="text-xs leading-relaxed text-(--fl-dim)">
          Export saves a JSON file you can import here, or in another browser. Importing adds to this journal and never overwrites it.
        </p>
      </div>
    </section>

    <div
      v-if="unsaved"
      class="mx-auto mt-10 max-w-360 px-5 sm:px-8 lg:px-12"
      role="alert"
    >
      <p class="flex items-start gap-3 border border-(--color-red-400)/40 bg-(--color-red-950)/30 px-4 py-3 text-sm text-(--fl-text)">
        <UIcon
          name="i-lucide-circle-alert"
          class="mt-0.5 size-4 shrink-0 text-(--color-red-300)"
        />
        This browser isn't letting Frameline save, so the journal will be lost when the tab closes. Export it to keep a copy.
      </p>
    </div>

    <!-- Stats -->
    <section
      aria-labelledby="stats-heading"
      class="mx-auto mt-20 max-w-360 px-5 sm:px-8 md:mt-28 lg:px-12"
    >
      <h2
        id="stats-heading"
        class="sr-only"
      >
        Your journal in numbers
      </h2>
      <JournalStats
        v-if="loaded"
        :stats="stats"
      />
      <div
        v-else
        class="grid gap-8 border-y border-(--fl-line) py-8 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
        aria-label="Opening your journal"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="space-y-4"
        >
          <USkeleton class="h-3 w-24" />
          <USkeleton class="h-16 w-20" />
          <USkeleton class="h-4 w-3/4" />
        </div>
      </div>
    </section>

    <!-- Stubs -->
    <section
      aria-labelledby="stubs-heading"
      class="mx-auto mt-24 max-w-360 px-5 sm:px-8 lg:px-12"
    >
      <div class="flex flex-col gap-4 border-b border-(--fl-line) pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">
            The stubs
          </p>
          <h2
            id="stubs-heading"
            ref="stubsHeading"
            tabindex="-1"
            class="mt-3 font-display text-4xl font-light focus:outline-none sm:text-5xl"
          >
            <template v-if="loaded && entries.length">
              {{ entries.length }} {{ entries.length === 1 ? 'night' : 'nights' }} at the pictures
            </template>
            <template v-else>
              Nights at the pictures
            </template>
          </h2>
        </div>
        <p class="max-w-sm text-sm text-(--fl-muted)">
          Newest first. Log a film from here, or from the button on any film's dossier.
        </p>
      </div>

      <!-- Loading -->
      <div
        v-if="!loaded"
        class="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        <USkeleton
          v-for="i in 3"
          :key="i"
          class="h-48 w-full"
        />
      </div>

      <!-- Empty -->
      <div
        v-else-if="!entries.length"
        class="grid gap-10 py-20 md:grid-cols-12"
      >
        <div class="md:col-span-7">
          <p class="font-display text-4xl leading-tight font-light text-balance">
            No stubs yet. The house lights are still up.
          </p>
          <p class="mt-5 max-w-lg text-(--fl-muted)">
            Log something you've seen recently, or go and find tonight's film first: the Compass picks three by mood, the Time Machine shows what was playing in any year.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              label="Log a film"
              icon="i-lucide-plus"
              @click="logFilm"
            />
            <UButton
              to="/"
              label="Open the Compass"
              color="neutral"
              variant="outline"
            />
          </div>
        </div>
        <!-- A blank ticket, to show what a stub will look like. -->
        <div
          class="hidden rotate-2 self-center border border-dashed border-(--fl-line) p-6 md:col-span-4 md:col-start-9 md:block"
          aria-hidden="true"
        >
          <p class="eyebrow text-(--fl-dim)">
            Admit one
          </p>
          <p class="mt-4 h-6 w-3/4 border-b border-dashed border-(--fl-line)" />
          <p class="mt-4 h-4 w-1/2 border-b border-dashed border-(--fl-line)" />
          <p class="mt-6 flex justify-between text-xs tracking-[0.18em] text-(--fl-dim) uppercase">
            <span>Row &middot; Seat</span><span>Nº 0001</span>
          </p>
        </div>
      </div>

      <!-- By month -->
      <div
        v-else
        class="mt-4"
      >
        <section
          v-for="month in months"
          :key="month.key"
          :aria-labelledby="`month-${month.key}`"
          class="mt-12"
        >
          <h3
            :id="`month-${month.key}`"
            class="flex items-baseline gap-4 font-display text-2xl font-light italic"
          >
            {{ month.label }}
            <span class="eyebrow text-(--fl-dim) not-italic tabular-nums">{{ month.entries.length }} {{ month.entries.length === 1 ? 'stub' : 'stubs' }}</span>
          </h3>
          <ol class="mt-6 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            <li
              v-for="(entry, i) in month.entries"
              :key="entry.id"
              class="drop-shadow-[0_12px_18px_rgb(0_0_0/0.45)]"
              :class="i % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.4deg]'"
            >
              <JournalTicketStub
                :entry="entry"
                :number="serials.get(entry.id) ?? 0"
                class="h-full"
                @edit="edit(entry)"
                @remove="tearUp(entry)"
              />
            </li>
          </ol>
        </section>
      </div>

      <!-- Housekeeping -->
      <div
        v-if="loaded && entries.length"
        class="mt-24 flex flex-col gap-4 border-t border-(--fl-line) pt-6 text-sm text-(--fl-muted) md:flex-row md:items-center md:justify-between"
      >
        <p>Your journal lives in this browser only. Export it now and then to keep it safe.</p>
        <div
          ref="clearControls"
          class="flex flex-wrap items-center gap-3"
        >
          <UButton
            v-if="!confirmingClear"
            label="Clear journal"
            icon="i-lucide-eraser"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="setConfirming(true)"
          />
          <template v-else>
            <span
              class="text-(--fl-text)"
              role="status"
            >Tear up all {{ entries.length }} {{ entries.length === 1 ? 'stub' : 'stubs' }}? This can't be undone.</span>
            <UButton
              label="Clear"
              size="sm"
              color="error"
              variant="outline"
              @click="clearJournal"
            />
            <UButton
              label="Keep"
              size="sm"
              color="neutral"
              variant="ghost"
              data-keep
              @click="setConfirming(false)"
            />
          </template>
        </div>
      </div>
    </section>

    <JournalLogDialog
      v-model:open="dialogOpen"
      :entry="editing"
      @saved="saved"
    />
  </div>
</template>
