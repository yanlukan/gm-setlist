import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFitText } from '../../hooks/use-fit-text'

/**
 * jsdom has no layout, so the chart is faked: a 400px tall screen, a whole
 * chart `lines` lines tall, and chord sections ending after `chordLines`.
 */
function fakeChart(lines: number, chordLines: number, width: (content: HTMLElement) => number = () => 300) {
  const container = document.createElement('div')
  const content = document.createElement('div')
  const sections = document.createElement('div')
  const px = () => parseInt(content.style.fontSize) || 0
  Object.defineProperty(container, 'clientHeight', { get: () => 400 })
  Object.defineProperty(container, 'clientWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollWidth', { get: () => width(content) })
  Object.defineProperty(container, 'scrollHeight', { get: () => Math.max(400, px() * lines) })
  container.getBoundingClientRect = () => ({ top: 0, bottom: 400 }) as DOMRect
  sections.getBoundingClientRect = () => ({ top: 0, bottom: px() * chordLines }) as DOMRect
  return {
    container: { current: container },
    content: { current: content },
    sections: { current: sections },
    size: px,
  }
}

const options = { min: 20, max: 60, enabled: true }

describe('useFitText', () => {
  it('fits the whole chart when it can', () => {
    const chart = fakeChart(10, 8)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.size()).toBe(40)
  })

  it('stays at the smallest size when even that is too big and nothing is essential', () => {
    const chart = fakeChart(25, 12)
    renderHook(() => useFitText(chart.container, chart.content, 'a', options))
    expect(chart.size()).toBe(20)
  })

  it('fits the chords instead when the whole chart cannot fit, so only the notes scroll', () => {
    const chart = fakeChart(25, 12)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.size()).toBe(33)
  })

  it('keeps the smallest size when not even the chords fit, and says the chart is cramped', () => {
    const chart = fakeChart(40, 30)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.size()).toBe(20)
    expect(chart.container.current.dataset.cramped).toBe('on')
  })

  it('is not cramped when the chords fit', () => {
    const chart = fakeChart(25, 12)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.container.current.dataset.cramped).toBeUndefined()
  })

  it('forgets cramped when the chart changes', () => {
    let chordLines = 30
    const chart = fakeChart(40, 30)
    chart.sections.current.getBoundingClientRect = () => ({ top: 0, bottom: chart.size() * chordLines }) as DOMRect
    const { rerender } = renderHook(({ key }) =>
      useFitText(chart.container, chart.content, key, { ...options, essentialRef: chart.sections }), { initialProps: { key: 'a' } })
    expect(chart.container.current.dataset.cramped).toBe('on')
    chordLines = 12
    rerender({ key: 'b' })
    expect(chart.container.current.dataset.cramped).toBeUndefined()
  })

  it('forgets the last chart’s unwrapped lines when the next one does not ask for them', () => {
    let prefer: number | undefined = 30
    const chart = fakeChart(10, 8)
    const { rerender } = renderHook(({ key }) =>
      useFitText(chart.container, chart.content, key, { ...options, preferNoWrapMin: prefer }), { initialProps: { key: 'a' } })
    expect(chart.content.current.dataset.wrap).toBe('off')
    prefer = undefined
    rerender({ key: 'b' })
    expect(chart.content.current.dataset.wrap).toBeUndefined()
  })
})

/** Sets the chart's range on the content, the way bands.css does. */
function withRange(chart: ReturnType<typeof fakeChart>, base: number, min: number, max: number) {
  const content = chart.content.current
  content.style.setProperty('--chart-base', `${base}px`)
  content.style.setProperty('--chart-min', `${min}px`)
  content.style.setProperty('--chart-max', `${max}px`)
  // Computed style is only read for an element in the document
  document.body.append(content)
  return chart
}

const bands = { min: 20, max: 60, enabled: true, cssVars: true, cramped: false }

describe('useFitText on a band chart', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('takes its range from the stylesheet', () => {
    const chart = withRange(fakeChart(10, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(36)
  })

  it('shrinks to the smallest size of the range to fit the whole chart', () => {
    const chart = withRange(fakeChart(14, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(28)
  })

  it('keeps the largest size at which the bands fit when the whole chart cannot', () => {
    const chart = withRange(fakeChart(25, 12), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(33)
  })

  it('goes back to the base size and scrolls when not even the bands fit, without saying cramped', () => {
    const chart = withRange(fakeChart(40, 30), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(32)
    expect(chart.container.current.dataset.cramped).toBeUndefined()
  })

  it('reads the range again when the iPad turns', () => {
    let resize = () => {}
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback }
      observe() {}
      disconnect() {}
    })
    const chart = withRange(fakeChart(10, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(36)
    chart.content.current.style.setProperty('--chart-max', '30px')
    resize()
    expect(chart.size()).toBe(30)
  })
})
