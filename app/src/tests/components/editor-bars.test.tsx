import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { GIG_SETLIST_2026 } from '../../data/songs'
import { useStore } from '../../store/use-store'

// Bar lines and repeat bars go in from the chord keyboard, and the editor
// saves the lines it shows.

const LOVE = "I Can't Make You Love Me"

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ editMode: true })
})

const section = (name: string) => screen.getAllByRole('group', { name })[0]
const keyboard = () => screen.getByRole('group', { name: 'Chord keyboard' })
const tap = (name: string) => fireEvent.click(within(keyboard()).getByRole('button', { name }))
const chord = (name: string, index: number) =>
  fireEvent.click(Array.from(section(name).querySelectorAll('.ce-chord'))[index])
const saved = (title: string, i: number) => useStore.getState().edits[title]?.sections?.[i]?.chords

function faithWith(verse: string) {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: verse }])
  render(<SongSheet />)
}
function love() {
  useStore.setState({ currentIndex: GIG_SETLIST_2026.indexOf(LOVE) })
  render(<SongSheet />)
}

describe('bars in the editor', () => {
  it('puts a bar line after the chord selected, never in its place', () => {
    faithWith('D  G  C')
    chord('Verse', 0)
    tap('Bar line')
    expect(saved('Faith', 0)).toBe('D  |  G  C')
  })

  it('puts a repeat bar at the cursor, and draws bar lines as their own buttons', () => {
    faithWith('|  D  |')
    fireEvent.click(within(section('Verse')).getByRole('button', { name: 'Cursor at the end of line 1' }))
    tap('Repeat the bar before')
    expect(saved('Faith', 0)).toBe('|  D  |  %')
    expect(section('Verse').querySelectorAll('.ce-chord.is-bar')).toHaveLength(2)
    expect(section('Verse').querySelectorAll('.ce-chord.is-repeat')).toHaveLength(1)
  })

  it('takes out a bar line selected, like a chord', () => {
    faithWith('|  D  |  G  |')
    chord('Verse', 2)
    expect(within(keyboard()).getByText('Bar line selected: Delete takes it out')).toBeTruthy()
    tap('Delete')
    expect(saved('Faith', 0)).toBe('|  D  G  |')
  })

  it('leaves the song on the built-in chart when a bar line put in is undone', () => {
    love()
    chord('Verse', 0)
    tap('Bar line')
    expect(saved(LOVE, 0)?.split('\n')[0]).toBe('Cadd9  |  Em11  C  G/B  Em7  Am7')
    tap('Undo')
    expect(useStore.getState().edits[LOVE]).toBeUndefined()
  })

  it('saves nothing for an edit that changes nothing', () => {
    love()
    fireEvent.click(within(section('Verse')).getAllByRole('button', { name: 'Cursor before chord 1' })[0])
    tap('Delete')
    expect(useStore.getState().edits).toEqual({})
  })
})

describe('keys while typing chords', () => {
  it('puts a bar line in at the caret, spaced as the chart writes it', () => {
    faithWith('D  G')
    fireEvent.click(screen.getAllByRole('button', { name: 'Type chords for Verse' })[0])
    const keys = screen.getByRole('group', { name: 'Keys for typing chords' })
    fireEvent.click(within(keys).getByRole('button', { name: 'Bar line' }))
    expect((screen.getByRole('textbox', { name: 'Chords for Verse' }) as HTMLTextAreaElement).value).toBe('D  G  |  ')
    expect(saved('Faith', 0)).toBe('D  G  |')
  })

  it('puts the key in where the caret was left, even if the tap took the focus away', () => {
    faithWith('D  G')
    fireEvent.click(screen.getAllByRole('button', { name: 'Type chords for Verse' })[0])
    const box = screen.getByRole('textbox', { name: 'Chords for Verse' }) as HTMLTextAreaElement
    act(() => { box.focus(); box.setSelectionRange(1, 1) })
    act(() => box.blur())
    const keys = screen.getByRole('group', { name: 'Keys for typing chords' })
    fireEvent.click(within(keys).getByRole('button', { name: 'Bar line' }))
    expect(box.value).toBe('D  |  G')
    expect(saved('Faith', 0)).toBe('D  |  G')
  })
})
