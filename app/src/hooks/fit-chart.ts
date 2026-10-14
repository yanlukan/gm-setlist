import { useLayoutEffect, type RefObject } from 'react'

/** No chord is drawn smaller than this, on either screen. */
export const MIN_CHORD_PX = 20
/** The largest size, where the stylesheet sets none (bands.css sets 44 upright, 36 on its side). */
const MAX_CHORD_PX = 44
/** Halvings of the size range: about a tenth of a pixel on 20 to 44. */
const STEPS = 8
/** A guessed size is searched a tenth either side, in this many halvings. */
const GUESS_RANGE = 1.1
const GUESS_STEPS = 4

/**
 * The largest size from `min` to `max` at which `fits` holds: `max` if it
 * fits, `min` if not even that fits (the chart then scrolls), otherwise found
 * by halving the range eight times and rounded down to half a pixel.
 *
 * With a `guess` (asked for once `max` has failed), the halving starts from
 * a range a tenth either side of it: about six tries instead of ten, each a
 * layout of the whole chart. A guess that misses the range falls back to the
 * whole of it.
 */
export function largestFit(fits: (px: number) => boolean, min: number, max: number, guess?: () => number): number {
  if (fits(max)) return max
  let lo = min
  let hi = max
  let steps = STEPS
  const g = guess ? Math.min(max, Math.max(min, guess())) : NaN
  if (!Number.isNaN(g) && g > min && g < max) {
    if (fits(g)) {
      const up = Math.min(max, g * GUESS_RANGE)
      lo = g
      hi = up
    } else {
      const down = Math.max(min, g / GUESS_RANGE)
      hi = g
      if (down > min && fits(down)) lo = down
    }
    // A range a tenth wide needs fewer halvings for the same half pixel
    if (lo > min) steps = GUESS_STEPS
  }
  if (lo === min && !fits(min)) return min
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return Math.max(min, Math.floor(lo * 2) / 2)
}

/**
 * A bar of two or more chords goes on two lines when, on one line, its chords
 * would have to shrink under 20 px to fit it. A bar of one chord never does:
 * it shrinks in its bar instead.
 */
export function needsTwoLines(chords: number, px: number, scale: number): boolean {
  return chords >= 2 && px * scale < MIN_CHORD_PX
}

/** How much a cell must shrink for its content to fit it, 1 when it fits. */
function scaleOf(cell: HTMLElement): number {
  return cell.clientWidth > 0 && cell.scrollWidth > cell.clientWidth + 1
    ? Math.floor((cell.clientWidth / cell.scrollWidth) * 100) / 100
    : 1
}

/**
 * Lays out every bar for the size set: first each on one line, then the
 * crowded ones on two lines, then any bar still too narrow for its chords
 * scaled down in that bar alone (`--fit`, which the stylesheet turns into
 * zoom). Reads every bar before writing any, so the page is laid out once a pass.
 */
export function layOutBars(content: HTMLElement, px: number): void {
  const bars = [...content.querySelectorAll<HTMLElement>('.bar')]
  for (const bar of bars) {
    bar.style.removeProperty('--fit')
    delete bar.dataset.lines
  }
  const oneLine = bars.map(scaleOf)
  bars.forEach((bar, i) => {
    if (needsTwoLines(bar.querySelectorAll('.bar-chord').length, px, oneLine[i])) bar.dataset.lines = '2'
  })
  const after = bars.map(scaleOf)
  bars.forEach((bar, i) => {
    if (after[i] < 1) bar.style.setProperty('--fit', String(after[i]))
  })
}

/** A px custom property from the content's style, or `otherwise` where it is not set. */
function cssPx(content: HTMLElement, name: string, otherwise: number): number {
  const value = parseFloat(getComputedStyle(content).getPropertyValue(name))
  return Number.isNaN(value) ? otherwise : value
}

export const REFIT_EVENT = 'playbook:refit-charts'

/** Fits every chart again: after a resize the fit sat out (a dragged panel). */
export function refitCharts(): void {
  window.dispatchEvent(new Event(REFIT_EVENT))
}

/**
 * Sizes a chart in bars: the largest chord size at which the whole chart fits
 * its container, from `--chart-min` to `--chart-max`, with crowded bars on
 * two lines. A chart that cannot fit at the smallest size stays there and
 * scrolls. Rotating the iPad (a new container size, a new range from the
 * stylesheet) refits through a ResizeObserver.
 */
export function useBandFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight &&
      container.scrollWidth <= container.clientWidth
    const apply = (px: number) => {
      content.style.fontSize = `${px}px`
      layOutBars(content, px)
    }
    const fit = () => {
      const min = cssPx(content, '--chart-min', MIN_CHORD_PX)
      const max = cssPx(content, '--chart-max', MAX_CHORD_PX)
      // At `max` the chart overflows: its chords shrink about as much as its height must
      const guess = () => max * Math.min(container.clientHeight / container.scrollHeight, container.clientWidth / container.scrollWidth)
      apply(largestFit(px => { apply(px); return fits() }, min, max, guess))
    }

    // Left from a chart not in bars, it would keep this one's lines from wrapping
    delete content.dataset.wrap
    fit()

    if (typeof ResizeObserver === 'undefined') return
    // Observing the container, not the content: its size does not depend on
    // the font size, so refitting here cannot loop.
    // While a panel beside it is dragged, the chart holds its size; the drag
    // asks for one fit when it ends
    const observer = new ResizeObserver(() => {
      if (!container.closest('[data-resizing]')) fit()
    })
    observer.observe(container)
    window.addEventListener(REFIT_EVENT, fit)
    return () => {
      observer.disconnect()
      window.removeEventListener(REFIT_EVENT, fit)
    }
  }, [containerRef, contentRef, contentKey, enabled])
}
