import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
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

  it('keep a shape you pick by hand, and can go back to the band pick', () => {
    render(<DiagramsBar />)
    fireEvent.click(tile('E'))
    expect(screen.getByRole('button', { name: /band pick/ })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^E at Open/ })[0])
    expect(within(tile('E')).getByText('Open')).toBeInTheDocument()
    expect(useStore.getState().selectedVoicings.E).toBe(0)

    fireEvent.click(tile('E'))
    fireEvent.click(screen.getByRole('button', { name: 'Use the band pick again' }))
    expect(within(tile('E')).queryByText('Open')).toBeNull()
    expect(useStore.getState().selectedVoicings.E).toBeUndefined()
  })

  it('keep a pick saved before band shapes existed on the shape it meant', () => {
    useStore.setState({ selectedVoicings: { B: 0 } }) // the library's first B
    render(<DiagramsBar />)
    expect(within(tile('B')).queryByText(/^7th fret$/)).toBeNull() // not the band shape
  })

  it('keep open chords for the acoustic song', () => {
    open('Waiting (Reprise)')
    render(<DiagramsBar />)
    expect(within(tile('G')).getByText('Open')).toBeInTheDocument()
  })
})
