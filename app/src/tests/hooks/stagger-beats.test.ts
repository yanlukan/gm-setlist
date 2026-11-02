import { describe, it, expect } from 'vitest'
import { oneLineWidth, staggeredBeats, type BarMeasure } from '../../hooks/stagger-beats'

/** Where each beat starts, from its tracks and gaps. */
const beatLefts = (tracks: number[], gap: number) => tracks.map((_, k) => tracks.slice(0, k).reduce((a, t) => a + t, 0) + k * gap)

/** The playing-order rules, checked on where the chords land on those tracks. */
function readsInOrder(bar: BarMeasure): void {
  const { tracks, width } = staggeredBeats(bar)
  const at = beatLefts(tracks, bar.gap)
  const left = bar.starts.map(s => at[s])
  const right = left.map((l, i) => l + bar.widths[i])
  const end = tracks.reduce((a, t) => a + t, 0) + (bar.beats - 1) * bar.gap
  expect(end).toBeCloseTo(width, 6)
  left.forEach((l, i) => {
    if (i > 0) expect(l).toBeGreaterThanOrEqual(left[i - 1] + bar.font / 2 - 1e-6)
    if (i >= 2) expect(l).toBeGreaterThanOrEqual(right[i - 2] - 1e-6)
    expect(right[i]).toBeLessThanOrEqual(end + 1e-6)
  })
  // With three chords or more, the first ends before the second starts; with two, the second may start under its tail
  if (bar.starts.length >= 3) expect(right[0]).toBeLessThanOrEqual(left[1] + 1e-6)
  for (const t of tracks) expect(t).toBeGreaterThanOrEqual(0)
}

const faith = { beats: 4, starts: [0, 1, 2], widths: [30, 110, 80], gap: 0, font: 40 }

describe('staggeredBeats', () => {
  it('places Faith B F#/A# G#m . left to right: F#/A# after B, G#m half a size after F#/A#, over its tail', () => {
    expect(staggeredBeats(faith)).toEqual({ tracks: [30, 20, 45, 45], lefts: [0, 30, 50], width: 140 })
  })

  it('counts the gaps between beats', () => {
    expect(staggeredBeats({ ...faith, gap: 10 })).toEqual({ tracks: [30, 10, 40, 40], lefts: [0, 40, 60], width: 150 })
  })

  it('keeps the first chord inside its beats, so the second starts after it ends', () => {
    const bar = { beats: 5, starts: [0, 1, 3], widths: [60, 230, 30], gap: 0, font: 40 }
    expect(staggeredBeats(bar).lefts).toEqual([0, 60, 80])
  })

  it('starts each chord at least half the chart size after the one before', () => {
    const bar = { beats: 4, starts: [0, 1, 2], widths: [40, 120, 80], gap: 0, font: 100 }
    expect(staggeredBeats(bar).lefts).toEqual([0, 50, 100])
  })

  it('reads in playing order on every kind of bar', () => {
    const bars: BarMeasure[] = [
      faith,
      { ...faith, gap: 12 },
      { beats: 3, starts: [0, 1, 2], widths: [30, 110, 80], gap: 13, font: 44 },
      { beats: 4, starts: [0, 1, 2, 3], widths: [55, 50, 55, 50], gap: 6, font: 20 },
      { beats: 4, starts: [1, 2, 3], widths: [40, 90, 20], gap: 8, font: 30 },
      { beats: 8, starts: [0, 2, 3, 6], widths: [70, 20, 140, 60], gap: 9, font: 36 },
      { beats: 2, starts: [0, 1], widths: [100, 100], gap: 10, font: 40 },
      { beats: 4, starts: [0, 2], widths: [120, 40], gap: 6, font: 44 },
    ]
    bars.forEach(readsInOrder)
  })

  it('lets the second of two chords start under the first one\'s tail, half a size after its start (Too Funky: Am/D G/D)', () => {
    const pair = { beats: 2, starts: [0, 1], widths: [100, 60], gap: 10, font: 40 }
    expect(staggeredBeats(pair)).toEqual({ tracks: [10, 80], lefts: [0, 20], width: 100 })
    expect(staggeredBeats(pair).width).toBeLessThan(oneLineWidth(pair))
  })

  it('still starts the second of three chords after the first ends', () => {
    const three = { beats: 3, starts: [0, 1, 2], widths: [100, 60, 30], gap: 10, font: 40 }
    expect(staggeredBeats(three).lefts[1]).toBe(110)
  })

  it('is narrower than one line where a long chord can run on under a short one', () => {
    expect(staggeredBeats(faith).width).toBeLessThan(oneLineWidth(faith))
    // Two chords, the first short: the second starts half a size later and ends the bar either way, so never
    const pair = { beats: 2, starts: [0, 1], widths: [10, 100], gap: 10, font: 40 }
    expect(staggeredBeats(pair).width).toBeGreaterThanOrEqual(oneLineWidth(pair) - 1)
  })
})
