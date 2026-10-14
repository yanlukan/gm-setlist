import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { PracticeHeader } from '../../components/practice/PracticeHeader'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { DEFAULT_SONGS, GIG_SETLIST_2026 as G } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { moveChords } from '../../store/song-shapes'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const mine = faith.sections.map((s, i) => (i === 1 ? { ...s, chords: 'B  A' } : s))

/** The header as the Practice screen draws it, for the song on screen. */
function Header() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  return chart ? <PracticeHeader chart={chart} extraFrom={extraFrom} /> : null
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})
afterEach(() => {
  vi.restoreAllMocks()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const keyButton = () => button(/^Key /)
const goTo = (title: string) => act(() => useStore.getState().goToSong(G.indexOf(title)))

describe('the title row', () => {
  it('has the title, the artist and the songbook number', () => {
    render(<Header />)
    expect(screen.getByRole('heading', { name: 'Faith' })).toBeInTheDocument()
    expect(screen.getByText(faith.artist)).toBeInTheDocument()
    expect(screen.getByLabelText('Songbook no. 12')).toHaveTextContent('Book 12')
  })

  it('has no songbook badge for a song not in the book', () => {
    goTo('Amazing')
    render(<Header />)
    expect(screen.queryByLabelText(/^Songbook no\./)).toBeNull()
  })

  it('tags an extra song', () => {
    useStore.getState().playExtra(G[20], 'default')
    render(<Header />)
    expect(screen.getByRole('heading', { name: G[20] })).toBeInTheDocument()
    expect(screen.getByText(/^Extra · from /)).toBeInTheDocument()
  })

  it('says EDITED for your own chords, and one tap goes back to the original', () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ edits: { Faith: { sections: mine } } })
    render(<Header />)
    const tag = button('This chart has your own edits. Go back to the original chart')
    expect(tag).toHaveTextContent('EDITED')
    fireEvent.click(tag)
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    expect(useStore.getState().toast).toBe('Faith shows the original chart')
  })

  it('has no EDITED tag and no song order while editing', () => {
    useStore.setState({ edits: { Faith: { sections: mine } }, editMode: true })
    render(<Header />)
    expect(screen.queryByRole('button', { name: /Go back to the original chart/ })).toBeNull()
    expect(button('Reset')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Song order:/ })).toBeNull() // the editor has its own
  })
})

describe('the setup row', () => {
  it('moves the key down and up, and shows a moved key in orange', () => {
    render(<Header />)
    expect(keyButton().classList.contains('is-moved')).toBe(false)
    fireEvent.click(button('Transpose up'))
    expect(useStore.getState().edits['Faith'].transpose).toBe(1)
    expect(keyButton().classList.contains('is-moved')).toBe(true)
    fireEvent.click(button('Transpose down'))
    fireEvent.click(button('Transpose down'))
    expect(useStore.getState().edits['Faith'].transpose).toBe(-1)
  })

  it("toggles a song with a band key between the band key and the original recording's", () => {
    goTo("I'm Your Man")
    render(<Header />)
    expect(keyButton()).toHaveAccessibleName(/Show original key$/)
    expect(keyButton().classList.contains('is-moved')).toBe(true) // the band plays it 2 lower
    fireEvent.click(keyButton())
    expect(useStore.getState().edits["I'm Your Man"].transpose).toBe(0)
    expect(keyButton()).toHaveAccessibleName(/Back to band key$/)
    fireEvent.click(keyButton())
    expect(useStore.getState().edits["I'm Your Man"]?.transpose).toBeUndefined()
  })

  it('picks a capo, marking the easiest one', () => {
    render(<Header />)
    fireEvent.click(button('Add a capo'))
    const picker = screen.getByRole('dialog', { name: 'Capo' })
    expect(within(picker).getByText('Easiest')).toBeInTheDocument()
    fireEvent.click(within(picker).getByRole('button', { name: /Fret 4/ }))
    expect(useStore.getState().edits['Faith'].capo).toBe(4)
    expect(button('Capo on fret 4. Change capo')).toHaveTextContent('Capo 4')
  })

  it("follows the song's sound, and switches the guitar for this song only", () => {
    render(<Header />) // Faith's sound is FUNK on the GX-10: electric
    fireEvent.click(button(/^Played on electric guitar/))
    expect(useStore.getState().edits['Faith'].guitar).toBe('acoustic')
    expect(button(/^Played on acoustic guitar/)).toHaveTextContent('Acoustic')
  })

  it('opens Move chords, showing where the shapes sit', () => {
    render(<Header />)
    const move = button('Recommended position: frets 2 to 9. Move the chords')
    expect(move).toHaveTextContent('Frets 2–9')
    fireEvent.click(move)
    const sheet = screen.getByRole('dialog', { name: 'Move chords' })
    expect(within(sheet).getByText('Songbook')).toBeInTheDocument()
  })

  it('shows a moved song as yours', () => {
    moveChords('Faith', 7)
    render(<Header />)
    expect(button(/^Your position: frets \d+ to \d+\. Move the chords$/)).toBeInTheDocument()
  })

  it('turns Edit into Done, with Reset and the save status beside it', () => {
    render(<Header />)
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(button('Edit'))
    expect(useStore.getState().editMode).toBe(true)
    expect(button('Done')).toBeInTheDocument()
    expect(button('Reset')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('asks before Reset', () => {
    const reset = vi.fn()
    useStore.setState({ editMode: true, resetEdits: reset })
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Header />)
    fireEvent.click(button('Reset'))
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('Earlier versions'))
    expect(reset).not.toHaveBeenCalled()
    ask.mockReturnValue(true)
    fireEvent.click(button('Reset'))
    expect(reset).toHaveBeenCalledWith('Faith')
  })
})

describe('the facts and the song order', () => {
  it('has BPM, time and the GX-10 sound as text', () => {
    render(<Header />)
    expect(screen.getByText(`${faith.bpm} BPM`)).toBeInTheDocument()
    expect(screen.getByText(faith.timeSignature)).toBeInTheDocument()
    expect(screen.getByLabelText(new RegExp(`^GX-10 sound: ${faith.preset!.name}`))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /BPM|tempo/i })).toBeNull()
  })

  it('says LOWER KEY when the band plays it lower and no transpose is set', () => {
    goTo("I'm Your Man")
    useStore.getState().setTranspose("I'm Your Man", 0)
    render(<Header />)
    expect(screen.getByText('LOWER KEY')).toBeInTheDocument()
  })

  it('has no song order: the panel has it, in words', () => {
    render(<Header />)
    expect(screen.queryByRole('group', { name: /^Song order: / })).toBeNull()
  })
})

describe('the keyboard', () => {
  it('the keyboard has no capo, guitar or Move chords', () => {
    useStore.getState().setInstrument('keyboard')
    render(<Header />)
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /capo/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /guitar\. Switch to/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move the chords/ })).toBeNull()
    expect(screen.queryByLabelText(/^GX-10 sound/)).toBeNull()
    expect(keyButton()).toBeInTheDocument() // the key still moves
  })
})
