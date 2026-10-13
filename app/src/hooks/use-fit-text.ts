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
  /**
   * The part that matters most. If the whole content cannot fit even at
   * `min`, the size is chosen so this part fits instead, and only what
   * follows it needs scrolling.
   */
  essentialRef?: RefObject<HTMLElement | null>
  /**
   * The size to go back to when not even the essential part fits at `min`:
   * the chart then scrolls at a size chosen for reading, not the smallest.
   */
  fallback?: number
  /**
   * Read the range from the content's stylesheet on every fit: `--chart-min`,
   * `--chart-max` and `--chart-base` (the fallback), in px. The page sets them
   * per screen shape, so turning the iPad picks up the other range. The values
   * passed in are used where the stylesheet sets none.
   */
  cssVars?: boolean
  /**
   * Mark the container `data-cramped="on"` when not even the essential part
   * fits, so the page can make room (smaller chord diagrams). On by default.
   */
  cramped?: boolean
}

interface Range {
  min: number
  max: number
  fallback?: number
}

/** A px custom property from a computed style, or `otherwise` when it is not set. */
function cssPx<T extends number | undefined>(style: CSSStyleDeclaration, name: string, otherwise: T): number | T {
  const value = parseFloat(style.getPropertyValue(name))
  return Number.isNaN(value) ? otherwise : value
}

/** The range the stylesheet sets on `content`, else the one passed in. */
function rangeFrom(content: HTMLElement, passed: Range): Range {
  const style = getComputedStyle(content)
  return {
    min: cssPx(style, '--chart-min', passed.min),
    max: cssPx(style, '--chart-max', passed.max),
    fallback: cssPx(style, '--chart-base', passed.fallback),
  }
}

/**
 * Sets `content`'s font size to the largest value (px) at which it fits
 * inside `container` without scrolling, found by binary search on real
 * layout. If even `min` does not fit, the essential part (if given) is fitted
 * instead, at the largest size at which it fits. If not even that fits, the
 * size goes back to `fallback` (else stays at `min`) and the rest scrolls, so
 * chords are never shrunk to unreadable.
 *
 * `contentKey` must change whenever the text changes (song, transpose, ...).
 * Changes to the container's size (rotating the iPad, hiding the chord
 * diagrams) are picked up by a ResizeObserver.
 */
export function useFitText(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  { min, max, enabled, preferNoWrapMin, essentialRef, fallback, cssVars = false, cramped = true }: FitOptions,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight + 1 &&
      container.scrollWidth <= container.clientWidth + 1

    const essentialFits = () => {
      const essential = essentialRef?.current
      if (!essential) return false
      const bottom = essential.getBoundingClientRect().bottom - container.getBoundingClientRect().top + container.scrollTop
      return bottom <= container.clientHeight + 1 && container.scrollWidth <= container.clientWidth + 1
    }

    const largestFitting = (fits: () => boolean, range: Range) => {
      let lo = range.min
      let hi = range.max
      let best = range.min
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

    const fitBy = (fits: () => boolean, range: Range) => {
      if (preferNoWrapMin !== undefined) {
        content.dataset.wrap = 'off'
        const unwrapped = largestFitting(fits, range)
        if (unwrapped >= preferNoWrapMin) {
          content.style.fontSize = `${unwrapped}px`
          return
        }
        content.dataset.wrap = 'on'
      } else {
        // Left from the last chart, it would keep this one's lines from wrapping
        delete content.dataset.wrap
      }
      content.style.fontSize = `${largestFitting(fits, range)}px`
    }

    const fit = () => {
      const range = cssVars ? rangeFrom(content, { min, max, fallback }) : { min, max, fallback }
      fitBy(fits, range)
      if (!fits() && essentialRef?.current) fitBy(essentialFits, range)
      const lost = !fits() && !essentialFits()
      // Not even the chords fit: read them at the size chosen for reading, and scroll
      if (range.fallback !== undefined && lost) content.style.fontSize = `${range.fallback}px`
      // Say so, so the page can make room (smaller chord diagrams). Kept until
      // the content changes, so the room it makes cannot take it away again and flicker.
      if (cramped && essentialRef?.current && lost) container.dataset.cramped = 'on'
    }

    delete container.dataset.cramped

    fit()

    if (typeof ResizeObserver === 'undefined') return
    // Observing the container, not the content: the container's size does not
    // depend on the font size, so refitting here cannot loop.
    const observer = new ResizeObserver(() => fit())
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, contentRef, contentKey, min, max, enabled, preferNoWrapMin, essentialRef, fallback, cssVars, cramped])
}
