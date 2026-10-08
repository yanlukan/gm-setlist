import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import {
  db, resetDb, saveSetlistData, getSetlistData, listSnapshots, restoreSnapshot,
  getCustomSongs, getSongEdits, getSetting,
} from '../../store/persistence'
import type { SetlistData } from '../../types'
import { REHEARSAL_SETLIST } from '../../data/songs'

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
 * Saves happen in the background, so a test waits until what it needs is on
 * disk instead of sleeping for a guessed time: a busy machine takes longer.
 */
const toLand = (check: () => Promise<void>) => vi.waitFor(check, { timeout: 5000, interval: 5 })

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
    // Both kept, beside the next rehearsal's list, which is added once
    expect(Object.keys(after.lists).sort()).toEqual(['default', 'gig', REHEARSAL_SETLIST.id])
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
    await toLand(async () => expect(await listSnapshots()).not.toHaveLength(0))

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
    // Both removals must be on disk, or a late write would undo the restore
    await toLand(async () => {
      expect((await getSetlistData())?.lists[id]?.songTitles).toHaveLength(before.length - 2)
    })
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
    await toLand(async () => {
      expect((await getSetlistData())?.lists[id]?.songTitles).not.toContain('Faith')
    })

    const first = await listSnapshots()
    await restoreSnapshot(first[first.length - 1].id)

    const after = await listSnapshots()
    expect(after.length).toBe(first.length + 1)
    expect(after[0].reason).toBe('before restore')
  })
})

describe('relaunching mid-set', () => {
  const positionSaved = (index: number) =>
    toLand(async () => expect((await getSetting<{ index: number }>('position'))?.index).toBe(index))

  it('reopens on the song the player was on', async () => {
    useStore.getState().goToSong(7)
    await positionSaved(7)

    useStore.setState(useStore.getInitialState()) // app closed and reopened
    await useStore.getState().hydrate()

    expect(useStore.getState().currentIndex).toBe(7)
  })

  it('also remembers moves made with Next and Previous', async () => {
    useStore.getState().nextSong()
    useStore.getState().nextSong()
    useStore.getState().nextSong()
    useStore.getState().prevSong()
    await positionSaved(2)

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()

    expect(useStore.getState().currentIndex).toBe(2)
  })

  it('starts at the top when the saved position was in a different setlist', async () => {
    useStore.getState().goToSong(7)
    await positionSaved(7)
    await saveSetlistData({
      lists: { other: { id: 'other', name: 'Other', songTitles: ['Faith', 'Outside', 'Roxanne'] } },
      activeId: 'other',
    })

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()

    expect(useStore.getState().currentIndex).toBe(0)
  })

  it('remembers Stage Mode', async () => {
    useStore.getState().toggleViewMode()
    await toLand(async () => expect(await getSetting('viewMode')).toBe('stage'))

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()

    expect(useStore.getState().viewMode).toBe('stage')
  })
})

describe('deleting your own song', () => {
  const encore = {
    title: 'Encore Jam', artist: 'Band', key: 'E', bpm: 120, timeSignature: '4/4',
    capo: null, notes: '', sections: [{ name: 'Verse', chords: 'E  A  B' }],
  }

  it('removes it from the library, every setlist, and its edits', async () => {
    const id = useStore.getState().setlistData.activeId
    useStore.getState().addCustomSong(encore)
    useStore.getState().addSongToSetlist(id, 'Encore Jam')
    useStore.getState().setTranspose('Encore Jam', 2)
    await toLand(async () => {
      expect(await getCustomSongs()).toHaveLength(1)
      expect((await getSetlistData())?.lists[id]?.songTitles).toContain('Encore Jam')
      expect((await getSongEdits('Encore Jam'))?.transpose).toBe(2)
    })

    useStore.getState().deleteCustomSong('Encore Jam')
    await toLand(async () => {
      expect(await getCustomSongs()).toHaveLength(0)
      expect((await getSetlistData())?.lists[id]?.songTitles).not.toContain('Encore Jam')
      expect(await getSongEdits('Encore Jam')).toBeUndefined()
    })

    const state = useStore.getState()
    expect(state.customSongs).toHaveLength(0)
    expect(state.setlistData.lists[id].songTitles).not.toContain('Encore Jam')
    expect(state.edits['Encore Jam']).toBeUndefined()

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()
    expect(useStore.getState().customSongs).toHaveLength(0)
  })

  it('can be undone from its restore point, song and all', async () => {
    const id = useStore.getState().setlistData.activeId
    useStore.getState().addCustomSong(encore)
    useStore.getState().addSongToSetlist(id, 'Encore Jam')
    await toLand(async () => {
      expect(await getCustomSongs()).toHaveLength(1)
      expect((await getSetlistData())?.lists[id]?.songTitles).toContain('Encore Jam')
    })

    useStore.getState().deleteCustomSong('Encore Jam')
    await toLand(async () => {
      expect(await getCustomSongs()).toHaveLength(0)
      expect((await getSetlistData())?.lists[id]?.songTitles).not.toContain('Encore Jam')
    })

    const [latest] = await listSnapshots()
    expect(latest.reason).toBe('delete song Encore Jam')
    await restoreSnapshot(latest.id)
    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()

    expect(useStore.getState().customSongs.map(s => s.title)).toContain('Encore Jam')
    expect(useStore.getState().setlistSongs().map(s => s.title)).toContain('Encore Jam')
  })

  it('never deletes a built-in song', () => {
    useStore.getState().deleteCustomSong('Faith')
    expect(useStore.getState().setlistSongs().map(s => s.title)).toContain('Faith')
  })
})

describe('deleting a setlist', () => {
  it('switches to a setlist that exists when there is no "default"', () => {
    useStore.setState({
      setlistData: {
        lists: {
          a: { id: 'a', name: 'A', songTitles: ['Faith'] },
          b: { id: 'b', name: 'B', songTitles: ['Outside'] },
        },
        activeId: 'a',
      },
    })
    useStore.getState().deleteSetlist('a')
    expect(useStore.getState().setlistData.activeId).toBe('b')
    expect(useStore.getState().currentSong()?.title).toBe('Outside')
  })

  it('refuses to delete the only setlist left', () => {
    useStore.setState({
      setlistData: { lists: { a: { id: 'a', name: 'A', songTitles: ['Faith'] } }, activeId: 'a' },
    })
    useStore.getState().deleteSetlist('a')
    expect(useStore.getState().setlistData.lists.a).toBeDefined()
  })
})

describe('the next rehearsal', () => {
  const saved: SetlistData = {
    lists: { default: { id: 'default', name: 'GM Tribute', songTitles: ['Faith'] } },
    activeId: 'default',
  }

  it('is added beside your own setlists, in the running order, without switching to it', async () => {
    await saveSetlistData(saved)
    await useStore.getState().hydrate()
    const after = useStore.getState().setlistData
    expect(after.activeId).toBe('default')
    expect(after.lists.default.songTitles).toEqual(['Faith'])
    expect(after.lists[REHEARSAL_SETLIST.id]).toEqual({
      id: REHEARSAL_SETLIST.id,
      name: 'Next rehearsal',
      songTitles: [
        "I Can't Make You Love Me", 'Roxanne', 'Kissing a Fool', 'Last Christmas',
        'Faith', "I'm Your Man", 'Club Tropicana', 'Waiting (Reprise)',
      ],
    })
    await toLand(async () => {
      expect((await getSetlistData())?.lists[REHEARSAL_SETLIST.id]).toBeDefined()
    })
  })

  it('is yours once added: deleted, it does not come back', async () => {
    await saveSetlistData(saved)
    await useStore.getState().hydrate()
    await toLand(async () => {
      expect(await getSetting(`seeded:${REHEARSAL_SETLIST.id}`)).toBe(true)
    })
    useStore.getState().deleteSetlist(REHEARSAL_SETLIST.id)
    await toLand(async () => {
      expect((await getSetlistData())?.lists[REHEARSAL_SETLIST.id]).toBeUndefined()
    })

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()
    expect(useStore.getState().setlistData.lists[REHEARSAL_SETLIST.id]).toBeUndefined()
  })

  it('only names songs the app has', () => {
    const titles = new Set(useStore.getState().songs.map(song => song.title))
    for (const title of REHEARSAL_SETLIST.songTitles) expect(titles.has(title), title).toBe(true)
  })
})
