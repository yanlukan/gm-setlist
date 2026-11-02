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

/** A chord fits when its text is no wider than the columns it spans. */
function chordFits(chord: HTMLElement): boolean {
  return chord.scrollWidth <= chord.clientWidth + 1
}

/** The bars whose chords do not all fit their columns. */
function tooNarrow(bars: HTMLElement[]): boolean[] {
  return bars.map(bar => [...bar.querySelectorAll<HTMLElement>('.bar-chord')].some(chord => !chordFits(chord)))
}

/**
 * Lays out every bar at the content's current font size: one rule for every
 * song and every screen. A bar whose chords all fit their beats stays on one
 * line. A bar of two or more chords that do not staggers: its chords
 * alternate between a top and a bottom line (`--row`), each still starting
 * under its own beat (`--start`), each running on over the empty beats of
 * its own line to the next chord there or the bar's end (`--run`). The second
 * chord is never on beat 1, so no line starts with a lone chord at the left.
 * No bar is ever shrunk alone. Reads every bar before writing any, so the
 * page is laid out once a pass. Returns how many bars still have a chord too
 * wide for its columns: a bar of one long chord, or one too narrow even
 * staggered.
 */
export function layOutBars(content: HTMLElement): number {
  const bars = [...content.querySelectorAll<HTMLElement>('.bar')]
  for (const bar of bars) {
    delete bar.dataset.lines
    for (const chord of bar.querySelectorAll<HTMLElement>('.bar-chord')) {
      chord.style.removeProperty('--row')
      chord.style.removeProperty('--run')
    }
  }
  const crowded = tooNarrow(bars)
  bars.forEach((bar, b) => {
    const chords = [...bar.querySelectorAll<HTMLElement>('.bar-chord')]
    if (!crowded[b] || chords.length < 2) return
    const beats = Number(bar.dataset.beats) || chords.length
    const starts = chords.map(chord => Number(chord.dataset.start) || 0)
    bar.dataset.lines = '2'
    chords.forEach((chord, i) => {
      // The next chord on its own line is two along: chords alternate lines
      const end = i + 2 < chords.length ? starts[i + 2] : beats
      chord.style.setProperty('--row', String((i % 2) + 1))
      chord.style.setProperty('--run', String(end - starts[i]))
    })
  })
  return tooNarrow(bars).filter(Boolean).length
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
 * Sizes a chart in bars, the same on Stage and Practice: the largest chord
 * size from `--chart-min` to `--chart-max` at which the whole chart fits its
 * container and every bar's chords fit their beats, crowded bars staggered
 * (layOutBars). At the smallest size the search stops whatever is left, and
 * the chart scrolls. Rotating the iPad (a new container size, a new range
 * from the stylesheet) refits through a ResizeObserver.
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
      return layOutBars(content)
    }
    const fit = () => {
      const min = cssPx(content, '--chart-min', MIN_CHORD_PX)
      const max = cssPx(content, '--chart-max', MAX_CHORD_PX)
      // At `max` the chart overflows: its chords shrink about as much as its height must
      const guess = () => max * Math.min(container.clientHeight / container.scrollHeight, container.clientWidth / container.scrollWidth)
      const px = largestFit(size => apply(size) === 0 && fits(), min, max, guess)
      apply(px)
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
