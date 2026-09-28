import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ChordLineEditor } from '../../components/edit/ChordLineEditor'
import { SongSheet } from '../../components/song/SongSheet'
import { AddSongPicker } from '../../components/setlist/AddSongPicker'
import { useStore } from '../../store/use-store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const renderEditor = (chords: string, songKey = 'B') => {
  const onChange = vi.fn()
  render(<ChordLineEditor sectionName="Verse" chords={chords} songKey={songKey} onChange={onChange} onClose={() => {}} />)
  return onChange
}

describe('chord palette', () => {
  it("offers the song's own chords and adds them with chart spacing", () => {
    const onChange = renderEditor('B  E')
    fireEvent.click(screen.getByRole('button', { name: 'F#' }))
    expect(onChange).toHaveBeenCalledWith('B  E  F#')
  })

  it('offers correct sevenths, including the half-diminished one', () => {
    renderEditor('', 'C')
    expect(screen.getByRole('button', { name: 'Bm7b5' })).toBeInTheDocument()
  })

  it('replaces a chord you select instead of adding', () => {
    const onChange = renderEditor('B  E  B')
    const line = screen.getByRole('dialog')
    fireEvent.click(within(line).getAllByRole('button', { name: 'E' })[0]) // the E in the line
    fireEvent.click(screen.getByRole('button', { name: 'G#m' }))
    expect(onChange).toHaveBeenLastCalledWith('B  G#m  B')
  })

  it('deletes the last chord, or the selected one', () => {
    const onChange = renderEditor('B  E  C#m')
    fireEvent.click(screen.getByRole('button', { name: 'Delete last chord' }))
    expect(onChange).toHaveBeenLastCalledWith('B  E')
  })

  it('adds "no chord" and repeat marks from the songbook charts', () => {
    const onChange = renderEditor('Gm9  C6')
    fireEvent.click(screen.getByRole('button', { name: '(x3)' }))
    expect(onChange).toHaveBeenLastCalledWith('Gm9  C6  (x3)')
    fireEvent.click(screen.getByRole('button', { name: 'N.C.' }))
    expect(onChange).toHaveBeenLastCalledWith('Gm9  C6  N.C.')
  })

  it('builds any chord from a root and a quality', () => {
    const onChange = renderEditor('B')
    fireEvent.click(screen.getByRole('button', { name: 'Chords built on D' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dsus4' }))
    expect(onChange).toHaveBeenLastCalledWith('B  Dsus4')
  })
})

describe('chord palette in the editor', () => {
  it('works in the transposed key but stores at the original pitch', () => {
    useStore.getState().setTranspose('Faith', -2) // B shown as A
    useStore.setState({ editMode: true })
    render(<SongSheet />)

    fireEvent.click(screen.getByRole('button', { name: 'Pick chords for Intro' }))
    expect(screen.getByText('In A')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'D' }))

    // Shown as A  D, stored two semitones up at the song's own pitch
    expect(useStore.getState().edits['Faith'].sections![0].chords).toBe('B  E')
  })
})

// The tab and the form's submit button are both called "Create"; the form's comes last.
const lastCreateButton = () => {
  const buttons = screen.getAllByRole('button', { name: 'Create' })
  return buttons[buttons.length - 1]
}

describe('creating a song', () => {
  it('refuses a title that is already taken, and says so', () => {
    render(<AddSongPicker setlistId="default" currentTitles={[]} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.change(screen.getByPlaceholderText('Song title *'), { target: { value: 'faith' } })
    fireEvent.click(lastCreateButton())

    expect(screen.getByRole('alert')).toHaveTextContent('already a song called')
    expect(useStore.getState().customSongs).toHaveLength(0)
  })

  it('hands the new title back so the app can open it for editing', () => {
    const onCreated = vi.fn()
    render(<AddSongPicker setlistId="default" currentTitles={[]} onClose={() => {}} onCreated={onCreated} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    fireEvent.change(screen.getByPlaceholderText('Song title *'), { target: { value: 'Encore Jam' } })
    fireEvent.click(lastCreateButton())

    expect(onCreated).toHaveBeenCalledWith('Encore Jam')
    expect(useStore.getState().setlistData.lists.default.songTitles).toContain('Encore Jam')
  })
})
