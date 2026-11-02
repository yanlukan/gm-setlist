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
 * A bar can go on two lines, two chords a line, only with an even number of
 * chords: with an odd one the last would stand alone and read as a bar of its
 * own (B F#/A# | G#m). A bar of one or three chords shrinks in its bar instead.
 */
const pairsUp = (chords: number) => chords >= 2 && chords % 2 === 0

/**
 * A bar of an even number of chords goes on two lines when, on one line, its
 * chords would have to shrink under 20 px to fit it. Any other bar never does:
 * it shrinks in its bar instead.
 */
export function needsTwoLines(chords: number, px: number, scale: number): boolean {
  return pairsUp(chords) && px * scale < MIN_CHORD_PX
}

/** How much a cell must shrink for its content to fit it, 1 when it fits. */
function ratioOf(cell: HTMLElement): number {
  return cell.clientWidth > 0 && cell.scrollWidth > cell.clientWidth + 1
    ? Math.floor((cell.clientWidth / cell.scrollWidth) * 100) / 100
    : 1
}

/**
 * How much a bar must shrink for its chords to fit, 1 when they do. With one
 * size (Practice) each chord has an equal slot of the bar, its beat, so a
 * chord too wide for its slot counts too, not only a bar too wide as a whole.
 */
function scaleOf(bar: HTMLElement, slots: boolean): number {
  let scale = ratioOf(bar)
  if (slots) for (const chord of bar.querySelectorAll<HTMLElement>('.bar-chord')) scale = Math.min(scale, ratioOf(chord))
  return scale
}

/**
 * Lays out every bar for the size set: first each on one line, then the
 * crowded ones on two lines, then any bar still too narrow for its chords
 * scaled down in that bar alone (`--fit`, which the stylesheet turns into
 * zoom), unless `shrink` is false. With `oneSize` (Practice) a shared bar goes
 * on two lines as soon as its chords do not fit their slots, and no bar
 * shrinks unless asked, except one of three chords, which cannot pair up. Reads every bar before writing any, so the page is
 * laid out once a pass. Returns how many bars are still too narrow.
 */
export function layOutBars(content: HTMLElement, px: number, { oneSize = false, shrink = true }: { oneSize?: boolean; shrink?: boolean } = {}): number {
  const bars = [...content.querySelectorAll<HTMLElement>('.bar')]
  const counts = bars.map(bar => bar.querySelectorAll('.bar-chord').length)
  // One size: a bar of three chords cannot pair up, so its chords take their own
  // widths (practice.css) and it shrinks alone rather than shrink the chart
  const alone = (i: number) => oneSize && counts[i] >= 3 && !pairsUp(counts[i])
  bars.forEach((bar, i) => {
    bar.style.removeProperty('--fit')
    delete bar.dataset.oneALine
    delete bar.dataset.lines
    if (alone(i)) bar.dataset.alone = 'true'
    else delete bar.dataset.alone
  })
  const scale = (bar: HTMLElement, i: number) => scaleOf(bar, oneSize && !alone(i))
  const oneLine = bars.map(scale)
  bars.forEach((bar, i) => {
    const chords = counts[i]
    // One size: a shared bar whose chords do not fit their slots goes on two lines,
    // since it may not shrink instead
    const two = oneSize ? pairsUp(chords) && oneLine[i] < 1 : needsTwoLines(chords, px, oneLine[i])
    if (!two) return
    bar.dataset.lines = '2'
    // One size: two chords get a line each (Stage keeps two a line, for its four-chord bars)
    if (oneSize && chords === 2) bar.dataset.oneALine = 'true'
  })
  const after = bars.map(scale)
  bars.forEach((bar, i) => {
    if ((shrink || alone(i)) && after[i] < 1) bar.style.setProperty('--fit', String(after[i]))
  })
  return after.filter((s, i) => s < 1 && !alone(i)).length
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
 * stylesheet) refits through a ResizeObserver. With `oneSize` (Practice) no
 * bar is scaled down alone: every chord is drawn at the chart's size.
 */
export function useBandFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  enabled: boolean,
  oneSize = false,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight &&
      container.scrollWidth <= container.clientWidth
    // Bars still too narrow for their chords at the size tried (one size only)
    let tooNarrow = 0
    const apply = (px: number, shrink: boolean) => {
      content.style.fontSize = `${px}px`
      tooNarrow = layOutBars(content, px, { oneSize, shrink })
    }
    const fit = () => {
      const min = cssPx(content, '--chart-min', MIN_CHORD_PX)
      const max = cssPx(content, '--chart-max', MAX_CHORD_PX)
      // At `max` the chart overflows: its chords shrink about as much as its height must
      const guess = () => max * Math.min(container.clientHeight / container.scrollHeight, container.clientWidth / container.scrollWidth)
      // One size: no bar shrinks alone, so a size fits only when every bar's chords fit too.
      // The size found then has none too narrow, except at the smallest, where one still
      // too narrow does shrink rather than spill over
      const px = largestFit(size => { apply(size, !oneSize); return fits() && (!oneSize || tooNarrow === 0) }, min, max, guess)
      apply(px, true)
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
  }, [containerRef, contentRef, contentKey, enabled, oneSize])
}
