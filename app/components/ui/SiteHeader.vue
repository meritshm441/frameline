<script setup lang="ts">
const route = useRoute()
const { show: openSearch } = useSearchPalette()
const menuOpen = ref(false)

watch(() => route.path, () => {
  menuOpen.value = false
})

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <header class="relative z-40">
    <a
      href="#main"
      class="sr-only bg-(--fl-accent) px-4 py-2 text-(--fl-bg) focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      Skip to content
    </a>

    <div class="mx-auto flex max-w-360 items-center gap-6 px-5 py-6 sm:px-8 lg:px-12">
      <NuxtLink
        to="/"
        aria-label="Frameline, home"
        class="-m-1 p-1"
      >
        <UiWordmark />
      </NuxtLink>

      <nav
        aria-label="Primary"
        class="ml-auto hidden md:block"
      >
        <ul class="flex items-center gap-8">
          <li
            v-for="section in NAV_SECTIONS"
            :key="section.to"
          >
            <NuxtLink
              :to="section.to"
              :aria-current="isActive(section.to) ? 'page' : undefined"
              class="group relative block py-2 eyebrow transition-colors duration-500 hover:text-(--fl-text)"
              :class="isActive(section.to) && 'text-(--fl-text)'"
            >
              {{ section.label }}
              <span
                class="absolute -bottom-px left-0 h-px w-full origin-left bg-(--fl-accent) transition-transform duration-700 ease-(--ease-projector) group-hover:scale-x-100"
                :class="isActive(section.to) ? 'scale-x-100' : 'scale-x-0'"
                aria-hidden="true"
              />
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="ml-auto flex items-center gap-2 md:ml-4">
        <button
          type="button"
          class="group flex items-center gap-3 border border-(--fl-line) px-3 py-2 text-(--fl-muted) transition-colors duration-500 hover:border-(--fl-accent)/60 hover:text-(--fl-text)"
          aria-label="Search films"
          aria-keyshortcuts="Control+K Meta+K"
          @click="openSearch"
        >
          <UIcon
            name="i-lucide-search"
            class="size-4"
          />
          <span class="hidden text-xs tracking-[0.18em] uppercase sm:inline">Search</span>
          <span class="hidden items-center gap-0.5 lg:flex">
            <UKbd
              value="meta"
              size="sm"
              variant="outline"
            />
            <UKbd
              value="k"
              size="sm"
              variant="outline"
            />
          </span>
        </button>

        <UButton
          class="md:hidden"
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          aria-label="Open menu"
          @click="menuOpen = true"
        />
      </div>
    </div>

    <USlideover
      v-model:open="menuOpen"
      side="right"
      title="Navigate"
      :ui="{
        overlay: 'bg-black/70',
        content: 'bg-(--fl-surface) ring-(--fl-line)',
        title: 'eyebrow',
        body: 'p-6'
      }"
    >
      <template #body>
        <nav aria-label="Mobile">
          <ul class="space-y-6">
            <li
              v-for="(section, i) in NAV_SECTIONS"
              :key="section.to"
            >
              <NuxtLink
                :to="section.to"
                :aria-current="isActive(section.to) ? 'page' : undefined"
                class="group flex items-baseline gap-4"
              >
                <span class="font-sans text-xs text-(--fl-dim) tabular-nums">0{{ i + 1 }}</span>
                <span>
                  <span
                    class="block font-display text-3xl transition-colors duration-500 group-hover:text-(--fl-accent)"
                    :class="isActive(section.to) && 'text-(--fl-accent)'"
                  >
                    {{ section.label }}
                  </span>
                  <span class="mt-1 block text-sm text-(--fl-muted)">{{ section.hint }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </template>
    </USlideover>
  </header>
</template>
