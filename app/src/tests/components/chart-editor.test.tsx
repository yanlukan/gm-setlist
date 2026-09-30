import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DEFAULT_SONGS } from '../../data/songs'
import { useStore } from '../../store/use-store'

// Faith, the first song: Intro B | Verse B E B E B | Pre-Chorus E B E B E B G#m C#m F# N.C. | Chorus B | Solo B E B E B
const FAITH = DEFAULT_SONGS.find(s => s.title === 'Faith')!

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ editMode: true })
})
afterEach(() => {
  vi.restoreAllMocks()
})

const section = (name: string, nth = 0) => screen.getAllByRole('group', { name })[nth]
const keyboard = () => screen.getByRole('group', { name: 'Chord keyboard' })
const key = (name: string) => within(keyboard()).getByRole('button', { name })
const tap = (name: string) => fireEvent.click(key(name))

/** The chords of a section, line by line, as they sit on the chart. */
function linesIn(name: string, nth = 0): string[][] {
  return Array.from(section(name, nth).querySelectorAll('.ce-line')).map(line =>
    Array.from(line.querySelectorAll('.ce-chord')).map(chord => chord.textContent ?? ''))
}
const chordsIn = (name: string, nth = 0) => linesIn(name, nth).flat()

const saved = (i: number) => useStore.getState().edits['Faith']?.sections?.[i]?.chords
const gap = (name: string, label: string, nth = 0) =>
  fireEvent.click(within(section(name, nth)).getByRole('button', { name: label }))
const chord = (name: string, index: number, nth = 0) =>
  fireEvent.click(within(section(name, nth)).getAllByRole('button', { pressed: false }).filter(b => b.classList.contains('ce-chord'))[index])

describe('the chart in edit mode', () => {
  it('is the chart itself: every section, each chord a button, in the lines it was saved in', () => {
    useStore.getState().saveSections('Faith', [
      { name: 'Verse', chords: 'B  E\nB  E  B' },
      { name: 'Chorus', chords: 'B' },
    ])
    render(<SongSheet />)
    expect(linesIn('Verse')).toEqual([['B', 'E'], ['B', 'E', 'B']])
    expect(chordsIn('Chorus')).toEqual(['B'])
  })

  it('has no chord diagrams taking the keyboard\'s place, and no keyboard cover-up: the keyboard sits under the chart', () => {
    render(<SongSheet />)
    expect(keyboard()).toBeInTheDocument()
  })
})

describe('putting chords in', () => {
  it('tap between two chords, then a chord: it goes in there', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('F#')
    expect(saved(1)).toBe('B  E  F#  B  E  B')
    expect(chordsIn('Verse')).toEqual(['B', 'E', 'F#', 'B', 'E', 'B'])
  })

  it('keeps adding after the chord it just added', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('F#')
    tap('G#m')
    expect(saved(1)).toBe('B  E  F#  G#m  B  E  B')
  })

  it('adds at the end of a line from the empty space after the last chord', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('E')
    expect(saved(0)).toBe('B  E')
  })

  it('adds at the very start of a line', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor before chord 1')
    tap('E')
    expect(saved(0)).toBe('E  B')
  })

  it('starts an empty section from nothing', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'B' }, { name: 'Bridge', chords: '' }])
    render(<SongSheet />)
    gap('Bridge', 'Cursor at the end of line 1')
    tap('E')
    tap('F#')
    expect(useStore.getState().edits['Faith'].sections![1].chords).toBe('E  F#')
  })

  it('builds any chord from a root and a quality', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('Chords built on D')
    tap('Dsus4')
    expect(saved(0)).toBe('B  Dsus4')
  })

  it('adds "no chord" and repeat marks', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('N.C.')
    tap('(x2)')
    expect(saved(0)).toBe('B  N.C.  (x2)')
  })

  it('cannot put a chord anywhere until the cursor is placed', () => {
    render(<SongSheet />)
    expect(key('F#')).toBeDisabled()
    expect(screen.getByText('Tap a chord to change it, or between chords to add')).toBeInTheDocument()
    expect(useStore.getState().edits['Faith']).toBeUndefined()
  })

  it('says where the next chord will go', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 2')
    expect(screen.getByText('Adding to Verse, line 1')).toBeInTheDocument()
  })
})

describe('changing and deleting chords', () => {
  it('tap a chord, then another chord: it replaces the first', () => {
    render(<SongSheet />)
    chord('Verse', 1) // the E
    expect(screen.getByText('Changing E: tap the chord to put there')).toBeInTheDocument()
    tap('G#m')
    expect(saved(1)).toBe('B  G#m  B  E  B')
  })

  it('tapping the chosen chord again puts the cursor after it instead', () => {
    render(<SongSheet />)
    chord('Verse', 1)
    fireEvent.click(within(section('Verse')).getByRole('button', { pressed: true }))
    tap('F#')
    expect(saved(1)).toBe('B  E  F#  B  E  B')
  })

  it('deletes the chord you chose', () => {
    render(<SongSheet />)
    chord('Verse', 1)
    tap('Delete')
    expect(saved(1)).toBe('B  B  E  B')
  })

  it('Delete takes away the chord before the cursor', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor at the end of line 1')
    tap('Delete')
    expect(saved(1)).toBe('B  E  B  E')
    tap('Delete')
    expect(saved(1)).toBe('B  E  B')
  })
})

describe('lines', () => {
  it('New line breaks the line at the cursor', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('New line')
    expect(saved(1)).toBe('B  E\nB  E  B')
    expect(linesIn('Verse')).toEqual([['B', 'E'], ['B', 'E', 'B']])
  })

  it('the cursor starts the new line, so the next chords go there', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('New line')
    expect(useStore.getState().edits['Faith']).toBeUndefined() // an empty line at the end is not an edit...
    expect(linesIn('Intro')).toEqual([['B'], []]) // ...but it is there to type into
    tap('E')
    expect(saved(0)).toBe('B\nE')
  })

  it('Delete at the start of a line joins it to the line above', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('New line')
    tap('Delete')
    expect(linesIn('Verse')).toEqual([['B', 'E', 'B', 'E', 'B']])
    expect(useStore.getState().edits['Faith']).toBeUndefined() // the built-in chart again
  })

  it('breaks after the chord you chose', () => {
    render(<SongSheet />)
    chord('Verse', 1)
    tap('New line')
    expect(saved(1)).toBe('B  E\nB  E  B')
  })
})

describe('undo and redo', () => {
  it('has nothing to undo until something changed', () => {
    render(<SongSheet />)
    expect(key('Undo')).toBeDisabled()
    expect(key('Redo')).toBeDisabled()
  })

  it('takes a chord back out, and puts it in again', () => {
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('F#')
    tap('Undo')
    expect(chordsIn('Verse')).toEqual(['B', 'E', 'B', 'E', 'B'])
    tap('Redo')
    expect(chordsIn('Verse')).toEqual(['B', 'E', 'F#', 'B', 'E', 'B'])
  })

  it('goes back one tap at a time', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('E')
    tap('F#')
    tap('Undo')
    expect(saved(0)).toBe('B  E')
    tap('Undo')
    expect(chordsIn('Intro')).toEqual(['B'])
  })

  it('leaves the song following the built-in chart once everything is undone', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('E')
    expect(useStore.getState().edits['Faith']).toBeDefined()
    tap('Undo')
    expect(useStore.getState().edits['Faith']).toBeUndefined()
  })

  it('a new change drops what could have been redone', () => {
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('E')
    tap('Undo')
    gap('Intro', 'Cursor at the end of line 1')
    tap('F#')
    expect(key('Redo')).toBeDisabled()
  })
})

describe('moving to another song while editing', () => {
  it('starts afresh: undo never writes one song\'s chart into another', () => {
    // Regression guard: Next works in edit mode, and the undo history belongs to one song
    render(<SongSheet />)
    gap('Intro', 'Cursor at the end of line 1')
    tap('E')
    expect(key('Undo')).toBeEnabled()
    act(() => { useStore.getState().nextSong() }) // I'm Your Man
    expect(screen.getByRole('heading', { name: "I'm Your Man" })).toBeInTheDocument()
    expect(key('Undo')).toBeDisabled()
    expect(screen.getByText('Tap a chord to change it, or between chords to add')).toBeInTheDocument()
    expect(useStore.getState().edits["I'm Your Man"]).toBeUndefined()
    expect(useStore.getState().edits['Faith'].sections![0].chords).toBe('B  E') // and Faith keeps its edit
  })
})

describe('a song played in another key', () => {
  it('shows the chords of the key the band plays, and stores the chart at its own pitch', () => {
    useStore.getState().setTranspose('Faith', -2) // B shown as A
    render(<SongSheet />)
    expect(within(keyboard()).getByText('In A')).toBeInTheDocument()
    gap('Intro', 'Cursor at the end of line 1')
    tap('D')
    expect(chordsIn('Intro')).toEqual(['A', 'D'])
    expect(saved(0)).toBe('B  E')
  })

  it('keeps line breaks in it', () => {
    useStore.getState().setTranspose('Faith', -2)
    render(<SongSheet />)
    gap('Verse', 'Cursor before chord 3')
    tap('New line')
    expect(saved(1)).toBe('B  E\nB  E  B')
  })
})

describe('sections', () => {
  it('marks the section you are working in', () => {
    render(<SongSheet />)
    expect(section('Verse')).not.toHaveClass('is-active')
    gap('Verse', 'Cursor before chord 2')
    expect(section('Verse')).toHaveClass('is-active')
    expect(section('Intro')).not.toHaveClass('is-active')
    fireEvent.click(within(section('Intro')).getByRole('textbox', { name: 'Name of section 1' }))
    expect(section('Intro')).toHaveClass('is-active')
    expect(section('Verse')).not.toHaveClass('is-active')
  })

  it('copies a section, naming the copy', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy Verse' }))
    const names = useStore.getState().edits['Faith'].sections!.map(s => s.name)
    expect(names).toEqual(['Intro', 'Verse', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Solo'])
    expect(useStore.getState().edits['Faith'].sections![2].chords).toBe(FAITH.sections[1].chords)
  })

  it('moves a section down', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Move Intro down' }))
    expect(useStore.getState().edits['Faith'].sections!.map(s => s.name).slice(0, 2)).toEqual(['Verse', 'Intro'])
  })

  it('cannot move the first section up or the last one down', () => {
    render(<SongSheet />)
    expect(screen.getByRole('button', { name: 'Move Intro up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Solo down' })).toBeDisabled()
  })

  it('deletes a section, but only when you agree', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Chorus' }))
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Chorus' }))
    expect(useStore.getState().edits['Faith'].sections!.map(s => s.name)).toEqual(['Intro', 'Verse', 'Pre-Chorus', 'Solo'])
  })

  it('adds a section to the end', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add Section' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bridge' }))
    const all = useStore.getState().edits['Faith'].sections!
    expect(all[all.length - 1]).toEqual({ name: 'Bridge', chords: '' })
  })

  it('undoes a move', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Move Intro down' }))
    tap('Undo')
    expect(useStore.getState().edits['Faith']).toBeUndefined()
  })
})

describe('typing instead of tapping', () => {
  const typeInto = (text: string) => {
    const box = screen.getByRole('textbox', { name: 'Chords for Verse' })
    fireEvent.change(box, { target: { value: text } })
    fireEvent.blur(box)
  }

  it('turns a section into a text box, and back into chords', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    expect((screen.getByRole('textbox', { name: 'Chords for Verse' }) as HTMLTextAreaElement).value).toBe('B  E  B  E  B')
    typeInto('B  E  A  D\nE  B')
    fireEvent.click(screen.getByRole('button', { name: 'Tap chords for Verse' }))
    expect(linesIn('Verse')).toEqual([['B', 'E', 'A', 'D'], ['E', 'B']])
  })

  it('keeps the lines: Return never joins the chords either side', () => {
    // Regression: Return was dropped, and "D" Return "E" was saved as the chord "DE"
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    typeInto('B  E  A  D\nE  B')
    expect(saved(1)).toBe('B  E  A  D\nE  B')
  })

  it('tidies stray spaces and blank lines as it saves', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    typeInto('  B   E \n\n\n B  ')
    expect(saved(1)).toBe('B  E\n\nB')
  })

  it('stores what is typed in the band\'s key at the chart\'s pitch, line breaks and all', () => {
    useStore.getState().setTranspose('Faith', -2)
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    typeInto('A  D\nE  A')
    expect(saved(1)).toBe('B  E\nF#  B')
  })

  it('can be undone once you are back to tapping', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    typeInto('B  E  A')
    fireEvent.click(screen.getByRole('button', { name: 'Tap chords for Verse' }))
    tap('Undo')
    expect(useStore.getState().edits['Faith']).toBeUndefined()
  })

  it('puts the chord keyboard away while the phone\'s own keyboard is in use', () => {
    render(<SongSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Type chords for Verse' }))
    expect(screen.queryByRole('group', { name: 'Chord keyboard' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tap chords for Verse' }))
    expect(keyboard()).toBeInTheDocument()
  })
})

describe('chords the app does not know', () => {
  it('are marked on the chart and named underneath, and still saved', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'B  DE  E' }])
    render(<SongSheet />)
    const bad = within(section('Verse')).getByRole('button', { name: 'DE' })
    expect(bad).toHaveClass('is-bad')
    expect(within(section('Verse')).getByRole('status')).toHaveTextContent('Not a chord: DE')
    expect(within(section('Verse')).getByRole('button', { name: 'E' })).not.toHaveClass('is-bad')
  })

  it('does not mark N.C. or repeat marks', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'B  N.C.  (x2)' }])
    render(<SongSheet />)
    expect(screen.queryByText(/Not a chord/)).not.toBeInTheDocument()
  })
})

describe('notes', () => {
  it('keep line breaks', () => {
    render(<SongSheet />)
    const notes = screen.getByRole('textbox', { name: 'Notes' })
    fireEvent.change(notes, { target: { value: 'Watch the pause.\nThen straight in.' } })
    fireEvent.blur(notes)
    expect(useStore.getState().edits['Faith'].notes).toBe('Watch the pause.\nThen straight in.')
  })

  it('a section can be renamed', () => {
    render(<SongSheet />)
    const name = screen.getByRole('textbox', { name: 'Name of section 2' })
    fireEvent.change(name, { target: { value: 'Verse 1' } })
    fireEvent.blur(name)
    expect(useStore.getState().edits['Faith'].sections![1].name).toBe('Verse 1')
  })
})
