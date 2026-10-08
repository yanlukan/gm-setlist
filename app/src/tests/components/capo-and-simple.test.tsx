import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { TopBar } from '../../components/layout/TopBar'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const verse = () => screen.getAllByText((_, el) => el?.className === 'chart-chords')[1]

describe('capo', () => {
  it('shows the shapes to play: Faith in B with a capo on 2 is played in A shapes', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<SongSheet />)
    expect(screen.getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
    expect(verse().textContent).toBe('A  D  A  D  A')
  })

  it('is picked from the top bar, which marks the easiest one', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a capo' }))
    const picker = screen.getByRole('dialog', { name: 'Capo' })
    expect(within(picker).getByText('Easiest')).toBeInTheDocument()
    fireEvent.click(within(picker).getByRole('button', { name: /Fret 4/ }))
    expect(useStore.getState().edits['Faith'].capo).toBe(4)
    expect(screen.getByRole('button', { name: 'Capo on fret 4. Change capo' })).toBeInTheDocument()
  })

  it('edits at the shapes shown and stores the chart at its own pitch', () => {
    useStore.getState().setCapo('Faith', 2)
    useStore.setState({ editMode: true })
    render(<SongSheet />)
    const verseGroup = screen.getByRole('group', { name: 'Verse' })
    // The first A shape of the verse becomes a D shape: with the capo on 2, an E
    fireEvent.click(within(verseGroup).getAllByRole('button', { name: 'A' })[0])
    fireEvent.click(within(screen.getByRole('group', { name: 'Chord keyboard' })).getByRole('button', { name: 'D' }))
    expect(useStore.getState().edits['Faith'].sections![1].chords).toBe('E  E  B  E  B')
  })
})

describe('acoustic or electric', () => {
  it("follows the song's sound, and switches for one song from the top bar", () => {
    render(<TopBar />)
    // Faith's sound is FUNK on the GX-10: electric
    const button = screen.getByRole('button', { name: /^Played on electric guitar/ })
    fireEvent.click(button)
    expect(useStore.getState().edits['Faith'].guitar).toBe('acoustic')
    expect(screen.getByRole('button', { name: /^Played on acoustic guitar/ })).toBeInTheDocument()
  })

  it('can be set for every song from the menu', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guitar: each song its own' }))
    expect(useStore.getState().guitar).toBe('electric')
  })
})

describe('simplified chords', () => {
  it('shows plain chords on the chart, and the real ones while editing', () => {
    useStore.setState({
      simpleChords: true,
      edits: { Faith: { sections: [{ name: 'Intro', chords: 'B' }, { name: 'Verse', chords: 'Bmaj7  E7/G#  C#m9' }] } },
    })
    // Faith is played on electric (its sound is FUNK): the 7ths and 9ths stay, the slash bass goes
    const { unmount } = render(<SongSheet />)
    expect(verse().textContent).toBe('Bmaj7  E7  C#m9')
    unmount()

    // On acoustic, the plain chords
    useStore.getState().setSongGuitar('Faith', 'acoustic')
    const second = render(<SongSheet />)
    expect(verse().textContent).toBe('B  E  C#m')
    second.unmount()

    useStore.setState({ editMode: true })
    render(<SongSheet />)
    const verseGroup = screen.getByRole('group', { name: 'Verse' })
    expect(within(verseGroup).getByRole('button', { name: 'Bmaj7' })).toBeInTheDocument()
  })

  it('is switched on from the menu', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: /Simplify Chords/ }))
    expect(useStore.getState().simpleChords).toBe(true)
  })
})
