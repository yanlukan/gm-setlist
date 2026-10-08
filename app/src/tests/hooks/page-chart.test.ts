import { afterEach, describe, expect, it, vi } from 'vitest'
import { pageChart } from '../../hooks/page-chart'

/** A 400px screen whose chords end `chordsEnd` px below its top, scrolled to `scrollTop`. */
function chart(chordsEnd: number, scrollTop = 0) {
  const scroll = document.createElement('div')
  scroll.className = 'chart-scroll'
  const chords = document.createElement('div')
  chords.className = 'chart-sections'
  scroll.appendChild(chords)
  document.body.appendChild(scroll)
  Object.defineProperty(scroll, 'clientHeight', { get: () => 400 })
  scroll.scrollTop = scrollTop
  scroll.getBoundingClientRect = () => ({ top: 0, bottom: 400 }) as DOMRect
  chords.getBoundingClientRect = () => ({ top: 0, bottom: chordsEnd }) as DOMRect
  const scrollBy = vi.fn()
  scroll.scrollBy = scrollBy as unknown as typeof scroll.scrollBy
  return scrollBy
}

afterEach(() => { document.body.innerHTML = '' })

describe('pedal paging through a long chart', () => {
  it('pages down while chords are hidden below the screen', () => {
    const scrollBy = chart(700)
    expect(pageChart(1)).toBe(true)
    expect(scrollBy).toHaveBeenCalledWith({ top: 320, behavior: 'smooth' })
  })

  it('turns the song when every chord is on screen, even if notes scroll below', () => {
    const scrollBy = chart(390)
    expect(pageChart(1)).toBe(false)
    expect(scrollBy).not.toHaveBeenCalled()
  })

  it('pages back up until the top of the chart is on screen', () => {
    const scrollBy = chart(300, 250)
    expect(pageChart(-1)).toBe(true)
    expect(scrollBy).toHaveBeenCalledWith({ top: -320, behavior: 'smooth' })
  })

  it('goes to the previous song from the top', () => {
    chart(700, 0)
    expect(pageChart(-1)).toBe(false)
  })

  it('changes song when there is no chart on screen', () => {
    expect(pageChart(1)).toBe(false)
    expect(pageChart(-1)).toBe(false)
  })
})
