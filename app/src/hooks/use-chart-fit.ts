import type { RefObject } from 'react'
import { useFitText } from './use-fit-text'

/** Chart text never goes below this — it scrolls instead. */
const MIN_CHART_PX = 20
/** Upper bound so a two-chord song does not become a wall of letters. */
const MAX_CHART_PX = 64
/** Keep progressions on one line if that still gives at least this size. */
const NO_WRAP_MIN_PX = 30
/** A chart in bands, in portrait: used where the stylesheet sets none (bands.css sets them per screen shape). */
const BAND_BASE_PX = 32
const BAND_MIN_PX = 28
const BAND_MAX_PX = 45

/** Fits the chart to its screen: the biggest text that needs no scrolling. */
export function useChartFit(
  scrollRef: RefObject<HTMLElement | null>,
  fitRef: RefObject<HTMLElement | null>,
  sectionsRef: RefObject<HTMLElement | null>,
  fitKey: string,
  { bands, enabled }: { bands: boolean; enabled: boolean },
): void {
  useFitText(scrollRef, fitRef, fitKey, {
    // A chart in bands takes its range from bands.css, and when not even its
    // bands fit it goes back to the base size and scrolls. A chord too wide
    // for its bar shrinks in that bar alone.
    ...(bands
      ? { min: BAND_MIN_PX, max: BAND_MAX_PX, fallback: BAND_BASE_PX, cssVars: true, cramped: false, fitCells: '.bar' }
      : { min: MIN_CHART_PX, max: MAX_CHART_PX, preferNoWrapMin: NO_WRAP_MIN_PX }),
    enabled,
    // A long chart keeps its chords on screen; anything under them can scroll
    essentialRef: sectionsRef,
  })
}
