/** Shared open state so any button (header, empty states) can summon search. */
export function useSearchPalette() {
  const open = useState('search-palette-open', () => false)
  return {
    open,
    show: () => { open.value = true },
    hide: () => { open.value = false }
  }
}
