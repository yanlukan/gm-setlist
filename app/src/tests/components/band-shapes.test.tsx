import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
import { SongSheet } from '../../components/song/SongSheet'
import { SongGrid } from '../../components/layout/SongGrid'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const tile = (name: string) =>
  within(screen.getByRole('list', { name: /^Chord shapes/ })).getByRole('listitem', { name })

const open = (title: string) => {
  const { setlistData } = useStore.getState()
  useStore.getState().goToSong(setlistData.lists[setlistData.activeId].songTitles.indexOf(title))
}

describe('chord shapes for electric guitar', () => {
  it('show compact band shapes up the neck by default, not open chords', () => {
    render(<DiagramsBar />) // Faith: B E G#m C#m F#
    for (const name of ['B', 'E', 'G#m', 'C#m', 'F#']) {
      expect(within(tile(name)).queryByText('Open'), name).toBeNull()
      expect(within(tile(name)).getByText(/^\d+(st|nd|rd|th) fret$/)).toBeInTheDocument()
    }
  })

  it('keep a shape you pick by hand, and can go back to the recommended one', () => {
    render(<DiagramsBar />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('button', { name: /recommended, selected/ })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^E at Open/ })[0])
    expect(within(tile('E')).getByText('Open')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Your pick')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBe(0)

    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Use the recommended shape' }))
    expect(within(tile('E')).queryByText('Open')).toBeNull()
    expect(within(tile('E')).getByText('Recommended')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })

  it('keep a pick saved before band shapes existed on the shape it meant', () => {
    useStore.setState({ selectedVoicings: { B: 0 } }) // the library's first B
    render(<DiagramsBar />)
    expect(within(tile('B')).queryByText(/^7th fret$/)).toBeNull() // not the band shape
  })

  it('mark every shape the song recommends', () => {
    render(<DiagramsBar />) // Faith
    for (const name of ['B', 'E', 'G#m', 'C#m', 'F#']) expect(within(tile(name)).getByText('Recommended')).toBeInTheDocument()
  })

  it("show the song's recommended area of the neck on its title line", () => {
    render(<SongSheet />) // Faith
    const position = screen.getByLabelText(/^Recommended position: frets \d+ to \d+$/)
    expect(position).toHaveTextContent(/^Frets \d+–\d+$/)
    expect(position.parentElement).toBe(screen.getByRole('heading', { name: 'Faith' }).parentElement)
  })

  it('list every song with its recommended position', () => {
    const songs = GIG_SETLIST_2026.map(title => DEFAULT_SONGS.find(s => s.title === title)!)
    render(<SongGrid songs={songs} onClose={() => {}} />)
    const positions = screen.getAllByLabelText(/^Recommended position: /)
    expect(positions).toHaveLength(21)
    expect(positions.filter(p => p.textContent === 'Open position')).toHaveLength(1) // Waiting
    for (const p of positions) expect(p.textContent).toMatch(/^(Frets \d+–\d+|Open position)$/)
  })

  it('call the acoustic song open position', () => {
    open('Waiting (Reprise)')
    render(<SongSheet />)
    expect(screen.getByLabelText('Recommended position: open position')).toHaveTextContent('Open position')
  })

  it('keep open chords for the acoustic song', () => {
    open('Waiting (Reprise)')
    render(<DiagramsBar />)
    expect(within(tile('G')).getByText('Open')).toBeInTheDocument()
  })
})
