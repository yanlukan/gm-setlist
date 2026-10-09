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
  exportAllData,
  importAllData,
  validateBackup,
  saveSetting,
  getSetting,
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

describe('importing a backup', () => {
  it('refuses a file that is not a backup, and leaves the data alone', async () => {
    await saveSetlistData({ lists: { a: { id: 'a', name: 'Mine', songTitles: ['Faith'] } }, activeId: 'a' })
    await expect(importAllData('{"hello": "world"}')).rejects.toThrow('not a PlayBook backup')
    await expect(importAllData('not json at all')).rejects.toThrow('not a PlayBook backup')
    expect((await getSetlistData())?.lists.a.name).toBe('Mine')
  })

  it('refuses a damaged backup before writing anything', async () => {
    await saveSongEdits('Faith', { notes: 'keep me' })
    const damaged = JSON.stringify({
      version: 1,
      songEdits: [],
      setlists: { lists: { a: { name: 'X', songTitles: ['Faith'] } }, activeId: 'missing' },
    })
    await expect(importAllData(damaged)).rejects.toThrow('damaged (setlists)')
    // The song edits step comes first in the import; it must not have run
    expect((await getSongEdits('Faith'))?.notes).toBe('keep me')
  })

  it('round-trips a real export', async () => {
    await saveSetlistData({ lists: { a: { id: 'a', name: 'Gig', songTitles: ['Faith', 'Roxanne'] } }, activeId: 'a' })
    await saveSongEdits('Roxanne', { transpose: -2 })
    await saveSongEdits('Faith', { form: ['Intro', 'Verse', 'Chorus'] })
    const backup = await exportAllData()
    expect(validateBackup(JSON.parse(backup))).toBeNull()

    await saveSetlistData({ lists: { b: { id: 'b', name: 'Other', songTitles: [] } }, activeId: 'b' })
    await importAllData(backup)
    expect((await getSetlistData())?.lists.a.songTitles).toEqual(['Faith', 'Roxanne'])
    expect((await getSongEdits('Roxanne'))?.transpose).toBe(-2)
    expect((await getSongEdits('Faith'))?.form).toEqual(['Intro', 'Verse', 'Chorus']) // the song order goes in a backup too
  })
})

describe('your own shapes in a backup', () => {
  it('go out with the export and come back with the import', async () => {
    await saveSetting('ownShapes', { Em11: ['x-x-2-2-3-5'] })
    const backup = await exportAllData()
    expect(JSON.parse(backup).ownShapes).toEqual({ Em11: ['x-x-2-2-3-5'] })
    expect(validateBackup(JSON.parse(backup))).toBeNull()

    await saveSetting('ownShapes', {})
    await importAllData(backup)
    expect(await getSetting('ownShapes')).toEqual({ Em11: ['x-x-2-2-3-5'] })
  })

  it('are refused when damaged', () => {
    expect(validateBackup({ version: 1, ownShapes: { Em11: 'x-x-2-2-3-5' } })).toBe('The backup file is damaged (shapes).')
    expect(validateBackup({ version: 1, ownShapes: { Em11: [5] } })).toBe('The backup file is damaged (shapes).')
    expect(validateBackup({ version: 1, ownShapes: [] })).toBe('The backup file is damaged (shapes).')
    expect(validateBackup({ version: 1, ownShapes: null })).toBeNull()
  })
})
