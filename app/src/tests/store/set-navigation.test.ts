import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSetting, saveSetting } from '../../store/persistence'
import { clampIndex, readPlaces, type Places } from '../../store/set-navigation'
import { GIG_SETLIST_2026 as G } from '../../data/songs'
import type { Song } from '../../types'

const toLand = (check: () => unknown) => vi.waitFor(check, { timeout: 5000, interval: 5 })

const twoLists = {
  activeId: 'default',
  lists: {
    default: { id: 'default', name: 'GM Tribute', songTitles: [...G] },
    short: { id: 'short', name: 'Encores', songTitles: [G[20], G[0], G[5]] },
  },
}

const state = () => useStore.getState()

beforeEach(async () => {
  resetDb()
  const database = await db()
  for (const store of ['songEdits', 'setlists', 'customSongs', 'settings', 'snapshots'] as const) {
    await database.clear(store)
  }
  useStore.setState(useStore.getInitialState())
  useStore.setState({ setlistData: twoLists })
})

describe('clampIndex', () => {
  it('keeps a position inside the list', () => {
    expect(clampIndex(4, 21)).toBe(4)
    expect(clampIndex(40, 21)).toBe(20)
    expect(clampIndex(-1, 21)).toBe(0)
    expect(clampIndex(3, 0)).toBe(0)
  })
})

describe('each list remembers its place', () => {
  it('reopens each list where the player left it', () => {
    state().goToSong(7)
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(0) // never played
    state().goToSong(2)
    state().setActiveSetlist('default')
    expect(state().currentIndex).toBe(7)
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(2)
  })

  it('keeps the place of a list left before any move', () => {
    useStore.setState({ currentIndex: 5 })
    state().setActiveSetlist('short')
    state().setActiveSetlist('default')
    expect(state().currentIndex).toBe(5)
  })

  it('pulls a saved place back inside a list that got shorter', () => {
    useStore.setState({ places: { short: 9 } })
    state().setActiveSetlist('short')
    expect(state().currentIndex).toBe(2)
  })

  it('saves the places', async () => {
    state().goToSong(7)
    await toLand(async () => expect(await getSetting<Places>('places')).toEqual({ default: 7 }))
    state().nextSong()
    await toLand(async () => expect(await getSetting<Places>('places')).toEqual({ default: 8 }))
  })
})

describe('an extra song from another list', () => {
  beforeEach(() => {
    state().goToSong(4)
    state().playExtra(G[20], 'short')
  })

  it('plays without moving in the set', () => {
    expect(state().extra).toEqual({ title: G[20], fromListId: 'short' })
    expect(state().currentIndex).toBe(4)
  })

  it('Next goes back to the song the player left', () => {
    state().nextSong()
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(4)
  })

  it('Previous goes to the song before the one left', () => {
    state().prevSong()
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(3)
  })

  it('a second extra still returns to the same song', () => {
    state().playExtra(G[0], 'short')
    state().nextSong()
    expect(state().currentIndex).toBe(4)
  })

  it('picking a song in the set ends the extra', () => {
    state().goToSong(10)
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(10)
  })

  it('switching lists ends the extra', () => {
    state().setActiveSetlist('short')
    expect(state().extra).toBeNull()
  })

  it('a missing extra song: Next moves on', () => {
    useStore.setState({ extra: { title: 'No Such Song', fromListId: 'short' } })
    state().nextSong()
    expect(state().currentIndex).toBe(5)
  })

  it('deleting the extra custom song ends it', () => {
    const jam = { title: 'Encore Jam', artist: 'The band', key: 'A', sections: [{ name: 'Verse', chords: 'A D E' }] } as unknown as Song
    expect(state().addCustomSong(jam)).toBe(true)
    state().playExtra('Encore Jam', 'short')
    state().deleteCustomSong('Encore Jam')
    expect(state().extra).toBeNull()
    expect(state().currentIndex).toBe(4)
  })

  it('deleting a setlist ends the extra', () => {
    state().deleteSetlist('short')
    expect(state().extra).toBeNull()
  })
})

describe('readPlaces', () => {
  it('is undefined when nothing was saved', async () => {
    expect(await readPlaces()).toBeUndefined()
  })

  it('reads the saved places, keeping only whole positions', async () => {
    await saveSetting('places', { default: 7, short: -1, odd: 1.5 })
    expect(await readPlaces()).toEqual({ default: 7 })
  })

  it('turns the position saved before 4.0.0 into a place', async () => {
    await saveSetting('position', { setlistId: 'short', index: 2 })
    expect(await readPlaces()).toEqual({ short: 2 })
  })

  it('prefers the places over the old position', async () => {
    await saveSetting('position', { setlistId: 'default', index: 2 })
    await saveSetting('places', { default: 9 })
    expect(await readPlaces()).toEqual({ default: 9 })
  })
})
