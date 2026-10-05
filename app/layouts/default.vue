<template>
  <div class="relative flex min-h-dvh flex-col">
    <UiSiteHeader />
    <main
      id="main"
      tabindex="-1"
      class="relative z-10 flex-1 focus:outline-none"
    >
      <slot />
    </main>
    <UiSiteFooter />
    <UiSearchPalette />
    <UiAtmosphere />
  </div>
</template>
