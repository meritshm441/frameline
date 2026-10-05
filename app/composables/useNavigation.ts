export interface NavSection {
  label: string
  to: string
  icon: string
  /** One-line description shown in the search palette and mobile menu. */
  hint: string
}

export const NAV_SECTIONS: readonly NavSection[] = [
  { label: 'Compass', to: '/', icon: 'i-lucide-compass', hint: 'Find tonight\'s film by mood' },
  { label: 'Atlas', to: '/atlas', icon: 'i-lucide-globe-2', hint: 'Wander cinema by country' },
  { label: 'Time Machine', to: '/time-machine', icon: 'i-lucide-hourglass', hint: 'What was playing in any year' },
  { label: 'Spectrum', to: '/spectrum', icon: 'i-lucide-palette', hint: 'Browse films by poster colour' },
  { label: 'Journal', to: '/journal', icon: 'i-lucide-ticket', hint: 'Your personal reel of ticket stubs' }
]
