import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
import { useStore } from '../../store/use-store'
import { moveChords } from '../../store/song-shapes'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

// Faith: the songbook's shapes, the riff at the 7th fret and the barres lower
const position = () => screen.getByRole('button', { name: 'Recommended position: frets 2 to 9. Move the chords' })
const sheet = () => screen.getByRole('dialog', { name: 'Move chords' })
const neck = () => useStore.getState().edits.Faith?.neck

describe('moving the chords from the title line', () => {
  it('opens from the position on the title line and says where the shapes come from', () => {
    render(<SongSheet />)
    fireEvent.click(position())
    expect(sheet()).toHaveTextContent('Frets 2–9')
    expect(within(sheet()).getByText('Songbook')).toBeInTheDocument()
    // The shapes the song would be played with, so the player sees what a move gives
    expect(within(sheet()).getAllByRole('img').length).toBeGreaterThanOrEqual(5) // B E G#m C#m F#
    expect(within(sheet()).getAllByText('7th fret').length).toBeGreaterThanOrEqual(1) // the B riff
  })

  it('moves every chord off the songbook, then lower or higher, and back in one tap', () => {
    render(<SongSheet />)
    fireEvent.click(position())
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Move the chords' }))
    const moved = neck()!
    expect(moved).toBeGreaterThanOrEqual(3)
    expect(within(sheet()).getByText('Moved by you')).toBeInTheDocument()

    fireEvent.click(within(sheet()).getByRole('button', { name: 'Move the chords higher on the neck' }))
    expect(neck()).toBe(Math.min(12, moved + 2))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Move the chords lower on the neck' }))
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Move the chords lower on the neck' }))
    expect(neck()).toBe(Math.max(3, Math.min(12, moved + 2) - 4))

    fireEvent.click(within(sheet()).getByRole('button', { name: 'Back to songbook' }))
    expect(neck()).toBeUndefined()
    expect(sheet()).toHaveTextContent('Frets 2–9')
    expect(within(sheet()).getByText('Songbook')).toBeInTheDocument()

    fireEvent.click(within(sheet()).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog', { name: 'Move chords' })).not.toBeInTheDocument()
  })

  it('shows a moved song as yours on the title line', () => {
    moveChords('Faith', 7)
    render(<SongSheet />)
    expect(screen.getByRole('button', { name: /^Your position: frets \d+ to \d+\. Move the chords$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Recommended position/ })).not.toBeInTheDocument()
  })

  it('is not a button on stage, where nothing on the chart changes', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<SongSheet />)
    expect(screen.queryByRole('button', { name: /Move the chords/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Recommended position: frets 2 to 9')).toHaveTextContent('Frets 2–9')
  })

  it('has left the chord diagrams, which keep their whole strip for the shapes', () => {
    render(<DiagramsBar />)
    expect(screen.queryByText('Move chords')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Move the chords on the neck' })).not.toBeInTheDocument()
  })
})
