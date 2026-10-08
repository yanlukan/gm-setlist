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
  it("show Faith's shapes from the songbook by default, marked with where they come from", () => {
    render(<DiagramsBar />) // Faith
    expect(within(tile('B')).getByText('7th fret')).toBeInTheDocument() // 7-9-9-8-7-7
    expect(within(tile('B')).getByText('Songbook')).toBeInTheDocument()
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument() // 0-7-9-9-9-x
    expect(within(tile('G#m')).getByText('4th fret')).toBeInTheDocument() // 4-6-6-4-4-4
    expect(within(tile('F#')).getByText('2nd fret')).toBeInTheDocument() // 2-4-4-3-2-2
  })

  it('drop the songbook marks when the song is moved to another key', () => {
    useStore.getState().setTranspose('Faith', -2)
    render(<DiagramsBar />)
    expect(screen.queryByText('Songbook')).not.toBeInTheDocument()
    expect(within(tile('A')).getByText('Electric')).toBeInTheDocument()
  })

  it('keep a shape you pick by hand, and can go back to the recommended one', () => {
    render(<DiagramsBar />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('button', { name: /^E at 7th fret, recommended, selected$/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'E at Open' }))
    expect(within(tile('E')).getByText('Open')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Your pick')).toBeInTheDocument()

    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Use the recommended shape' }))
    expect(within(tile('E')).getByText('7th fret')).toBeInTheDocument()
    expect(within(tile('E')).getByText('Songbook')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })

  it('keep a pick saved before recommendations existed on the shape it meant', () => {
    useStore.setState({ selectedVoicings: { B: 0 } }) // the library's first B: x-2-4-4-4-2
    render(<DiagramsBar />)
    expect(within(tile('B')).getByText('2nd fret')).toBeInTheDocument()
    expect(within(tile('B')).getByText('Your pick')).toBeInTheDocument()
  })

  it('mark every shape the song recommends', () => {
    render(<DiagramsBar />) // Faith
    for (const name of ['B', 'E', 'G#m', 'C#m', 'F#'])
      expect(within(tile(name)).getByText('Songbook')).toBeInTheDocument()
  })

  it("show the song's recommended area of the neck on its title line", () => {
    render(<SongSheet />) // Faith
    const position = screen.getByLabelText('Recommended position: frets 2 to 9')
    expect(position).toHaveTextContent('Frets 2–9') // the riff at the 7th fret, the pre-chorus barres lower
    expect(position.parentElement).toBe(screen.getByRole('heading', { name: 'Faith' }).parentElement)
  })

  it('list every song with its recommended position', () => {
    const songs = GIG_SETLIST_2026.map(title => DEFAULT_SONGS.find(s => s.title === title)!)
    render(<SongGrid songs={songs} onClose={() => {}} />)
    const positions = screen.getAllByLabelText(/^Recommended position: /)
    expect(positions).toHaveLength(21)
    for (const p of positions) expect(p.textContent).toMatch(/^(Frets \d+–\d+|Open position|Open to fret \d+)$/)
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
