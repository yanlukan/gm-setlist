import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { BottomBar } from '../../components/layout/BottomBar'
import { useStore } from '../../store/use-store'
import { faithOneLine } from '../faith-one-line'
import { soundFor } from '../../music/gx10'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  faithOneLine()
})

const chords = () => screen.getAllByText((_, el) => el?.className === 'chart-chords')
const verse = () => chords()[1].textContent

// The instrument setting is in the More sheet (bar-sheets.test.tsx); the
// Keyboard badge in the setup row is in practice-header.test.tsx.
describe('the keyboard view', () => {
  beforeEach(() => {
    useStore.getState().setInstrument('keyboard')
  })

  it("shows the chords as they sound, whatever capo the guitarist has on", () => {
    useStore.getState().setCapo('Faith', 2)
    render(<SongSheet />)
    expect(verse()).toBe('B  E  B  E  B')
    expect(screen.queryByText(/^Capo 2:/)).toBeNull()
  })

  it('keeps the capo for the guitarist: switching back shows the shapes again', () => {
    useStore.getState().setCapo('Faith', 2)
    const { rerender } = render(<PracticeScreen />)
    useStore.getState().setInstrument('guitar')
    rerender(<PracticeScreen />)
    expect(verse()).toBe('A  D  A  D  A')
    expect(screen.getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('shows no shapes, no neck position and no guitar sound', () => {
    const { container } = render(<PracticeScreen />)
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move the chords/ })).toBeNull()
    expect(screen.queryByLabelText(/^GX-10 sound/)).toBeNull()
    // Chords and section names are plain text: nothing to pick a shape for
    expect(container.querySelector('.chart-chord-tap')).toBeNull()
    expect(container.querySelector('.chart-label-btn')).toBeNull()
    expect(container.querySelector('.chart-label')?.textContent).toBe('Intro')
  })

  it('simplifies to plain chords even on an electric song', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'Bmaj7  E9  C#m7' }])
    useStore.getState().toggleSimpleChords()
    render(<SongSheet />)
    expect(chords()[0].textContent).toBe('B  E  C#m')
  })

  it('leaves the GX-10 preset off the song list and the Next button', () => {
    const songs = useStore.getState().setlistSongs()
    const withPreset = songs.findIndex((s, i) => i > 0 && songs[i - 1] && soundFor(s.title))
    useStore.getState().goToSong(withPreset - 1)
    const { container } = render(<BottomBar />)
    expect(container.querySelector('.bb-preset')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Songs, / }))
    const sheet = screen.getByRole('dialog', { name: 'All songs' })
    expect(within(sheet).queryByLabelText(/^Recommended position/)).toBeNull()
    expect(within(sheet).getByText('Faith')).toBeInTheDocument()
  })
})
