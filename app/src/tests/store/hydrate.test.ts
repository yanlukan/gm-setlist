import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, saveSetlistData, getSetlistData, listSnapshots, restoreSnapshot } from '../../store/persistence'
import type { SetlistData } from '../../types'

beforeEach(async () => {
  resetDb()
  const database = await db()
  const tx = database.transaction(
    ['songEdits', 'setlists', 'customSongs', 'settings', 'snapshots'],
    'readwrite',
  )
  await tx.objectStore('songEdits').clear()
  await tx.objectStore('setlists').clear()
  await tx.objectStore('customSongs').clear()
  await tx.objectStore('settings').clear()
  await tx.objectStore('snapshots').clear()
  await tx.done
  useStore.setState(useStore.getInitialState())
})

/**
 * Regression tests for the failure that made the app unusable at the gig:
 * hydrate() replaced every saved setlist with the defaults whenever the
 * active list happened to be empty, and wrote that replacement to disk.
 */
describe('hydrate does not destroy saved data', () => {
  it('keeps an empty active setlist instead of resetting to defaults', async () => {
    const saved: SetlistData = {
      lists: {
        default: { id: 'default', name: 'GM Tribute', songTitles: ['Faith', 'Outside'] },
        gig: { id: 'gig', name: 'Saturday', songTitles: [] },
      },
      activeId: 'gig',
    }
    await saveSetlistData(saved)

    await useStore.getState().hydrate()

    const after = useStore.getState().setlistData
    expect(after.activeId).toBe('gig')
    expect(after.lists.gig.songTitles).toEqual([])
    // The other setlist must survive — this is what was lost before.
    expect(after.lists.default.songTitles).toEqual(['Faith', 'Outside'])
    expect(Object.keys(after.lists)).toHaveLength(2)
  })

  it('does not overwrite what is on disk while hydrating', async () => {
    const saved: SetlistData = {
      lists: { gig: { id: 'gig', name: 'Saturday', songTitles: [] } },
      activeId: 'gig',
    }
    await saveSetlistData(saved)

    await useStore.getState().hydrate()

    expect(await getSetlistData()).toEqual(saved)
  })

  it('restores a hand-built setlist verbatim', async () => {
    const saved: SetlistData = {
      lists: {
        default: { id: 'default', name: 'GM Tribute', songTitles: ['Faith'] },
        gig: { id: 'gig', name: 'Sept 2026', songTitles: ['Roxanne', 'Kissing a Fool', 'Faith'] },
      },
      activeId: 'gig',
    }
    await saveSetlistData(saved)

    await useStore.getState().hydrate()

    expect(useStore.getState().setlistSongs().map(s => s.title)).toEqual([
      'Roxanne', 'Kissing a Fool', 'Faith',
    ])
  })

  it('pulls currentIndex back into range for a shorter saved setlist', async () => {
    await saveSetlistData({
      lists: { default: { id: 'default', name: 'Short', songTitles: ['Faith', 'Outside'] } },
      activeId: 'default',
    })
    useStore.setState({ currentIndex: 18 })

    await useStore.getState().hydrate()

    expect(useStore.getState().currentIndex).toBe(1)
    expect(useStore.getState().currentSong()?.title).toBe('Outside')
  })
})

describe('setlist changes are recoverable', () => {
  it('writes a restore point before a destructive setlist change', async () => {
    const id = useStore.getState().setlistData.activeId
    expect(await listSnapshots()).toHaveLength(0)

    useStore.getState().removeSongFromSetlist(id, 'Faith')
    await new Promise(resolve => setTimeout(resolve, 20))

    const snaps = await listSnapshots()
    expect(snaps.length).toBeGreaterThan(0)
    expect(snaps[0].reason).toBe('remove song')
  })
})

describe('restoring a snapshot', () => {
  it('brings back a setlist after songs are removed', async () => {
    const id = useStore.getState().setlistData.activeId
    const before = [...useStore.getState().setlistData.lists[id].songTitles]

    useStore.getState().removeSongFromSetlist(id, 'Faith')
    useStore.getState().removeSongFromSetlist(id, 'Roxanne')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(useStore.getState().setlistData.lists[id].songTitles).toHaveLength(before.length - 2)

    // The oldest snapshot is the state before the first removal.
    const snaps = await listSnapshots()
    const oldest = snaps[snaps.length - 1]
    await restoreSnapshot(oldest.id)
    await useStore.getState().hydrate()

    expect(useStore.getState().setlistData.lists[id].songTitles).toEqual(before)
  })

  it('snapshots the current state before restoring, so a restore is undoable', async () => {
    const id = useStore.getState().setlistData.activeId
    useStore.getState().removeSongFromSetlist(id, 'Faith')
    await new Promise(resolve => setTimeout(resolve, 20))

    const first = await listSnapshots()
    await restoreSnapshot(first[first.length - 1].id)

    const after = await listSnapshots()
    expect(after.length).toBe(first.length + 1)
    expect(after[0].reason).toBe('before restore')
  })
})
