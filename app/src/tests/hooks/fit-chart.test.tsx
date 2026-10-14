import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { largestFit, layOutBars, needsTwoLines, useBandFit } from '../../hooks/fit-chart'

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

  it('works on the smaller range on its side', () => {
    expect(largestFit(px => px <= 30, 20, 36)).toBeLessThanOrEqual(30)
    expect(largestFit(px => px <= 30, 20, 36)).toBeGreaterThanOrEqual(29.5)
  })
})

describe('needsTwoLines', () => {
  it('only for two or more chords that would go under 20 px', () => {
    expect(needsTwoLines(2, 30, 0.6)).toBe(true) // 18 px
    expect(needsTwoLines(3, 30, 0.7)).toBe(false) // 21 px
    expect(needsTwoLines(1, 30, 0.5)).toBe(false) // one chord shrinks in its bar instead
    expect(needsTwoLines(2, 30, 1)).toBe(false)
  })
})

/** A bar `width` wide whose chords need `oneLine` px on one line and `twoLines` px on two. */
function fakeBar(chords: number, width: number, oneLine: number, twoLines: number) {
  const bar = document.createElement('div')
  bar.className = 'bar'
  for (let i = 0; i < chords; i++) {
    const chord = document.createElement('span')
    chord.className = 'bar-chord'
    bar.appendChild(chord)
  }
  Object.defineProperty(bar, 'clientWidth', { get: () => width })
  Object.defineProperty(bar, 'scrollWidth', { get: () => (bar.dataset.lines === '2' ? twoLines : oneLine) })
  return bar
}

describe('layOutBars', () => {
  it('puts a crowded bar on two lines, and leaves the others alone', () => {
    const content = document.createElement('div')
    const crowded = fakeBar(2, 100, 160, 90) // at 30 px: 30 × 0.62 = 18.6, under 20
    const roomy = fakeBar(2, 100, 100, 60)
    content.append(crowded, roomy)
    layOutBars(content, 30)
    expect(crowded.dataset.lines).toBe('2')
    expect(crowded.style.getPropertyValue('--fit')).toBe('')
    expect(roomy.dataset.lines).toBeUndefined()
  })

  it('shrinks one long chord in its own bar', () => {
    const content = document.createElement('div')
    const long = fakeBar(1, 100, 125, 125)
    content.append(long)
    layOutBars(content, 30)
    expect(long.dataset.lines).toBeUndefined()
    expect(long.style.getPropertyValue('--fit')).toBe('0.8')
  })

  it('still shrinks a bar that is too wide on two lines', () => {
    const content = document.createElement('div')
    const packed = fakeBar(4, 100, 250, 110)
    content.append(packed)
    layOutBars(content, 30)
    expect(packed.dataset.lines).toBe('2')
    expect(packed.style.getPropertyValue('--fit')).toBe('0.9')
  })

  it('starts again from one line at every size', () => {
    const content = document.createElement('div')
    const bar = fakeBar(2, 100, 160, 90)
    content.append(bar)
    layOutBars(content, 30)
    expect(bar.dataset.lines).toBe('2')
    layOutBars(content, 40) // 40 × 0.62 = 24.8: one line is fine now
    expect(bar.dataset.lines).toBeUndefined()
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
  Object.defineProperty(container, 'scrollHeight', { get: () => Math.max(400, px() * lines) })
  return { container: { current: container }, content: { current: content }, size: px }
}

describe('useBandFit', () => {
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

  it('does nothing when switched off', () => {
    const chart = fakeChart(12)
    renderHook(() => useBandFit(chart.container, chart.content, 'a', false))
    expect(chart.content.current.style.fontSize).toBe('')
  })
})
