import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { GIG_SETLIST_2026 } from '../../data/songs'
import { useStore } from '../../store/use-store'

// The editor opens a section in the lines the chart shows it in: each time
// through a part on a line of its own, not one chord after another.

const LOVE = "I Can't Make You Love Me"

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ editMode: true })
})

const section = (name: string) => screen.getAllByRole('group', { name })[0]
const keyboard = () => screen.getByRole('group', { name: 'Chord keyboard' })
function key(name: string) {
  const here = within(keyboard()).queryByRole('button', { name })
  if (here) return here
  for (const tab of within(keyboard()).getAllByRole('tab')) {
    fireEvent.click(tab)
    const found = within(keyboard()).queryByRole('button', { name })
    if (found) return found
  }
  return within(keyboard()).getByRole('button', { name })
}
const tap = (name: string) => fireEvent.click(key(name))
const linesIn = (name: string) =>
  Array.from(section(name).querySelectorAll('.ce-line')).map(line =>
    Array.from(line.querySelectorAll('.ce-chord')).map(chord => chord.textContent ?? ''))
const chord = (name: string, index: number) =>
  fireEvent.click(Array.from(section(name).querySelectorAll('.ce-chord'))[index])
const saved = (title: string, i: number) => useStore.getState().edits[title]?.sections?.[i]?.chords

/** Faith with a verse of our own: one line saved, two times through a part. */
function faithWith(verse: string) {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: verse }])
  render(<SongSheet />)
}

describe('the editor shows a section by its parts', () => {
  it('opens the verse a line for each time through, the turnaround on its own line, and saves nothing for it', () => {
    useStore.setState({ currentIndex: GIG_SETLIST_2026.indexOf(LOVE) })
    render(<SongSheet />)
    expect(linesIn('Verse')).toEqual([
      ['Cadd9', 'Em11', 'C', 'G/B', 'Em7', 'Am7'],
      ['Cadd9', 'Em11', 'C', 'G/B', 'Em7', 'Am7'],
      ['G/D', 'D', 'G/B'],
    ])
    expect(useStore.getState().edits).toEqual({})
  })

  it('saves the lines it shows, and a chord put back by Undo leaves the song on the built-in chart', () => {
    useStore.setState({ currentIndex: GIG_SETLIST_2026.indexOf(LOVE) })
    render(<SongSheet />)
    chord('Verse', 0)
    tap('Delete')
    // Saved just as shown: the three lines, less the chord taken out
    expect(saved(LOVE, 0)).toBe('Em11  C  G/B  Em7  Am7\nCadd9  Em11  C  G/B  Em7  Am7\nG/D  D  G/B')
    tap('Undo')
    expect(useStore.getState().edits[LOVE]).toBeUndefined()
  })

  it('lays one line out by its parts as chords go in, then keeps the lines as shown', () => {
    faithWith('D  G  C  D  G')
    expect(linesIn('Verse')).toEqual([['D', 'G', 'C', 'D', 'G']])
    fireEvent.click(within(section('Verse')).getByRole('button', { name: 'Cursor at the end of line 1' }))
    tap('C')
    expect(saved('Faith', 0)).toBe('D  G  C\nD  G  C')
    expect(linesIn('Verse')).toEqual([['D', 'G', 'C'], ['D', 'G', 'C']])
    // The cursor stays after the chord just put in
    tap('E')
    expect(saved('Faith', 0)).toBe('D  G  C\nD  G  C  E')
    expect(linesIn('Verse')).toEqual([['D', 'G', 'C'], ['D', 'G', 'C', 'E']])
  })

  it('keeps the lines the player makes with New line', () => {
    faithWith('D  G  C  D  G  C')
    chord('Verse', 1)
    tap('New line')
    expect(saved('Faith', 0)).toBe('D  G\nC\nD  G  C')
    // Lines of the player's own stay put as chords go in
    tap('E')
    expect(linesIn('Verse')).toEqual([['D', 'G'], ['E', 'C'], ['D', 'G', 'C']])
  })

  it('types into the same lines', () => {
    faithWith('D  G  C  D  G  C')
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    expect((screen.getByRole('textbox', { name: 'Chords for Verse' }) as HTMLTextAreaElement).value).toBe('D  G  C\nD  G  C')
  })
})
