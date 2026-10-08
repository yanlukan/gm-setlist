import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFitText } from '../../hooks/use-fit-text'

/**
 * jsdom has no layout, so the chart is faked: a 400px tall screen, a whole
 * chart `lines` lines tall, and chord sections ending after `chordLines`.
 */
function fakeChart(lines: number, chordLines: number) {
  const container = document.createElement('div')
  const content = document.createElement('div')
  const sections = document.createElement('div')
  const px = () => parseInt(content.style.fontSize) || 0
  Object.defineProperty(container, 'clientHeight', { get: () => 400 })
  Object.defineProperty(container, 'clientWidth', { get: () => 300 })
  Object.defineProperty(container, 'scrollWidth', { get: () => 300 })
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

  it('keeps the smallest size when not even the chords fit', () => {
    const chart = fakeChart(40, 30)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...options, essentialRef: chart.sections }))
    expect(chart.size()).toBe(20)
  })
})
