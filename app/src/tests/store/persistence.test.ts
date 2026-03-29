import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  resetDb,
  saveSongEdits,
  getSongEdits,
  deleteSongEdits,
  saveSetlistData,
  getSetlistData,
  saveCustomSongs,
  getCustomSongs,
  saveTheme,
  getTheme,
} from '../../store/persistence'

beforeEach(async () => {
  resetDb()
  const database = await db()
  const tx = database.transaction(
    ['songEdits', 'setlists', 'customSongs', 'settings'],
    'readwrite',
  )
  await tx.objectStore('songEdits').clear()
  await tx.objectStore('setlists').clear()
  await tx.objectStore('customSongs').clear()
  await tx.objectStore('settings').clear()
  await tx.done
})

describe('song edits persistence', () => {
  it('saves and retrieves song edits', async () => {
    await saveSongEdits('Faith', {
      sections: [{ name: 'Verse', chords: 'A B C' }],
      notes: 'test note',
      key: 'C',
    })
    const edits = await getSongEdits('Faith')
    expect(edits?.sections).toEqual([{ name: 'Verse', chords: 'A B C' }])
    expect(edits?.notes).toBe('test note')
    expect(edits?.key).toBe('C')
  })

  it('returns undefined for non-existent song', async () => {
    const edits = await getSongEdits('Nonexistent')
    expect(edits).toBeUndefined()
  })

  it('deletes song edits', async () => {
    await saveSongEdits('Faith', { notes: 'test' })
    await deleteSongEdits('Faith')
    const edits = await getSongEdits('Faith')
    expect(edits).toBeUndefined()
  })
})

describe('setlist persistence', () => {
  it('saves and retrieves setlist data', async () => {
    const data = {
      lists: { default: { id: 'default', name: 'Test', songTitles: ['Faith'] } },
      activeId: 'default',
    }
    await saveSetlistData(data)
    const result = await getSetlistData()
    expect(result?.lists.default.songTitles).toEqual(['Faith'])
  })
})

describe('custom songs persistence', () => {
  it('saves and retrieves custom songs', async () => {
    const songs = [
      {
        title: 'New Song',
        artist: 'Me',
        key: 'C',
        bpm: 120,
        timeSignature: '4/4',
        capo: null,
        notes: '',
        sections: [],
        imported: true,
      },
    ]
    await saveCustomSongs(songs)
    const result = await getCustomSongs()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('New Song')
  })
})

describe('theme persistence', () => {
  it('saves and retrieves theme', async () => {
    await saveTheme('light')
    expect(await getTheme()).toBe('light')
  })
})
