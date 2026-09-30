import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
  useStore.setState({ editMode: true }) // Faith, the first song
})

const saved = (section: number) => useStore.getState().edits['Faith'].sections![section].chords

/** Type into a field the way the keyboard does: the whole value changes, then focus leaves. */
function type(field: HTMLElement, text: string) {
  fireEvent.change(field, { target: { value: text } })
  fireEvent.blur(field)
}

describe('typing chords', () => {
  it('keeps the lines: Return starts a new line and never joins the chords either side', () => {
    // Regression: "A D" Return "E B" was saved as "A DE B", a chord called DE
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Chords for Verse' }), 'B  E  A  D\nE  B')
    expect(saved(1)).toBe('B  E  A  D\nE  B')
  })

  it('tidies stray spaces and blank lines as it saves', () => {
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Chords for Verse' }), '  B   E \n\n\n B  ')
    expect(saved(1)).toBe('B  E\n\nB')
  })

  it('says so when something typed is not a chord, and still saves it', () => {
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Chords for Verse' }), 'B  DE  E')
    expect(screen.getByRole('status')).toHaveTextContent('Not a chord: DE')
    expect(saved(1)).toBe('B  DE  E')
  })

  it('has no warning for chords, N.C. or repeat marks', () => {
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Chords for Pre-Chorus' }), 'E  B  G#m  N.C.  (x2)')
    expect(screen.queryByText(/Not a chord/)).not.toBeInTheDocument()
  })

  it('keeps the lines in a song played in another key, and stores them at the chart\'s pitch', () => {
    useStore.getState().setTranspose('Faith', -2) // B shown as A
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Chords for Verse' }), 'A  D\nE  A')
    expect(saved(1)).toBe('B  E\nF#  B')
  })

  it('shows lines you saved earlier as separate lines in the box', () => {
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: 'B  E\nB  E  B' }])
    render(<SongSheet />)
    const box = screen.getByRole('textbox', { name: 'Chords for Verse' }) as HTMLTextAreaElement
    expect(box.value).toBe('B  E\nB  E  B')
  })
})

describe('typing notes and names', () => {
  it('keeps line breaks in the notes', () => {
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Notes' }), 'Watch the pause.\nThen straight in.')
    expect(useStore.getState().edits['Faith'].notes).toBe('Watch the pause.\nThen straight in.')
  })

  it('renames a section', () => {
    render(<SongSheet />)
    type(screen.getByRole('textbox', { name: 'Name of section 2' }), 'Verse 1')
    expect(useStore.getState().edits['Faith'].sections![1].name).toBe('Verse 1')
  })
})
