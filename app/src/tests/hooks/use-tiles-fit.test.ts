import { describe, it, expect } from 'vitest'
import { largestZoom, nearestZoom, MIN_TILES_ZOOM, MAX_TILES_ZOOM } from '../../hooks/use-tiles-fit'

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

describe('the zoom while the panel is dragged', () => {
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
