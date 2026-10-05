/**
 * Flips to true (once, and for good) when an element comes within `margin`
 * of the viewport. Used to defer heavy, below-the-fold work such as the
 * Constellation's D3 bundle and its half-dozen TMDB calls until a reader
 * is actually heading there.
 */
export function useNearViewport(target: Readonly<Ref<HTMLElement | null>>, margin = '400px') {
  const near = ref(false)
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    if (!('IntersectionObserver' in window)) {
      near.value = true
      return
    }
    observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        near.value = true
        observer?.disconnect()
      }
    }, { rootMargin: margin })
    if (target.value) observer.observe(target.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return near
}
