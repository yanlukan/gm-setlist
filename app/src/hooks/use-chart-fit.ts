import type { RefObject } from 'react'
import { useFitText } from './use-fit-text'
import { useBandFit } from './fit-chart'

/** A chart not in bars (a song typed in by hand): text never goes below this — it scrolls instead. */
const MIN_CHART_PX = 20
/** Upper bound so a two-chord song does not become a wall of letters. */
const MAX_CHART_PX = 64
/** Keep progressions on one line if that still gives at least this size. */
const NO_WRAP_MIN_PX = 30

/**
 * Fits the chart to its screen. A chart in bars: the same rule on Stage and
 * Practice (fit-chart.ts), only the space differs. A chart not in bars keeps
 * the older text fit.
 */
export function useChartFit(
  scrollRef: RefObject<HTMLElement | null>,
  fitRef: RefObject<HTMLElement | null>,
  sectionsRef: RefObject<HTMLElement | null>,
  fitKey: string,
  { bands, enabled, oneSize = false }: { bands: boolean; enabled: boolean; oneSize?: boolean },
): void {
  useBandFit(scrollRef, fitRef, fitKey, enabled && bands, oneSize)
  useFitText(scrollRef, fitRef, fitKey, {
    min: MIN_CHART_PX,
    max: MAX_CHART_PX,
    preferNoWrapMin: NO_WRAP_MIN_PX,
    enabled: enabled && !bands,
    // A long chart keeps its chords on screen; anything under them can scroll
    essentialRef: sectionsRef,
  })
}
