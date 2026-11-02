import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { largestFit, layOutBars, refitCharts, useBandFit } from '../../hooks/fit-chart'

describe('largestFit', () => {
  it('takes the largest size when everything fits', () => {
    expect(largestFit(() => true, 20, 44)).toBe(44)
  })

  it('stays at the smallest size when nothing fits, and the chart scrolls', () => {
    expect(largestFit(() => false, 20, 44)).toBe(20)
  })

  it('halves the range eight times and rounds down to half a pixel', () => {
    // Tries 32, 26, 29, 30.5, 31.25, 31.625, 31.4375, 31.34375: the last that fits is 31.25
    expect(largestFit(px => px <= 31.3, 20, 44)).toBe(31)
    // ... 27.6875 then 27.78125 fit: rounded down, 27.5
    expect(largestFit(px => px <= 27.8, 20, 44)).toBe(27.5)
  })

  it('searches near a guess, in fewer tries, to the same size', () => {
    const tries: number[] = []
    const fits = (px: number) => (tries.push(px), px <= 31.3)
    expect(largestFit(fits, 20, 44, () => 32)).toBe(31)
    expect(tries.length).toBeLessThanOrEqual(7)
  })

  it('searches up from a guess that fits', () => {
    expect(largestFit(px => px <= 31.3, 20, 44, () => 30)).toBe(31)
  })

  it('searches on up when the size a tenth above a guess that fits fits too', () => {
    expect(largestFit(px => px <= 40.2, 20, 44, () => 23)).toBe(40)
  })

  it('falls back to the whole range when the guess is far off', () => {
    expect(largestFit(px => px <= 24.2, 20, 44, () => 40)).toBe(24)
  })

  it('stays at the smallest size from a guess when nothing fits', () => {
    expect(largestFit(() => false, 20, 44, () => 30)).toBe(20)
  })

  it('works on the smaller range on its side', () => {
    expect(largestFit(px => px <= 30, 20, 36)).toBeLessThanOrEqual(30)
    expect(largestFit(px => px <= 30, 20, 36)).toBeGreaterThanOrEqual(29.5)
  })
})

type Px = number | (() => number)
const pxOf = (v: Px) => (typeof v === 'function' ? v() : v)

/**
 * A bar of `beats` beats with a chord at each of `starts` (0-based beats),
 * each chord's text `widths[i]` px wide. jsdom has no layout, so the width
 * the bar needs is faked: `need` px on one line, `staggered` px on two (a
 * number, or a function of the chart's size).
 */
function beatBar(beats: number, starts: number[], need: Px, staggered: Px = need, widths: number[] = starts.map(() => 0)) {
  const bar = document.createElement('div')
  bar.className = 'bar'
  bar.dataset.beats = String(beats)
  bar.style.setProperty('--beats', String(beats))
  bar.style.fontSize = '40px'
  const chords = starts.map((start, i) => {
    const chord = document.createElement('span')
    chord.className = 'bar-chord'
    chord.dataset.start = String(start)
    chord.style.setProperty('--start', String(start + 1))
    chord.style.setProperty('--span', String((starts[i + 1] ?? beats) - start))
    Object.defineProperty(chord, 'offsetWidth', { get: () => widths[i] })
    bar.appendChild(chord)
    return chord
  })
  Object.defineProperty(bar, 'offsetWidth', { get: () => pxOf(bar.dataset.lines === '2' ? staggered : need) })
  return { bar, chords }
}

/**
 * A section's bars: one row of `cols` columns in `width` px. Its columns are
 * content-sized, so it is as wide as its bars need when that is more than its
 * width, and overflows.
 */
function fakeGrid(width: number, cols: number, bars: { bar: HTMLElement }[]) {
  const grid = document.createElement('div')
  grid.className = 'bar-grid'
  grid.style.setProperty('--cols', String(cols))
  grid.append(...bars.map(b => b.bar))
  Object.defineProperty(grid, 'clientWidth', { get: () => width })
  Object.defineProperty(grid, 'scrollWidth', { get: () => Math.max(width, bars.reduce((sum, b) => sum + b.bar.offsetWidth, 0)) })
  return grid
}

const prop = (chords: HTMLElement[], name: string) => chords.map(c => c.style.getPropertyValue(name))
const repeatBar = () => beatBar(1, [], 40)

describe('layOutBars', () => {
  it('lets a crowded bar take the room its row has spare, on one line', () => {
    const content = document.createElement('div')
    const crowded = beatBar(3, [0, 1, 2], 160, 100, [30, 110, 30]) // more than its quarter of 400 px
    content.append(fakeGrid(400, 4, [crowded, repeatBar(), repeatBar(), repeatBar()]))
    expect(layOutBars(content)).toBe(0)
    expect(crowded.bar.dataset.lines).toBeUndefined()
    expect(prop(crowded.chords, '--row')).toEqual(['', '', ''])
  })

  it('staggers a bar whose row does not fit, each chord still under its beat (Faith: B F#/A# G#m .)', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(4, [0, 1, 2], 250, 150, [30, 110, 80])
    content.append(fakeGrid(400, 4, [{ bar }, beatBar(1, [0], 60), beatBar(1, [0], 60), beatBar(1, [0], 60)]))
    expect(layOutBars(content)).toBe(0)
    expect(bar.dataset.lines).toBe('2')
    expect(prop(chords, '--row')).toEqual(['1', '2', '1'])
    expect(prop(chords, '--start')).toEqual(['1', '2', '3'])
    expect(prop(chords, '--run')).toEqual(['2', '3', '2'])
    // F#/A# after B, G#m half a size later, over F#/A#'s tail (staggered-beats.ts)
    expect(bar.style.getPropertyValue('--beat-widths')).toBe('minmax(30px, 1fr) minmax(20px, 1fr) minmax(45px, 1fr) minmax(45px, 1fr)')
  })

  it('staggers a three-chord bar without dots the same way, so the last chord is on the right of the top line', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(3, [0, 1, 2], 250, 150, [30, 110, 30])
    content.append(fakeGrid(400, 4, [{ bar }, beatBar(1, [0], 60), beatBar(1, [0], 60), beatBar(1, [0], 60)]))
    expect(layOutBars(content)).toBe(0)
    expect(prop(chords, '--row')).toEqual(['1', '2', '1'])
    expect(prop(chords, '--run')).toEqual(['2', '2', '1'])
  })

  it('staggers the most crowded bar first, and only as many as the row needs', () => {
    const content = document.createElement('div')
    const most = beatBar(4, [0, 1, 2], 200, 120, [30, 110, 80])
    const next = beatBar(4, [0, 1, 2], 130, 100, [30, 110, 80])
    content.append(fakeGrid(400, 4, [most, next, repeatBar(), repeatBar()])) // 410 px: 10 too many
    expect(layOutBars(content)).toBe(0)
    expect(most.bar.dataset.lines).toBe('2')
    expect(next.bar.dataset.lines).toBeUndefined()
  })

  it('queues every bar of two or more chords, so a bar within its share still staggers when the row needs it', () => {
    const content = document.createElement('div')
    const roomy = beatBar(4, [0, 1, 2], 100, 60, [10, 50, 40]) // exactly its quarter of 400 px
    content.append(fakeGrid(400, 4, [roomy, beatBar(1, [0], 320)])) // 420 px: 20 too many
    expect(layOutBars(content)).toBe(0)
    expect(roomy.bar.dataset.lines).toBe('2')
  })

  it('never staggers a bar whose beats are not written on it', () => {
    const content = document.createElement('div')
    const unknown = beatBar(4, [0, 1, 2], 500, 100)
    delete unknown.bar.dataset.beats
    const noStart = beatBar(4, [0, 1, 2], 500, 100)
    delete noStart.chords[1].dataset.start
    content.append(fakeGrid(400, 4, [unknown]), fakeGrid(400, 4, [noStart]))
    expect(layOutBars(content)).toBe(2)
    expect(unknown.bar.dataset.lines).toBeUndefined()
    expect(noStart.bar.dataset.lines).toBeUndefined()
  })

  it('gives a staggered bar the beats it needs, gaps counted', () => {
    const content = document.createElement('div')
    const { bar } = beatBar(4, [0, 1, 2], 500, 150, [30, 110, 80])
    bar.style.setProperty('column-gap', '10px')
    content.append(fakeGrid(400, 4, [{ bar }]))
    layOutBars(content)
    expect(bar.style.getPropertyValue('--beat-widths')).toBe('minmax(30px, 1fr) minmax(10px, 1fr) minmax(40px, 1fr) minmax(40px, 1fr)')
  })

  it('never staggers a bar that would be no narrower staggered', () => {
    const content = document.createElement('div')
    const pair = beatBar(4, [0, 2], 500, 100, [10, 100]) // half a size after a short first chord, the second ends the bar either way
    content.append(fakeGrid(400, 4, [pair]))
    expect(layOutBars(content)).toBe(1)
    expect(pair.bar.dataset.lines).toBeUndefined()
  })

  it('staggers a two-chord bar whose second chord can start under the first one\'s tail (Too Funky: Am/D G/D)', () => {
    const content = document.createElement('div')
    const pair = beatBar(2, [0, 1], 500, 100, [100, 60])
    content.append(fakeGrid(400, 4, [pair]))
    layOutBars(content)
    expect(pair.bar.dataset.lines).toBe('2')
    // Its second chord starts half the 40 px size after the first
    expect(pair.bar.style.getPropertyValue('--beat-widths')).toBe('minmax(20px, 1fr) minmax(80px, 1fr)')
  })

  it('never starts a line with a lone chord at the left unless it is on beat 1', () => {
    const content = document.createElement('div')
    const bars = [
      beatBar(4, [0, 1, 2], 500, 100, [30, 110, 80]),
      beatBar(3, [0, 1, 2], 500, 100, [30, 110, 30]),
      beatBar(4, [0, 1, 2, 3], 500, 100, [20, 60, 60, 20]),
    ]
    for (const b of bars) content.append(fakeGrid(400, 4, [b]))
    layOutBars(content)
    for (const { bar, chords } of bars) {
      expect(bar.dataset.lines).toBe('2')
      for (const chord of chords.filter(c => c.style.getPropertyValue('--row') === '2')) {
        expect(Number(chord.style.getPropertyValue('--start'))).toBeGreaterThan(1)
      }
    }
  })

  it('never sets --fit or zoom on a bar', () => {
    const content = document.createElement('div')
    const bars = [beatBar(4, [0, 1, 2], 500, 300, [30, 110, 80]), beatBar(4, [0], 500), beatBar(4, [0, 2], 90)]
    content.append(fakeGrid(400, 4, bars))
    layOutBars(content)
    for (const { bar, chords } of bars) {
      expect(bar.style.getPropertyValue('--fit')).toBe('')
      expect(bar.style.zoom).toBe('')
      expect(bar.style.width).toBe('')
      expect(prop(chords, 'width').every(w => w === '')).toBe(true)
    }
  })

  it('counts a section whose bar of one chord is too long even split', () => {
    const content = document.createElement('div')
    const long = beatBar(4, [0], 450)
    content.append(fakeGrid(400, 4, [long]), fakeGrid(400, 4, [beatBar(4, [0, 2], 80)]))
    expect(layOutBars(content)).toBe(1)
    expect(long.bar.dataset.lines).toBeUndefined()
  })

  it('counts a chord wider than its columns', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(2, [0, 1], 80)
    Object.defineProperty(chords[1], 'clientWidth', { get: () => 40 })
    Object.defineProperty(chords[1], 'scrollWidth', { get: () => 50 })
    content.append(fakeGrid(400, 4, [{ bar }]))
    expect(layOutBars(content)).toBe(1)
  })

  it('starts again from one line at every size', () => {
    const content = document.createElement('div')
    let need = 500
    const { bar, chords } = beatBar(4, [0, 1, 2], () => need, 150, [30, 110, 80])
    content.append(fakeGrid(400, 4, [{ bar }]))
    layOutBars(content)
    expect(bar.dataset.lines).toBe('2')
    need = 300
    layOutBars(content)
    expect(bar.dataset.lines).toBeUndefined()
    expect(bar.style.getPropertyValue('--beat-widths')).toBe('')
    expect(prop(chords, '--row')).toEqual(['', '', ''])
    expect(prop(chords, '--run')).toEqual(['', '', ''])
  })
})

/** jsdom has no layout: a 400 px tall screen and a chart `lines` lines tall. */
function fakeChart(lines: number) {
  const container = document.createElement('div')
  const content = document.createElement('div')
  const px = () => parseFloat(content.style.fontSize) || 0
  Object.defineProperty(container, 'clientHeight', { get: () => 400 })
  Object.defineProperty(container, 'clientWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollHeight', { get: () => Math.max(400, px() * lines), configurable: true })
  return { container: { current: container }, content: { current: content }, size: px }
}

describe('useBandFit', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('takes the largest size from 44 down to 20 at which the chart fits and returns to it after a refit', () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
    const chart = fakeChart(8) // the chart alone fits up to 50 px
    // A bar of one chord nine chart sizes wide in a 300 px section: it fits up to 33.4 px
    chart.content.current.append(fakeGrid(300, 4, [beatBar(1, [0], () => chart.size() * 9)]))
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(33)
    chart.content.current.style.fontSize = '44px'
    refitCharts()
    expect(chart.size()).toBe(33)
  })

  it('steps down from the size the search rounded to when that size does not fit', () => {
    const chart = fakeChart(8)
    // Fits up to 33.4 px, but not at exactly 33, the half pixel the search rounds down to
    const need = () => (chart.size() === 33 ? 1000 : chart.size() * 9)
    chart.content.current.append(fakeGrid(300, 4, [beatBar(1, [0], need)]))
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(32.5)
  })

  it('staggers a crowded bar rather than make the whole chart smaller', () => {
    const chart = fakeChart(8)
    const { bar } = beatBar(4, [0, 1, 2], () => chart.size() * 10, () => chart.size() * 6, [30, 110, 80])
    chart.content.current.append(fakeGrid(300, 4, [{ bar }]))
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(44) // 440 px on one line, 264 staggered
    expect(bar.dataset.lines).toBe('2')
  })

  it('stops at 20 when nothing fits, and scrolls', () => {
    const chart = fakeChart(8)
    chart.content.current.append(fakeGrid(300, 4, [beatBar(4, [0], 500)]))
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(20)
  })

  it('fits the whole chart at the largest size that fits', () => {
    const chart = fakeChart(12) // fits up to 33.4 px
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(33)
  })

  it('stays at 20 px and scrolls when the song cannot fit', () => {
    const chart = fakeChart(30)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(20)
  })

  it('takes its range from the stylesheet', () => {
    const chart = fakeChart(1)
    chart.content.current.style.setProperty('--chart-max', '36px')
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(36)
  })

  it('does not count content one pixel taller than the container as fitting', () => {
    const chart = fakeChart(1)
    // Always 1 px too tall at any size: nothing fits, so it stays at the smallest size
    Object.defineProperty(chart.container.current, 'scrollHeight', { get: () => 401 })
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(20)
  })

  it('does nothing when switched off', () => {
    const chart = fakeChart(12)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', false))
    expect(chart.content.current.style.fontSize).toBe('')
  })
})
