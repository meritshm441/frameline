/**
 * Nuxt UI restyle. Components are pushed away from their defaults toward an
 * editorial, projection-booth look: hairline borders, squared corners,
 * uppercase tracking on small labels, amber as the only accent.
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'stone'
    },
    button: {
      slots: {
        base: 'rounded-none tracking-[0.14em] uppercase font-medium transition-colors duration-500'
      }
    },
    input: {
      slots: {
        base: 'rounded-none'
      }
    },
    kbd: {
      base: 'rounded-none font-sans tracking-wider'
    },
    modal: {
      slots: {
        overlay: 'bg-black/75 backdrop-blur-[2px]',
        content: 'rounded-none bg-(--fl-surface) ring-1 ring-(--fl-line) shadow-2xl divide-(--fl-line)'
      }
    },
    commandPalette: {
      slots: {
        root: 'divide-(--fl-line)',
        input: '[&>input]:font-serif [&>input]:text-xl [&>input]:h-16',
        group: 'p-2',
        label: 'font-sans text-[0.65rem] uppercase tracking-[0.2em] text-(--fl-muted) px-3 py-2',
        item: 'rounded-none py-2 data-highlighted:before:bg-(--color-primary-400)/10',
        itemLabelBase: 'font-serif text-base',
        itemLabelSuffix: 'font-sans text-xs tabular-nums text-(--fl-muted)',
        itemLeadingAvatar: 'rounded-none',
        empty: 'py-12 text-center font-serif italic text-(--fl-muted)'
      }
    },
    skeleton: {
      base: 'rounded-none bg-(--fl-line)/60'
    },
    switch: {
      slots: {
        base: 'rounded-none',
        thumb: 'rounded-none'
      }
    }
  }
})
