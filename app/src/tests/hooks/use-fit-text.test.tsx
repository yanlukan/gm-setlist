import { describe, expect, it } from 'vitest'
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

  it('lays the chart out narrower when even the smallest size is too wide, and fits it again', () => {
    // Too wide at any size until the page lays it out narrower (bars two to a row on a phone)
    const chart = fakeChart(10, 8, content => (content.dataset.narrow ? 300 : 340))
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.content.current.dataset.narrow).toBe('on')
    expect(chart.size()).toBe(40)
  })

  it('keeps the usual layout when the chart is not too wide', () => {
    const chart = fakeChart(25, 12)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.content.current.dataset.narrow).toBeUndefined()
  })

  it('goes back to the usual layout when the next chart is not too wide', () => {
    let wide = 340
    const chart = fakeChart(10, 8, content => (content.dataset.narrow ? 300 : wide))
    const { rerender } = renderHook(({ key }) =>
      useFitText(chart.container, chart.content, key, { ...options, essentialRef: chart.sections }), { initialProps: { key: 'a' } })
    expect(chart.content.current.dataset.narrow).toBe('on')
    wide = 300
    rerender({ key: 'b' })
    expect(chart.content.current.dataset.narrow).toBeUndefined()
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
})
