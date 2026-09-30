import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const open = (title: string) => {
  const { setlistData } = useStore.getState()
  useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title))
}
const renderChart = () => render(<><SongSheet /><DiagramsBar /></>)
/** The chord shapes in the diagrams bar, in order. */
const shapes = () =>
  within(screen.getByRole('list', { name: /^Chord shapes/ }))
    .getAllByRole('listitem')
    .map(el => el.getAttribute('aria-label'))

const FAITH_ALL = ['B', 'E', 'G#m', 'C#m', 'F#']

describe('tapping a section on the chart', () => {
  it("shows just that section's chord shapes, and tapping it again shows them all", () => {
    renderChart() // Faith
    expect(shapes()).toEqual(FAITH_ALL)

    fireEvent.click(screen.getByRole('button', { name: 'Intro' }))
    expect(shapes()).toEqual(['B'])
    expect(screen.getByRole('button', { name: 'Intro' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Pre-Chorus' }))
    expect(shapes()).toEqual(['E', 'B', 'G#m', 'C#m', 'F#'])

    fireEvent.click(screen.getByRole('button', { name: 'Pre-Chorus' }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('can be undone from the diagrams bar too', () => {
    renderChart()
    fireEvent.click(screen.getByRole('button', { name: 'Intro' }))
    fireEvent.click(screen.getByRole('button', { name: /Show the whole song/ }))
    expect(shapes()).toEqual(FAITH_ALL)
  })

  it('lets go when the song changes', () => {
    renderChart()
    fireEvent.click(screen.getByRole('button', { name: 'Intro' }))
    act(() => useStore.getState().nextSong())
    expect(screen.queryByRole('button', { name: /Show the whole song/ })).toBeNull()
    expect(screen.getByRole('list', { name: 'Chord shapes' })).toBeInTheDocument()
  })

  it('shows the shapes in the key the band plays', () => {
    open('Kissing a Fool') // the book's Eb, played in D
    renderChart()
    fireEvent.click(screen.getByRole('button', { name: 'Last verse' }))
    expect(shapes()).toEqual(['D6', 'D#dim7', 'Em7', 'Bb(b5)', 'A7'])
  })

  it('leaves plain labels when the diagrams are hidden', () => {
    useStore.setState({ diagramsVisible: false })
    render(<SongSheet />)
    expect(screen.queryByRole('button', { name: 'Intro' })).toBeNull()
    // The song order under the title also says Intro: look at the chart's own labels
    const labels = document.querySelector('.chart-sections') as HTMLElement
    expect(within(labels).getByText('Intro')).toBeInTheDocument()
  })
})
