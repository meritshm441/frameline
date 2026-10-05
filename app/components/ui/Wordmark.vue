<template>
  <span class="inline-flex items-center gap-2.5 text-(--fl-text)">
    <!-- A single film frame with sprocket holes, crossed by the amber "frame line". -->
    <svg
      viewBox="0 0 20 26"
      class="h-6 w-auto shrink-0"
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width="18.5"
        height="24.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <g fill="currentColor">
        <rect
          x="3"
          y="3"
          width="2"
          height="2.5"
        />
        <rect
          x="3"
          y="20.5"
          width="2"
          height="2.5"
        />
        <rect
          x="15"
          y="3"
          width="2"
          height="2.5"
        />
        <rect
          x="15"
          y="20.5"
          width="2"
          height="2.5"
        />
      </g>
      <line
        x1="0"
        y1="13"
        x2="20"
        y2="13"
        stroke="var(--fl-accent)"
        stroke-width="1.5"
      />
    </svg>
    <span class="font-display text-[1.375rem] leading-none italic">Frameline</span>
  </span>
</template>
