import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'
import { startOn } from '../start-on'

// A section written in bars shows as a cell per bar in a grid of four columns
// (eight in landscape, two on a phone). Every line is padded to four cells, so
// bar 1 of every line is in the first column.

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  startOn('Faith')
})

const faith = (chords: string) => {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords }])
  return render(<SongSheet />).container
}
/**
 * The grid's cells as a row of four draws them (and a phone's row of two): a
 * bar by its text, a blank cell by the rows it shows in.
 */
const cells = (grid: Element) =>
  Array.from(grid.children)
    .filter(cell => !cell.classList.contains('pad-eight'))
    .map(cell => (cell.classList.contains('pad-both') ? 'both' : cell.classList.contains('pad-wide') ? 'wide' : cell.textContent))
/** The cells as a row of eight draws them: a blank cell as a dot. */
const eight = (grid: Element) =>
  Array.from(grid.children)
    .filter(cell => !cell.classList.contains('pad-four'))
    .map(cell => (cell.classList.contains('bar-pad') ? '·' : cell.textContent))
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
    const page = faith('|  D  |  G  |  A  |  D  |  E  |')
    expect(named(page, 'phrase-start')).toEqual(['E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('joins two four-bar lines with one phrase line when they share a row', () => {
    const page = faith('|  A  |  B  |  C  |  D  |\n|  E  |  F  |  G  |  A  |')
    expect(named(page, 'phrase-start')).toEqual(['E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })
})

// After the rehearsal of 2026-11-24 the player found the Stage chart confusing:
// a line of one or two bars sat in its own half of an eight-bar row, with a
// hole after it and the next line starting past the hole. On a row of eight a
// line of one or two bars is now followed straight away by the next line, when
// both fit in the row, with the strong phrase line between them. Rows of four
// (the iPad upright, Practice) and a phone's rows of two keep a row per line.
describe('a short line on a row of eight bars', () => {
  it('is followed straight away by the next line, with the holes at the end of the row', () => {
    const grid = faith('|  D  |\n|  G  |  A  |  Bm  |  C  |\n|  E  |  F  |  G  |  A  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['D', 'G', 'A', 'Bm', 'C', '·', '·', '·', 'E', 'F', 'G', 'A'])
    // A row of four keeps a row for each line
    expect(cells(grid)).toEqual(['D', 'both', 'wide', 'wide', 'G', 'A', 'Bm', 'C', 'E', 'F', 'G', 'A'])
  })

  it('draws the strong phrase line where the next line starts, and not in the middle of it', () => {
    const page = faith('|  D  |\n|  G  |  A  |  Bm  |  C  |\n|  E  |  F  |  G  |  A  |')
    expect(named(page, 'phrase-start')).toEqual(['G'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('joins a two-bar line and the three-bar line after it', () => {
    const grid = faith('|  G  |  A  |\n|  Bm  |  C  |  D  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['G', 'A', 'Bm', 'C', 'D', '·', '·', '·'])
    expect(cells(grid)).toEqual(['G', 'A', 'wide', 'wide', 'Bm', 'C', 'D', 'both'])
  })

  it('keeps its own half of the row when the next line would not fit beside it', () => {
    const grid = faith('|  A  |  B  |  C  |  D  |\n|  E  |  F  |\n|  G  |  A  |  B  |  C  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '·', '·', 'G', 'A', 'B', 'C'])
  })

  it('leaves a line of three bars in its half, so the four bars after it start the second half', () => {
    const grid = faith('|  A  |  B  |  C  |\n|  D  |  E  |  F  |  G  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['A', 'B', 'C', '·', 'D', 'E', 'F', 'G'])
  })

  it('pads to the end of the row after the joined lines, so the line after them starts a row', () => {
    const grid = faith('|  A  |  B  |\n|  C  |  D  |  E  |  F  |\n|  G  |  A  |  B  |  C  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '·', '·', 'G', 'A', 'B', 'C'])
    expect(cells(grid)).toEqual(['A', 'B', 'wide', 'wide', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'])
  })

  it('a short last line is as it was: on its own, with the holes after it', () => {
    const grid = faith('|  A  |  B  |  C  |  D  |\n|  E  |').querySelector('.bar-grid')!
    expect(eight(grid)).toEqual(['A', 'B', 'C', 'D', 'E', '·', '·', '·'])
  })
})

describe('a section written in bars, drawn', () => {
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
