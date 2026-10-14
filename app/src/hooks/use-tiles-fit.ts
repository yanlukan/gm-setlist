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
 * at which a single row of tiles would already fill the height. The search
 * starts from the zoom worked out from the tiles' size or, while the panel
 * is dragged, from `near`, the zoom they have.
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
  // The tiles at full size, and what sits above them, give the most the zoom can be
  tiles.style.zoom = '1'
  const above = section.offsetHeight - tiles.offsetHeight
  const sizes = [...tiles.children].map(tile => tile.getBoundingClientRect())
  const grid: TileGrid = {
    count: sizes.length,
    width: Math.max(0, ...sizes.map(r => r.width)),
    height: Math.max(0, ...sizes.map(r => r.height)),
    gap: parseFloat(getComputedStyle(tiles).columnGap) || 0,
    across: tiles.getBoundingClientRect().width,
    down: room - above,
  }
  const most = grid.height > 0 ? Math.min(MAX_TILES_ZOOM, Math.max(MIN_TILES_ZOOM, grid.down / grid.height)) : MAX_TILES_ZOOM
  const top = Math.floor(most * 20 + 1e-9) / 20
  const fits = (zoom: number) => {
    tiles.style.zoom = String(zoom)
    return section.offsetHeight <= room && panel.scrollWidth <= panel.clientWidth
  }
  // Worked out from the tiles' size first, then checked on the page from there:
  // a few layouts instead of one for every zoom from the top down
  const from = near ?? largestZoom(zoom => gridFits(grid, zoom), MIN_TILES_ZOOM, top)
  tiles.style.zoom = String(nearestZoom(fits, from, top))
}

/** The shape tiles as measured at full size, and the room they have. */
export interface TileGrid {
  count: number
  /** The widest and the tallest tile. */
  width: number
  height: number
  gap: number
  /** The room across and down for the tiles, in panel pixels. */
  across: number
  down: number
}

/** Whether the tiles, wrapped into rows, would fit their room at this zoom: worked out, not laid out. */
export function gridFits(grid: TileGrid, zoom: number): boolean {
  if (grid.count === 0) return true
  if (grid.width * zoom > grid.across) return false
  const perRow = Math.max(1, Math.floor((grid.across / zoom + grid.gap) / (grid.width + grid.gap)))
  const rows = Math.ceil(grid.count / perRow)
  return zoom * (rows * grid.height + (rows - 1) * grid.gap) <= grid.down
}

/**
 * From a zoom close to the answer, up while a bigger one fits or down until
 * one does: two or three tries, which keeps a drag smooth and a new song quick.
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
