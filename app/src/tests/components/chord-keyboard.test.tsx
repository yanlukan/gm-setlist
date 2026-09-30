import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ChordKeyboard, type ChordKeyboardProps } from '../../components/edit/ChordKeyboard'

function setup(over: Partial<ChordKeyboardProps> = {}) {
  const handlers = {
    onChord: vi.fn(), onBackspace: vi.fn(), onNewLine: vi.fn(), onUndo: vi.fn(), onRedo: vi.fn(),
  }
  render(
    <ChordKeyboard
      songKey="B" ready hint="Adding to Verse" canUndo canRedo
      {...handlers} {...over}
    />,
  )
  return handlers
}

const keyboard = () => screen.getByRole('group', { name: 'Chord keyboard' })
const key = (name: string) => within(keyboard()).getByRole('button', { name })

describe('chord keyboard', () => {
  it("offers the song's own chords", () => {
    const { onChord } = setup()
    fireEvent.click(key('F#'))
    expect(onChord).toHaveBeenCalledWith('F#')
  })

  it('offers correct sevenths, including the half-diminished one', () => {
    setup({ songKey: 'C' })
    expect(key('Bm7b5')).toBeInTheDocument()
  })

  it('adds "no chord" and repeat marks from the songbook charts', () => {
    const { onChord } = setup({ songKey: 'Gm' })
    fireEvent.click(key('(x3)'))
    expect(onChord).toHaveBeenLastCalledWith('(x3)')
    fireEvent.click(key('N.C.'))
    expect(onChord).toHaveBeenLastCalledWith('N.C.')
  })

  it('builds any chord from a root and a quality', () => {
    const { onChord } = setup()
    fireEvent.click(key('Chords built on D'))
    fireEvent.click(key('Dsus4'))
    expect(onChord).toHaveBeenLastCalledWith('Dsus4')
  })

  it('uses the flat names in a flat key', () => {
    setup({ songKey: 'Gb' })
    expect(key('Chords built on Db')).toBeInTheDocument()
    expect(within(keyboard()).queryByRole('button', { name: 'Chords built on C#' })).not.toBeInTheDocument()
  })

  it('has nowhere to put a chord until the cursor is somewhere', () => {
    const { onChord, onBackspace, onNewLine } = setup({ ready: false, hint: 'Tap between chords to add one' })
    expect(key('F#')).toBeDisabled()
    expect(key('Chords built on D')).toBeDisabled()
    expect(key('(x2)')).toBeDisabled()
    expect(key('Delete')).toBeDisabled()
    expect(key('New line')).toBeDisabled()
    fireEvent.click(key('F#'))
    expect(onChord).not.toHaveBeenCalled()
    expect(onBackspace).not.toHaveBeenCalled()
    expect(onNewLine).not.toHaveBeenCalled()
    expect(screen.getByText('Tap between chords to add one')).toBeInTheDocument()
  })

  it('deletes, starts a new line, undoes and redoes', () => {
    const h = setup()
    fireEvent.click(key('Delete'))
    fireEvent.click(key('New line'))
    fireEvent.click(key('Undo'))
    fireEvent.click(key('Redo'))
    expect(h.onBackspace).toHaveBeenCalledOnce()
    expect(h.onNewLine).toHaveBeenCalledOnce()
    expect(h.onUndo).toHaveBeenCalledOnce()
    expect(h.onRedo).toHaveBeenCalledOnce()
  })

  it('cannot undo or redo when there is nothing to undo or redo', () => {
    setup({ canUndo: false, canRedo: false })
    expect(key('Undo')).toBeDisabled()
    expect(key('Redo')).toBeDisabled()
  })

  it('says what the next tap will do', () => {
    setup({ hint: 'Changing Gb: tap the chord to put there' })
    expect(screen.getByText('Changing Gb: tap the chord to put there')).toBeInTheDocument()
  })
})
