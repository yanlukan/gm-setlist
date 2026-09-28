import { useLayoutEffect, type RefObject } from 'react'

interface FitOptions {
  min: number
  max: number
  enabled: boolean
  /**
   * Prefer keeping every line unwrapped (a chord progression split mid-line
   * reads like a new bar) as long as that still allows at least this size.
   * Below it, wrapping is allowed so the text can be bigger.
   */
  preferNoWrapMin?: number
}

/**
 * Sets `content`'s font size to the largest value (px) at which it fits
 * inside `container` without scrolling, found by binary search on real
 * layout. If even `min` does not fit, it stays at `min` and the container
 * scrolls, so chords are never shrunk to unreadable.
 *
 * `contentKey` must change whenever the text changes (song, transpose, ...).
 * Changes to the container's size — rotating the iPad, hiding the chord
 * diagrams — are picked up by a ResizeObserver.
 */
export function useFitText(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  { min, max, enabled, preferNoWrapMin }: FitOptions,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight + 1 &&
      container.scrollWidth <= container.clientWidth + 1

    const largestFitting = () => {
      let lo = min
      let hi = max
      let best = min
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        content.style.fontSize = `${mid}px`
        if (fits()) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      return best
    }

    const fit = () => {
      if (preferNoWrapMin !== undefined) {
        content.dataset.wrap = 'off'
        const unwrapped = largestFitting()
        if (unwrapped >= preferNoWrapMin) {
          content.style.fontSize = `${unwrapped}px`
          return
        }
      }
      content.dataset.wrap = 'on'
      content.style.fontSize = `${largestFitting()}px`
    }

    fit()

    if (typeof ResizeObserver === 'undefined') return
    // Observing the container, not the content: the container's size does not
    // depend on the font size, so refitting here cannot loop.
    const observer = new ResizeObserver(() => fit())
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, contentRef, contentKey, min, max, enabled, preferNoWrapMin])
}
