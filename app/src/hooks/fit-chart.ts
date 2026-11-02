import { useLayoutEffect, type RefObject } from 'react'
import { oneLineWidth, staggeredBeats, type StaggeredBeats } from './stagger-beats'

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
 * a range a tenth either side of it, in fewer halvings for the same half
 * pixel: about six tries instead of ten, each a
 * layout of the whole chart. A guess that misses the range falls back to the
 * whole of it: below the guess, or above a tenth over it, when that fits too.
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
      // A guess well under the size that fits: search the rest of the range
      if (up < max && fits(up)) lo = up
      else {
        lo = g
        hi = up
        steps = GUESS_STEPS
      }
    } else {
      const down = Math.max(min, g / GUESS_RANGE)
      hi = g
      if (down > min && fits(down)) {
        lo = down
        steps = GUESS_STEPS
      }
    }
  }
  if (lo === min && !fits(min)) return min
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return Math.max(min, Math.floor(lo * 2) / 2)
}

/** A section's bars run past its width: its columns, sized by need, add up to more. */
function overflows(grid: HTMLElement): boolean {
  return grid.scrollWidth > grid.clientWidth + 1
}

/** A chord cut off: its text wider than the columns it spans. */
function clipped(chord: HTMLElement): boolean {
  return chord.scrollWidth > chord.clientWidth + 1
}

interface Crowded {
  bar: HTMLElement
  chords: HTMLElement[]
  /** The bar's beats and each chord's beat (0-based), as BandBars.tsx writes them */
  beats: number
  starts: number[]
  /** Its width on one line, each chord's text width, the gap between beats and the chart's size */
  need: number
  widths: number[]
  gap: number
  font: number
}

/** A whole number from a data attribute, or null where it is missing or not one. */
function count(value: string | undefined): number | null {
  const n = value === undefined || value === '' ? NaN : Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/**
 * A bar that may stagger: two or more chords, drawn in beats (BandBars.tsx
 * writes `data-beats` on the bar and `data-start` on each chord). A bar
 * without them is never staggered, since its chords' beats are not known.
 */
function crowdedOf(bar: HTMLElement): Crowded | null {
  const chords = [...bar.querySelectorAll<HTMLElement>('.bar-chord')]
  const beats = count(bar.dataset.beats)
  const starts = chords.map(chord => count(chord.dataset.start))
  if (chords.length < 2 || beats === null || starts.some(start => start === null)) return null
  return { bar, chords, beats, starts: starts as number[], need: 0, widths: [], gap: 0, font: 0 }
}

/** How many beats each chord runs on its own line: to the next chord there (two along) or the bar's end. */
function runsOf({ chords, beats, starts }: Crowded): number[] {
  return chords.map((_, i) => (i + 2 < chords.length ? starts[i + 2] : beats) - starts[i])
}

/**
 * Puts a bar's chords on two lines, alternately, each still starting under
 * its own beat (`--start`) and running on over the empty beats of its own
 * line (`--run`), each beat at least as wide as `staggeredBeats` says
 * (`--beat-widths`), so the bar reads in playing order. The second chord is
 * never on beat 1, so no line starts with a lone chord at the left.
 */
function stagger(c: Crowded, beats: StaggeredBeats): void {
  c.bar.dataset.lines = '2'
  // Each beat its least width or more: the room left in its column is shared
  const tracks = beats.tracks.map(t => `minmax(${Math.ceil(t * 10) / 10}px, 1fr)`)
  c.bar.style.setProperty('--beat-widths', tracks.join(' '))
  const runs = runsOf(c)
  c.chords.forEach((chord, i) => {
    chord.style.setProperty('--row', String((i % 2) + 1))
    chord.style.setProperty('--run', String(runs[i]))
  })
}

/**
 * Lays out every bar at the content's current font size: one rule for every
 * song and every screen. A section's columns are sized by need (bands.css):
 * each at least as wide as its most crowded bar, the room left shared, so a
 * crowded bar takes what its row has spare and stays on one line. Only where
 * a section's bars then add up to more than its width do bars stagger: the
 * most crowded first, one at a time, until the section fits, each only if
 * it is narrower staggered (staggered-beats.ts) than on one line. No bar is
 * ever shrunk alone. Returns how many sections still run past their width,
 * plus any chord cut off: 0 when the chart's bars fit at this size.
 */
export function layOutBars(content: HTMLElement): number {
  const grids = [...content.querySelectorAll<HTMLElement>('.bar-grid')]
  for (const bar of content.querySelectorAll<HTMLElement>('.bar')) {
    delete bar.dataset.lines
    bar.style.removeProperty('--beat-widths')
    for (const chord of bar.querySelectorAll<HTMLElement>('.bar-chord')) {
      chord.style.removeProperty('--row')
      chord.style.removeProperty('--run')
    }
  }
  let open = grids.filter(overflows)
  if (open.length) {
    // What each bar that could stagger needs on one line (its min-content width) and its
    // chords' own widths, read with every such bar set to them at once: one layout
    const candidates = open.map(grid =>
      [...grid.querySelectorAll<HTMLElement>('.bar')].map(crowdedOf).filter((c): c is Crowded => c !== null),
    )
    const all = candidates.flat()
    for (const c of all) {
      c.bar.style.width = 'min-content'
      for (const chord of c.chords) chord.style.width = 'max-content'
    }
    for (const c of all) {
      const style = getComputedStyle(c.bar)
      c.need = c.bar.offsetWidth
      c.widths = c.chords.map(chord => chord.offsetWidth)
      c.gap = parseFloat(style.columnGap) || 0
      c.font = parseFloat(style.fontSize) || 0
    }
    for (const c of all) {
      c.bar.style.removeProperty('width')
      for (const chord of c.chords) chord.style.removeProperty('width')
    }
    // Most crowded first, each bar that is narrower staggered than with its chords side by
    // side. Every such bar is queued, so a bar that helps at one size helps at every smaller
    // one too, and a size that fits is never followed by a larger one
    const beat = new Map(all.map(c => [c, staggeredBeats(c)]))
    const narrower = (c: Crowded) => (beat.get(c) as StaggeredBeats).width < oneLineWidth(c) - 1
    const queues = candidates.map(list => list.filter(narrower).sort((a, b) => b.need - a.need))
    let at = open.map((_, g) => g)
    while (at.length) {
      const next = at.filter(g => queues[g].length)
      for (const g of next) {
        const c = queues[g].shift() as Crowded
        stagger(c, beat.get(c) as StaggeredBeats)
      }
      at = next.filter(g => overflows(open[g]))
    }
    open = open.filter(overflows)
  }
  const cut = [...content.querySelectorAll<HTMLElement>('.bar-chord')].filter(clipped).length
  return open.length + cut
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
 * container, every section's bars fit its width and no chord is cut off,
 * staggering crowded bars only where their row needs it (layOutBars). At
 * the smallest size the search stops whatever is left, and the chart
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
      return layOutBars(content) === 0 && fits()
    }
    const fit = () => {
      const min = cssPx(content, '--chart-min', MIN_CHORD_PX)
      const max = cssPx(content, '--chart-max', MAX_CHORD_PX)
      // At `max` the chart overflows: its chords shrink about as much as its height must
      const guess = () =>
        max * Math.min(container.clientHeight / container.scrollHeight, container.clientWidth / container.scrollWidth)
      // The search rounds down to half a pixel, a size it may not have tried: step down to one that fits
      let px = largestFit(apply, min, max, guess)
      while (!apply(px) && px > min) px = Math.max(min, px - 0.5)
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
