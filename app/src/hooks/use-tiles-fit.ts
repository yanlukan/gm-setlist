import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { REFIT_EVENT } from './fit-chart'

/** The shapes never shrink below this or grow past this. */
export const MIN_TILES_ZOOM = 0.5
export const MAX_TILES_ZOOM = 1.8

/**
 * The largest zoom, in 0.05 steps, at which `fits` holds; the smallest when
 * none does. Tried from the top down, not halved: bigger tiles wrap onto
 * another row, so a bigger zoom can fit where a slightly smaller one does not.
 */
export function largestZoom(fits: (zoom: number) => boolean, min = MIN_TILES_ZOOM, max = MAX_TILES_ZOOM): number {
  for (let step = Math.round(max * 20); step >= Math.round(min * 20); step--) {
    if (fits(step / 20)) return step / 20
  }
  return min
}

/**
 * Fits the shapes to the panel as it is now: the largest zoom at which they
 * fill it (on its side, with the song order under them), never above the one
 * at which a single row of tiles would already fill the height. While the
 * panel is dragged, `near` is the zoom they have, and the search starts there.
 */
export function fitTiles(panel: HTMLElement, side: boolean, near?: number): void {
  const tiles = panel.querySelector<HTMLElement>('.tiles')
  const section = panel.querySelector<HTMLElement>('.shape-tiles')
  if (!tiles || !section) return
  const style = getComputedStyle(panel)
  // On its side the panel is tall: the song order shares it. Upright it is short and wide,
  // so the shapes take it all and the order is one scroll down
  const order = side ? panel.querySelector<HTMLElement>('.song-order') : null
  const orderRoom = order ? order.offsetHeight + (parseFloat(style.rowGap) || 0) : 0
  const room = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - orderRoom
  // One row of tiles at full size, and what sits above them, give the most the zoom can be
  tiles.style.zoom = '1'
  const tile = tiles.firstElementChild as HTMLElement | null
  const above = section.offsetHeight - tiles.offsetHeight
  const oneRow = tile ? tile.getBoundingClientRect().height : 0
  const most = oneRow > 0 ? Math.min(MAX_TILES_ZOOM, Math.max(MIN_TILES_ZOOM, (room - above) / oneRow)) : MAX_TILES_ZOOM
  const fits = (zoom: number) => {
    tiles.style.zoom = String(zoom)
    return section.offsetHeight <= room && panel.scrollWidth <= panel.clientWidth
  }
  const top = Math.floor(most * 20 + 1e-9) / 20
  tiles.style.zoom = String(near === undefined ? largestZoom(fits, MIN_TILES_ZOOM, top) : nearestZoom(fits, near, top))
}

/**
 * While the panel is dragged: from the zoom the shapes have now, up while a
 * bigger one fits or down until one does. Two or three tries a frame keep the
 * drag smooth; the fit when it is let go searches them all.
 */
export function nearestZoom(fits: (zoom: number) => boolean, from: number, max = MAX_TILES_ZOOM, min = MIN_TILES_ZOOM): number {
  let step = Math.min(Math.round(from * 20), Math.round(max * 20))
  const low = Math.round(min * 20)
  if (fits(step / 20)) {
    while (step < Math.round(max * 20) && fits((step + 1) / 20)) step++
  } else {
    while (step > low && !fits((step - 1) / 20)) step--
    step = Math.max(step - 1, low)
  }
  return step / 20
}

/**
 * Scales the shape tiles so they fill the panel the player sized: bigger in
 * a big panel, smaller in a small one, never below half size. What is under
 * them scrolls. While the panel is dragged, the handle fits them itself.
 */
export function useTilesFit(panelRef: RefObject<HTMLElement | null>, contentKey: string, side = false): void {
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const fit = () => fitTiles(panel, side)
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
  }, [panelRef, contentKey, side])
}
