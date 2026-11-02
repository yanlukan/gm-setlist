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

/**
 * A bar of `beats` beat columns, each `beat` px wide, with a chord at each of
 * `starts` (0-based beats) needing `need[i]` px (or a function of the chart's
 * size). jsdom has no layout, so a chord's clientWidth is the width of the
 * columns it spans: its --span on one line, its --run when staggered.
 */
function beatBar(beats: number, starts: number[], beat: number, need: (number | (() => number))[]) {
  const bar = document.createElement('div')
  bar.className = 'bar'
  bar.dataset.beats = String(beats)
  bar.style.setProperty('--beats', String(beats))
  const chords = starts.map((start, i) => {
    const chord = document.createElement('span')
    chord.className = 'bar-chord'
    chord.dataset.start = String(start)
    const span = (starts[i + 1] ?? beats) - start
    chord.style.setProperty('--start', String(start + 1))
    chord.style.setProperty('--span', String(span))
    const columns = () => {
      const run = parseFloat(chord.style.getPropertyValue('--run'))
      return bar.dataset.lines === '2' && !Number.isNaN(run) ? run : span
    }
    Object.defineProperty(chord, 'clientWidth', { get: () => columns() * beat })
    Object.defineProperty(chord, 'scrollWidth', {
      get: () => {
        const n = need[i]
        return Math.max(columns() * beat, typeof n === 'function' ? n() : n)
      },
    })
    bar.appendChild(chord)
    return chord
  })
  return { bar, chords }
}

const prop = (chords: HTMLElement[], name: string) => chords.map(c => c.style.getPropertyValue(name))

describe('layOutBars', () => {
  it('keeps a bar on one line when every chord fits its columns', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(4, [0, 2], 50, [80, 90])
    content.append(bar)
    expect(layOutBars(content)).toBe(0)
    expect(bar.dataset.lines).toBeUndefined()
    expect(prop(chords, '--row')).toEqual(['', ''])
  })

  it('staggers a bar whose chords do not fit their beats, each still under its beat (Faith: B F#/A# G#m .)', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(4, [0, 1, 2], 40, [30, 70, 60])
    content.append(bar)
    expect(layOutBars(content)).toBe(0)
    expect(bar.dataset.lines).toBe('2')
    expect(prop(chords, '--row')).toEqual(['1', '2', '1'])
    expect(prop(chords, '--start')).toEqual(['1', '2', '3'])
    expect(prop(chords, '--run')).toEqual(['2', '3', '2'])
  })

  it('staggers a three-chord bar without dots the same way, so the last chord is on the right of the top line', () => {
    const content = document.createElement('div')
    const { bar, chords } = beatBar(3, [0, 1, 2], 40, [60, 60, 30])
    content.append(bar)
    expect(layOutBars(content)).toBe(0)
    expect(prop(chords, '--row')).toEqual(['1', '2', '1'])
    expect(prop(chords, '--run')).toEqual(['2', '2', '1'])
  })

  it('never starts a line with a lone chord at the left unless it is on beat 1', () => {
    const content = document.createElement('div')
    const bars = [
      beatBar(4, [0, 1, 2], 40, [30, 70, 60]),
      beatBar(4, [0, 2], 30, [70, 70]),
      beatBar(3, [0, 1, 2], 40, [60, 60, 30]),
      beatBar(4, [0, 1, 2, 3], 30, [50, 50, 50, 50]),
    ]
    content.append(...bars.map(b => b.bar))
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
    const bars = [beatBar(4, [0, 1, 2], 40, [30, 70, 60]), beatBar(4, [0], 20, [200]), beatBar(4, [0, 2], 10, [90, 90])]
    content.append(...bars.map(b => b.bar))
    layOutBars(content)
    for (const { bar } of bars) {
      expect(bar.style.getPropertyValue('--fit')).toBe('')
      expect(bar.style.zoom).toBe('')
    }
  })

  it('counts a bar of one chord too long even split', () => {
    const content = document.createElement('div')
    const { bar } = beatBar(4, [0], 20, [120])
    content.append(bar, beatBar(4, [0, 2], 50, [80, 90]).bar)
    expect(layOutBars(content)).toBe(1)
    expect(bar.dataset.lines).toBeUndefined()
  })

  it('starts again from one line at every size', () => {
    const content = document.createElement('div')
    let need = 70
    const { bar, chords } = beatBar(4, [0, 1, 2], 40, [30, () => need, 30])
    content.append(bar)
    layOutBars(content)
    expect(bar.dataset.lines).toBe('2')
    need = 35
    layOutBars(content)
    expect(bar.dataset.lines).toBeUndefined()
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
    // A chord three chart sizes wide in a 100 px bar (a pixel's grace): it fits up to 33.67 px
    const size = () => parseFloat(chart.content.current.style.fontSize) || 0
    chart.content.current.append(beatBar(1, [0], 100, [() => size() * 3]).bar)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', true))
    expect(chart.size()).toBe(33.5)
    chart.content.current.style.fontSize = '44px'
    refitCharts()
    expect(chart.size()).toBe(33.5)
  })

  it('stops at 20 when nothing fits, and scrolls', () => {
    const chart = fakeChart(8)
    chart.content.current.append(beatBar(4, [0], 10, [500]).bar)
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
