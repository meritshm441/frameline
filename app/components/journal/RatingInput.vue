<script setup lang="ts">
import type { JournalRating } from '#shared/types/journal'
import { JOURNAL_RATINGS, RATING_WORDS } from '#shared/utils/journal'

/**
 * One to five stars, or none. Native radios underneath, so arrow keys move
 * between ratings and screen readers announce each one's words, not a number.
 */
const model = defineModel<JournalRating | null>({ required: true })

const hover = ref<JournalRating | null>(null)
const shown = computed(() => hover.value ?? model.value ?? 0)
const words = computed(() => (shown.value ? RATING_WORDS[shown.value] : 'Not rated'))
</script>

<template>
  <fieldset>
    <legend class="eyebrow">
      Your rating
    </legend>
    <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div
        class="flex"
        @pointerleave="hover = null"
      >
        <label
          v-for="r in JOURNAL_RATINGS"
          :key="r"
          class="cursor-pointer p-1 has-focus-visible:outline-2 has-focus-visible:outline-(--fl-accent)"
          @pointerenter="hover = r"
        >
          <input
            v-model="model"
            type="radio"
            name="journal-rating"
            class="sr-only"
            :value="r"
          >
          <span class="sr-only">{{ r }} of 5: {{ RATING_WORDS[r] }}</span>
          <JournalStar
            :filled="r <= shown"
            class="size-7 transition-colors duration-300"
            :class="r <= shown ? 'text-(--fl-accent)' : 'text-(--fl-dim)'"
          />
        </label>
      </div>
      <p
        class="min-w-40 font-display text-lg italic"
        :class="shown ? 'text-(--fl-text)' : 'text-(--fl-dim)'"
        aria-hidden="true"
      >
        {{ words }}
      </p>
      <label
        v-if="model !== null"
        class="cursor-pointer text-xs tracking-[0.14em] text-(--fl-muted) uppercase underline-offset-4 hover:text-(--fl-text) hover:underline has-focus-visible:outline-2 has-focus-visible:outline-(--fl-accent)"
      >
        <input
          v-model="model"
          type="radio"
          name="journal-rating"
          class="sr-only"
          :value="null"
        >
        Clear rating
      </label>
    </div>
  </fieldset>
</template>
