import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ChordFinder } from '../../components/finder/ChordFinder'
import { TopBar } from '../../components/layout/TopBar'
import { useStore } from '../../store/use-store'
import { setOwnShapes } from '../../music/voicings'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  setOwnShapes({})
})

const name = () => screen.getByRole('textbox', { name: 'Chord name' })
const lookUp = (text: string) => fireEvent.input(name(), { target: { value: text } })
const shapes = (chord: string) => screen.getByRole('group', { name: `Shapes for ${chord}` })
const more = (chord: string) => screen.getByRole('group', { name: `More shapes for ${chord}` })
const own = () => useStore.getState().ownShapes

describe('the chord finder', () => {
  it('reads the name as it is typed, names the notes and suggests chords that start the same way', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('em1')
    const suggestions = screen.getByRole('group', { name: 'Suggestions' })
    expect(within(suggestions).getAllByRole('button').map(b => b.textContent)).toEqual(['Em11', 'Em13'])
    lookUp('e min 11')
    expect(screen.getByRole('heading', { name: 'Em11' })).toBeInTheDocument()
    expect(screen.getByText('E G B D F# A')).toBeInTheDocument()
  })

  it('puts the chords of the song first among the suggestions, and fills the name from a tap', () => {
    render(<ChordFinder songChords={['B', 'E', 'G#m']} onClose={() => {}} />)
    lookUp('g')
    const suggestions = screen.getByRole('group', { name: 'Suggestions' })
    expect(within(suggestions).getAllByRole('button')[0]).toHaveTextContent('G#m')
    fireEvent.click(within(suggestions).getAllByRole('button')[0])
    expect((name() as HTMLInputElement).value).toBe('G#m')
    expect(screen.getByRole('heading', { name: 'G#m' })).toBeInTheDocument()
  })

  it('says when what is typed is not a chord', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('Hm')
    expect(screen.getByRole('status')).toHaveTextContent('Not a chord: Hm')
  })

  it('shows every shape the chart could use, with its frets and where it comes from', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('C')
    expect(within(shapes('C')).getByText('x-3-2-0-1-0')).toBeInTheDocument()
    expect(within(shapes('C')).getAllByText('Library').length).toBeGreaterThan(0)
    expect(within(shapes('C')).getAllByText('Generated').length).toBeGreaterThan(0)
    expect(within(shapes('C')).getByRole('button', { name: 'Play C at Open' })).toBeInTheDocument()
  })

  it('finds the shapes the chart list leaves out behind More shapes, by area of the neck', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('Em11')
    expect(screen.queryByText('x-x-2-2-3-5')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More shapes' }))
    // Thousands for a six-note chord: the area of the neck and the strings narrow them down
    fireEvent.click(screen.getByRole('button', { name: '1–3' }))
    fireEvent.click(screen.getByRole('button', { name: 'D–e' }))
    expect(within(more('Em11')).getByText('x-x-2-2-3-5')).toBeInTheDocument()
    expect(within(more('Em11')).queryByText('x-x-7-7-10-x')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '7–9' }))
    fireEvent.click(screen.getByRole('button', { name: 'D–B' }))
    expect(within(more('Em11')).getByText('x-x-7-7-10-x')).toBeInTheDocument()
    expect(within(more('Em11')).queryByText('x-x-2-2-3-5')).not.toBeInTheDocument()
  })

  it('keeps a found shape as yours', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('Em11')
    fireEvent.click(screen.getByRole('button', { name: 'More shapes' }))
    fireEvent.click(screen.getByRole('button', { name: '1–3' }))
    fireEvent.click(screen.getByRole('button', { name: 'D–e' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep x-x-2-2-3-5' }))
    expect(own().Em11).toEqual(['x-x-2-2-3-5'])
    expect(within(shapes('Em11')).getByText('x-x-2-2-3-5')).toBeInTheDocument()
    expect(within(shapes('Em11')).getByText('Yours')).toBeInTheDocument()
    expect(within(more('Em11')).queryByText('x-x-2-2-3-5')).not.toBeInTheDocument()
  })

  it('draws a shape you write, names what it sounds, and says which notes are outside the chord', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('Em11')
    const field = screen.getByRole('textbox', { name: 'Your shape' })
    fireEvent.input(field, { target: { value: 'x-x-2-2-3-6' } })
    expect(screen.getByText('E A D A#')).toBeInTheDocument()
    expect(screen.getByText('A# is not in Em11')).toBeInTheDocument()
    fireEvent.input(field, { target: { value: 'X X 7 7 10 X' } })
    expect(screen.getByText('A D A')).toBeInTheDocument()
    expect(screen.queryByText(/is not in Em11/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save shape' }))
    expect(own().Em11).toEqual(['x-x-7-7-10-x'])
    expect((field as HTMLInputElement).value).toBe('')
    expect(within(shapes('Em11')).getByText('x-x-7-7-10-x')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove x-x-7-7-10-x' }))
    expect(own().Em11).toBeUndefined()
    expect(within(shapes('Em11')).queryByText('x-x-7-7-10-x')).not.toBeInTheDocument()
  })

  it('says when a written shape cannot be read', () => {
    render(<ChordFinder onClose={() => {}} />)
    lookUp('Em11')
    fireEvent.input(screen.getByRole('textbox', { name: 'Your shape' }), { target: { value: 'x-x-2' } })
    expect(screen.getByText(/Six strings/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save shape' })).not.toBeInTheDocument()
  })

  it('opened from a song, a tapped shape becomes the song\'s pick and the finder closes', () => {
    useStore.getState().addOwnShape('E', '0-x-6-4-0-0')
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<ChordFinder chord="E" onPick={onPick} onClose={onClose} />)
    expect((name() as HTMLInputElement).value).toBe('E')
    fireEvent.click(screen.getByRole('button', { name: 'E at Open' }))
    expect(onPick).toHaveBeenCalledWith('E', expect.any(Number))
    fireEvent.click(screen.getByRole('button', { name: 'E at 4th fret, yours' }))
    expect(onPick).toHaveBeenLastCalledWith('E', '0-x-6-4-0-0')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('opened from a song, a found shape is kept as yours and picked in one tap', () => {
    const onPick = vi.fn()
    render(<ChordFinder chord="Em11" onPick={onPick} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'More shapes' }))
    fireEvent.click(screen.getByRole('button', { name: '1–3' }))
    fireEvent.click(screen.getByRole('button', { name: 'D–e' }))
    fireEvent.click(within(more('Em11')).getByRole('button', { name: 'Em11 at 2nd fret, x-x-2-2-3-5' }))
    expect(own().Em11).toEqual(['x-x-2-2-3-5'])
    expect(onPick).toHaveBeenCalledWith('Em11', 'x-x-2-2-3-5')
  })
})

describe('the chord finder in the menu', () => {
  it('opens from the menu, on stage too', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chord Finder…' }))
    expect(screen.getByRole('dialog', { name: 'Chord Finder' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Chord Finder' })).not.toBeInTheDocument()
  })
})
