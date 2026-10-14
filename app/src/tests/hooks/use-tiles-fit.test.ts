import { describe, it, expect } from 'vitest'
import { largestZoom, nearestZoom, gridFits, MIN_TILES_ZOOM, MAX_TILES_ZOOM } from '../../hooks/use-tiles-fit'

describe('the zoom that makes the shapes fill their panel', () => {
  it('is the largest that fits, rounded down to 0.05', () => {
    expect(largestZoom(z => z <= 1.23)).toBe(1.2)
  })

  it('grows to the most when everything fits', () => {
    expect(largestZoom(() => true)).toBe(MAX_TILES_ZOOM)
  })

  it('stays at the least when nothing fits (the panel scrolls)', () => {
    expect(largestZoom(() => false)).toBe(MIN_TILES_ZOOM)
  })
})

describe('the zoom from close to the answer', () => {
  it('grows from where it is while a bigger one fits', () => {
    expect(nearestZoom(z => z <= 1.23, 0.8)).toBe(1.2)
  })

  it('shrinks from where it is until one fits', () => {
    expect(nearestZoom(z => z <= 0.62, 1)).toBe(0.6)
  })

  it('stays within the most and the least', () => {
    expect(nearestZoom(() => true, 1, 1.4)).toBe(1.4)
    expect(nearestZoom(() => false, 1)).toBe(MIN_TILES_ZOOM)
  })

  it('tries only the zooms between where it is and the answer', () => {
    const tried: number[] = []
    nearestZoom(z => (tried.push(z), z <= 0.9), 0.8)
    expect(tried).toEqual([0.8, 0.85, 0.9, 0.95])
  })
})

describe('the tiles worked out without laying them out', () => {
  // Eight tiles 128 x 215 at full size, 8 px apart, in a panel 788 across and 250 down
  const grid = { count: 8, width: 128, height: 215, gap: 8, across: 788, down: 250 }

  it('fit on one row when they are small enough', () => {
    // At 0.7 a tile and its gap take 95 px: all eight fit across, and one row is 150 px down
    expect(gridFits(grid, 0.7)).toBe(true)
  })

  it('do not fit when the rows they wrap onto are too tall', () => {
    // At 0.9 six fit across, so two rows: 394 px down
    expect(gridFits(grid, 0.9)).toBe(false)
  })

  it('give the zoom the search starts from', () => {
    // At 0.75 only seven fit across: two rows, too tall
    expect(largestZoom(zoom => gridFits(grid, zoom))).toBe(0.7)
  })

  it('never fit a tile wider than the room', () => {
    expect(gridFits({ ...grid, count: 1, down: 10000 }, 7)).toBe(false)
  })
})
