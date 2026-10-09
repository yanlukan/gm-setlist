import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TopBar } from '../../components/layout/TopBar'
import { SongSheet } from '../../components/song/SongSheet'
import { DiagramsBar } from '../../components/diagrams/DiagramsBar'
import { BottomBar } from '../../components/layout/BottomBar'
import { SongGrid } from '../../components/layout/SongGrid'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
const chords = () => screen.getAllByText((_, el) => el?.className === 'chart-chords')
const verse = () => chords()[1].textContent

describe('the instrument setting', () => {
  it('is the first thing in the menu and flips between guitar and keyboard', () => {
    render(<TopBar />)
    openMenu()
    const items = screen.getAllByRole('button', { name: /^Instrument: / })
    expect(items[0]).toHaveTextContent('Instrument: guitar')
    expect(screen.getByRole('button', { name: 'Hide Chord Diagrams' })).toBeInTheDocument()

    fireEvent.click(items[0])
    expect(useStore.getState().instrument).toBe('keyboard')

    openMenu()
    expect(screen.getByRole('button', { name: 'Instrument: keyboard' })).toBeInTheDocument()
    // Nothing about guitars is left in the menu
    expect(screen.queryByRole('button', { name: /Chord Diagrams/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Guitar: / })).toBeNull()
  })
})

describe('the keyboard view', () => {
  beforeEach(() => {
    useStore.getState().setInstrument('keyboard')
  })

  it('says Keyboard where the guitar and capo buttons were', () => {
    render(<TopBar />)
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guitar\. Switch to/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add a capo' })).toBeNull()
  })

  it("shows the chords as they sound, whatever capo the guitarist has on", () => {
    useStore.getState().setCapo('Faith', 2)
    render(<SongSheet />)
    expect(verse()).toBe('B  E  B  E  B')
    expect(screen.queryByText(/^Capo 2:/)).toBeNull()
  })

  it('keeps the capo for the guitarist: switching back shows the shapes again', () => {
    useStore.getState().setCapo('Faith', 2)
    const { rerender } = render(<SongSheet />)
    useStore.getState().setInstrument('guitar')
    rerender(<SongSheet />)
    expect(verse()).toBe('A  D  A  D  A')
    expect(screen.getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
  })

  it('shows no shapes, no neck position and no guitar sound', () => {
    const { container } = render(<><SongSheet /><DiagramsBar /></>)
    expect(screen.queryByRole('list', { name: /^Chord shapes/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /chord shapes/ })).toBeNull()
    expect(container.querySelector('.chart-position')).toBeNull()
    expect(container.querySelector('.chart-preset')).toBeNull()
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

  it('leaves the GX-10 preset off the song list and the Next button, but keeps the cue', () => {
    const songs = useStore.getState().setlistSongs()
    const withPreset = songs.findIndex((s, i) => i > 0 && songs[i - 1] && s.preset)
    useStore.getState().goToSong(withPreset - 1)
    const { container } = render(<BottomBar />)
    expect(container.querySelector('.songnav-preset')).toBeNull()

    render(<SongGrid songs={DEFAULT_SONGS} onClose={() => {}} />)
    expect(screen.queryByLabelText(/^Recommended position/)).toBeNull()
    expect(within(screen.getByRole('dialog')).getByText('Faith')).toBeInTheDocument()
  })
})
