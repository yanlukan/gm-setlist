import { describe, it, expect, beforeEach } from 'vitest'
import { migrateFromLocalStorage } from '../../store/migrate'
import { db, resetDb, saveSetlistData, getSetlistData, getSongEdits, saveSongEdits } from '../../store/persistence'

beforeEach(async () => {
  localStorage.clear()
  resetDb()
  const d = await db()
  const tx = d.transaction(['songEdits', 'setlists', 'customSongs', 'settings'], 'readwrite')
  await Promise.all(['songEdits', 'setlists', 'customSongs', 'settings'].map(n => tx.objectStore(n).clear()))
  await tx.done
})

const oldSetlists = JSON.stringify({ lists: { old: { name: 'March', songTitles: ['Faith'] } }, activeId: 'old' })

describe('migrating data from the old app', () => {
  it('brings old setlists and edits across onto a fresh install', async () => {
    localStorage.setItem('cheatsheet-setlists', oldSetlists)
    localStorage.setItem('cheatsheet-notes-Faith', 'capo off')

    await migrateFromLocalStorage()

    expect((await getSetlistData())?.lists.old.name).toBe('March')
    expect((await getSongEdits('Faith'))?.notes).toBe('capo off')
  })

  it('never overwrites setlists the new app already has', async () => {
    await saveSetlistData({ lists: { gig: { id: 'gig', name: 'Sept 2026', songTitles: ['Roxanne'] } }, activeId: 'gig' })
    localStorage.setItem('cheatsheet-setlists', oldSetlists)

    await migrateFromLocalStorage()

    expect((await getSetlistData())?.lists.gig.name).toBe('Sept 2026')
    expect((await getSetlistData())?.lists.old).toBeUndefined()
  })

  it('never overwrites edits the new app already has', async () => {
    await saveSongEdits('Faith', { notes: 'new note' })
    localStorage.setItem('cheatsheet-notes-Faith', 'old note')
    await migrateFromLocalStorage()
    expect((await getSongEdits('Faith'))?.notes).toBe('new note')
  })

  it('runs once, even when an old record is unreadable', async () => {
    localStorage.setItem('cheatsheet-sections-Faith', '{not json')
    localStorage.setItem('cheatsheet-setlists', oldSetlists)

    expect(await migrateFromLocalStorage()).toBe(true)
    // A second launch must not run it again
    await saveSetlistData({ lists: { gig: { id: 'gig', name: 'Newer', songTitles: [] } }, activeId: 'gig' })
    expect(await migrateFromLocalStorage()).toBe(false)
    expect((await getSetlistData())?.lists.gig.name).toBe('Newer')
  })
})
