import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

// A section written in bars shows as a cell per bar in a grid of four columns
// (eight in landscape, two on a phone). Every line is padded to four cells, so
// bar 1 of every line is in the first column.

beforeEach(() => useStore.setState(useStore.getInitialState()))

const faith = (chords: string) => {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords }])
  return render(<SongSheet />).container
}
/** The grid's cells: a bar by its text, a blank cell by the rows it shows in. */
const cells = (grid: Element) =>
  Array.from(grid.children).map(cell =>
    cell.classList.contains('pad-both') ? 'both' : cell.classList.contains('pad-wide') ? 'wide' : cell.textContent,
  )
const named = (page: Element, cls: string) => Array.from(page.querySelectorAll(`.${cls}`)).map(cell => cell.textContent)

const LINES = [
  '|  D  |',
  '|  G  |  A  |',
  '|  Bm  |  G  |  A  |',
  '|  D  |  %  |  G  |  A  |',
  '|  D  |  G  |  A  |  D  |  E  |',
].join('\n')

describe('a section written in bars', () => {
  it('pads every line to four cells, so bar 1 of every line is in the first column', () => {
    const grid = faith(LINES).querySelector('.bar-grid')!
    expect(cells(grid)).toEqual([
      'D', 'both', 'wide', 'wide',
      'G', 'A', 'wide', 'wide',
      'Bm', 'G', 'A', 'both',
      'D', '%', 'G', 'A',
      'D', 'G', 'A', 'D', 'E', 'both', 'wide', 'wide',
    ])
    expect(grid.querySelectorAll('.bar')).toHaveLength(15)
    expect(Array.from(grid.querySelectorAll('.bar-pad')).every(pad => pad.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(grid.querySelector('.bar-repeat')?.getAttribute('aria-label')).toBe('Repeat the bar before')
  })

  it('marks where the second four bars of an eight-bar row start', () => {
    const page = faith(LINES)
    expect(named(page, 'phrase-start')).toEqual(['G', 'D', 'E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('joins two four-bar lines with one phrase line when they share a row', () => {
    const page = faith('|  A  |  B  |  C  |  D  |\n|  E  |  F  |  G  |  A  |')
    expect(named(page, 'phrase-start')).toEqual(['E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('keeps a repeat count at the end of its bar, marks shared bars and draws one double bar', () => {
    const page = faith('|  A  |  B  (x2)  |\n|  F#  N.C.  |')
    const bars = page.querySelectorAll('.bar')
    expect(bars[1].textContent).toBe('B(x2)')
    expect(bars[1].lastElementChild!.classList.contains('bar-count')).toBe(true)
    expect(bars[1].classList.contains('bar-shared')).toBe(false)
    expect(bars[2].classList.contains('bar-shared')).toBe(true)
    expect(bars[2].querySelector('.chart-mark')?.textContent).toBe('N.C.')
    expect(page.querySelectorAll('.bar-double')).toHaveLength(1)
    expect(bars[0].classList.contains('bar-double')).toBe(true)
  })

  it('runs a line not in bars across the row, with no double bar after it', () => {
    const page = faith('N.C.\n|  D  |  G  |\nD  G  A')
    expect(named(page, 'bar-plain')).toEqual(['N.C.', 'D  G  A'])
    expect(page.querySelector('.bar-double')).toBeNull()
  })

  it('draws every section of a chart in bars as a band, even one written without bars', () => {
    useStore.getState().saveSections('Faith', [
      { name: 'Intro', chords: '|  B  |' },
      { name: 'Verse', chords: 'D  G\nA  D' },
    ])
    const page = render(<SongSheet />).container
    expect(named(page, 'bar-plain')).toEqual(['D  G', 'A  D'])
  })

  it('leaves a chart without bars as typed lines', () => {
    const page = faith('D  G\nA  D')
    expect(page.querySelector('.bar-grid')).toBeNull()
    expect(page.querySelectorAll('.chart-chords .chart-line')).toHaveLength(2)
  })
})
