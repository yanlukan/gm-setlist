import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

// A section written in bars shows as a box per bar, the boxes of every line
// in the same columns.

beforeEach(() => useStore.setState(useStore.getInitialState()))

const faith = (chords: string) => {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords }])
  return render(<SongSheet />).container
}
const rows = (grid: Element) => Array.from(grid.children).map(cell => cell.textContent)

describe('a section written in bars', () => {
  it('draws a box per bar, as many columns as the longest line has bars', () => {
    const page = faith('|  D  |  %  |  G  A  |  D  |\nN.C.\n|  Bm7  |  G  |')
    const grid = page.querySelector('.bar-grid')!
    // 4 columns, or 2 (bars 1-2 over 3-4) when the chart is laid out narrow on a phone
    expect((grid as HTMLElement).style.getPropertyValue('--bars')).toBe('4')
    expect((grid as HTMLElement).style.getPropertyValue('--bars-half')).toBe('2')
    expect(rows(grid)).toEqual(['D', '%', 'GA', 'D', 'N.C.', 'Bm7', 'G'])
    expect(grid.querySelectorAll('.bar-first')).toHaveLength(2)
    expect(grid.querySelector('.bar-plain')?.textContent).toBe('N.C.')
    expect(grid.querySelector('.bar-repeat')?.getAttribute('aria-label')).toBe('Repeat the bar before')
  })
  it('leaves a section without bars as typed lines', () => {
    const page = faith('D  G\nA  D')
    expect(page.querySelector('.bar-grid')).toBeNull()
    expect(page.querySelectorAll('.chart-chords .chart-line')).toHaveLength(2)
  })
})
