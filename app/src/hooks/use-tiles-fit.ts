import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { REFIT_EVENT } from './fit-chart'

/** The shapes never shrink below this or grow past this. */
export const MIN_TILES_ZOOM = 0.5
export const MAX_TILES_ZOOM = 1.8
const STEPS = 8

/** The largest zoom, in 0.05 steps, at which `fits` holds; the smallest when none does. */
export function largestZoom(fits: (zoom: number) => boolean, min = MIN_TILES_ZOOM, max = MAX_TILES_ZOOM): number {
  if (fits(max)) return max
  if (!fits(min)) return min
  let lo = min
  let hi = max
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return Math.floor(lo * 20) / 20
}

/**
 * Scales the shape tiles so they fill the panel the player sized: bigger in
 * a big panel, smaller in a small one, never below half size. The book and
 * the notes under them scroll. Waits while the panel is dragged and fits
 * once when the drag ends.
 */
export function useTilesFit(panelRef: RefObject<HTMLElement | null>, contentKey: string): void {
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const fit = () => {
      const tiles = panel.querySelector<HTMLElement>('.tiles')
      const section = panel.querySelector<HTMLElement>('.shape-tiles')
      if (!tiles || !section) return
      // The shapes fill the panel's height; the book and notes scroll below them
      const style = getComputedStyle(panel)
      const room = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const fits = (zoom: number) => {
        tiles.style.zoom = String(zoom)
        return section.offsetHeight <= room && panel.scrollWidth <= panel.clientWidth
      }
      tiles.style.zoom = String(largestZoom(fits))
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (!panel.closest('[data-resizing]')) fit()
    })
    observer.observe(panel)
    window.addEventListener(REFIT_EVENT, fit)
    return () => {
      observer.disconnect()
      window.removeEventListener(REFIT_EVENT, fit)
    }
  }, [panelRef, contentKey])
}
