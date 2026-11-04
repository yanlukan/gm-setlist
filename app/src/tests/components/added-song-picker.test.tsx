import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddSongPicker } from '../../components/setlist/AddSongPicker'
import { useStore } from '../../store/use-store'
import { ADDED_SONGS, addedSongs } from '../../data/added-songs'
import { DEFAULT_SONGS } from '../../data/library'
import { GIG_SETLIST_2026, SONGS } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

// A made-up song file, as add-song writes one into src/data/added/
const [added] = addedSongs({
  './added/test-song.json': {
    title: 'Test Song (added)', artist: 'Nobody', key: 'C', bpm: 100, timeSignature: '4/4',
    sections: [{ name: 'Part 1', chords: '| C | F | G | C |' }], chordsFrom: 'Record',
  },
}, SONGS)

describe('an added song', () => {
  it('joins the library but not the gig running order', () => {
    const library = DEFAULT_SONGS.map(s => s.title)
    for (const song of ADDED_SONGS) {
      expect(library).toContain(song.title)
      expect(GIG_SETLIST_2026).not.toContain(song.title)
    }
    expect(useStore.getState().setlistData.lists.default.songTitles).toEqual(GIG_SETLIST_2026)
  })

  it('is offered by Edit list, and one tap puts it in the list', () => {
    useStore.setState({ songs: [...DEFAULT_SONGS, added] })
    const titles = () => useStore.getState().setlistData.lists.default.songTitles
    expect(titles()).not.toContain(added.title)

    render(<AddSongPicker setlistId="default" currentTitles={titles()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Add Test Song \(added\) to / }))

    expect(titles()).toEqual([...GIG_SETLIST_2026, added.title])
    expect(useStore.getState().setlistSongs().map(s => s.title)).toContain(added.title)
  })
})
