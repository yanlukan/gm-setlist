import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'
import { useStore } from '../../store/use-store'
import { normalizeChordText } from '../../music/chord-text'
import { keySpelling, shouldUseFlats, transposeInKey, transposeText } from '../../music/theory'
import { transposeFor } from '../../music/setlist-text'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

const gigSongs = GIG_SETLIST_2026.map(title => DEFAULT_SONGS.find(s => s.title === title)!)

describe('charts that were only looked at', () => {
  it('are never changed by opening them in the editor, song by song', () => {
    for (let i = 0; i < gigSongs.length; i++) {
      useStore.setState({ currentIndex: i, editMode: true })
      const view = render(<SongSheet />)
      view.unmount()
      cleanup()
    }
    expect(useStore.getState().edits).toEqual({})
  })

  it('are never changed by moving through every song with the editor open', () => {
    useStore.setState({ currentIndex: 0, editMode: true })
    render(<SongSheet />)
    for (let i = 1; i < gigSongs.length; i++) {
      act(() => { useStore.getState().nextSong() })
    }
    for (let i = 1; i < gigSongs.length; i++) {
      act(() => { useStore.getState().prevSong() })
    }
    cleanup()
    expect(useStore.getState().edits).toEqual({})
  })

  it('are never changed by tapping chords and cursors without choosing a chord', () => {
    // Selecting a chord, moving the cursor and leaving must not write anything
    useStore.setState({ currentIndex: 0, editMode: true })
    render(<SongSheet />)
    const verse = screen.getAllByRole('group', { name: 'Verse' })[0]
    fireEvent.click(within(verse).getAllByRole('button').filter(b => b.classList.contains('ce-chord'))[1])
    fireEvent.click(within(verse).getByRole('button', { name: 'Cursor before chord 2' }))
    cleanup()
    expect(useStore.getState().edits).toEqual({})
  })
})

describe('the chart as it is read', () => {
  it.each(['normal', 'stage'] as const)('shows every song\'s chords exactly as saved, in %s mode, in the band key', mode => {
    const wrong: string[] = []
    for (let i = 0; i < gigSongs.length; i++) {
      const song = gigSongs[i]
      useStore.setState({ currentIndex: i, editMode: false, viewMode: mode })
      const view = render(<SongSheet />)
      const shown = Array.from(view.container.querySelectorAll('.chart-chords')).map(e => e.textContent ?? '')
      const semitones = transposeFor(song)
      const expected = song.sections.map(sec => (semitones ? transposeInKey(sec.chords, song.key, semitones) : sec.chords))
      if (JSON.stringify(shown) !== JSON.stringify(expected)) wrong.push(song.title)
      view.unmount()
      cleanup()
    }
    expect(wrong).toEqual([])
  })
})

describe('the chart text itself', () => {
  it('is already in the tidy form the editor writes, so touching a section changes no chord', () => {
    const untidy: string[] = []
    for (const song of DEFAULT_SONGS) {
      for (const section of song.sections) {
        if (normalizeChordText(section.chords) !== section.chords) untidy.push(`${song.title} / ${section.name}`)
      }
    }
    expect(untidy).toEqual([])
  })

  it('comes back exactly when a song in another key is shown and stored again, every section', () => {
    // The editor shows the band key and stores the chart's own pitch: that round trip must change nothing
    const changed: string[] = []
    for (const song of DEFAULT_SONGS) {
      const semitones = transposeFor(song)
      if (!semitones) continue
      for (const section of song.sections) {
        const shown = transposeInKey(section.chords, song.key, semitones)
        const { letterShift } = keySpelling(song.key, semitones)
        const back = transposeText(normalizeChordText(shown), -semitones, shouldUseFlats(song.key, 0), letterShift === undefined ? undefined : -letterShift)
        if (back !== section.chords) changed.push(`${song.title} / ${section.name}: ${section.chords}  ->  ${back}`)
      }
    }
    expect(changed).toEqual([])
  })
})
