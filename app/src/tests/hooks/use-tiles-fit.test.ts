import { describe, it, expect } from 'vitest'
import { largestZoom, MIN_TILES_ZOOM, MAX_TILES_ZOOM } from '../../hooks/use-tiles-fit'

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
