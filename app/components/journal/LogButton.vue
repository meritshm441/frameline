<script setup lang="ts">
import type { JournalEntry } from '#shared/types/journal'
import type { MovieDetails } from '#shared/types/tmdb'
import { toJournalFilm } from '#shared/utils/journal'

/**
 * "Log in journal" for a film's dossier, plus a line saying when it was last
 * logged. The journal is read after mount, so the server renders the button
 * alone and the line appears once the browser knows.
 */
const props = defineProps<{ movie: MovieDetails }>()

const { viewingsOf, loaded } = useJournal()
const toast = useToast()

const open = ref(false)
const film = computed(() => toJournalFilm(props.movie))
const viewings = computed(() => (loaded.value ? viewingsOf(props.movie.id) : []))

const format = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const lastSeen = computed(() => {
  const last = viewings.value[0]
  return last ? format.format(new Date(`${last.watchedOn}T00:00:00Z`)) : null
})

function saved(entry: JournalEntry) {
  toast.add({
    title: 'Stub kept',
    description: `${entry.film.title}, row ${entry.seat.charAt(0)}, seat ${entry.seat.slice(1)}.`,
    icon: 'i-lucide-ticket',
    actions: [{
      label: 'Open the journal',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        navigateTo('/journal')
      }
    }]
  })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <UButton
      :label="viewings.length ? 'Log a rewatch' : 'Log in journal'"
      icon="i-lucide-ticket"
      size="lg"
      color="neutral"
      variant="outline"
      @click="open = true"
    />
    <p
      v-if="lastSeen"
      class="text-xs tracking-[0.18em] text-(--fl-muted) uppercase tabular-nums"
    >
      <NuxtLink
        to="/journal"
        class="underline-offset-4 hover:text-(--fl-text) hover:underline"
      >
        In your journal<template v-if="viewings.length > 1">
          &times;{{ viewings.length }}
        </template>
      </NuxtLink>
      &middot; last watched {{ lastSeen }}
    </p>
    <JournalLogDialog
      v-model:open="open"
      :film="film"
      @saved="saved"
    />
  </div>
</template>
