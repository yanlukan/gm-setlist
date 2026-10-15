import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { PracticeScreen } from '../../components/practice/PracticeScreen'
import { useStore } from '../../store/use-store'
import { faithOneLine } from '../faith-one-line'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  faithOneLine()
})

const verse = () => screen.getAllByText((_, el) => el?.className === 'chart-chords')[1]

describe('capo', () => {
  it('shows the shapes to play: Faith in B with a capo on 2 is played in A shapes', () => {
    useStore.getState().setCapo('Faith', 2)
    render(<PracticeScreen />)
    expect(screen.getByText('Capo 2: play A shapes, sounds in B')).toBeInTheDocument()
    expect(verse().textContent).toBe('A  D  A  D  A')
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

describe('simplified chords', () => {
  it('shows plain chords on the chart, and the real ones while editing', () => {
    useStore.setState({
      simpleChords: true,
      edits: { Faith: { guitar: 'electric', sections: [{ name: 'Intro', chords: 'B' }, { name: 'Verse', chords: 'Bmaj7  E7/G#  C#m9' }] } },
    })
    // Faith played on electric: the 7ths and 9ths stay, the slash bass goes
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
})
