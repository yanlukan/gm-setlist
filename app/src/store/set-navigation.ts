import type { StoreApi } from 'zustand'
import { getSetting, saveSetting } from './persistence'
import type { StoreState } from './use-store'

type Set = StoreApi<StoreState>['setState']
type Get = StoreApi<StoreState>['getState']

/** A song from another list, played once mid-set. Never saved: a relaunch opens on the set. */
export interface Extra { title: string; fromListId: string }

/** Where the player is in each setlist, by list id. */
export type Places = Record<string, number>

export interface SetNavigation {
  places: Places
  extra: Extra | null
  nextSong: () => void
  prevSong: () => void
  goToSong: (index: number) => void
  playExtra: (title: string, fromListId: string) => void
}

/** Keep a position inside a list of the given length. */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

export function savePlaces(places: Places, canSave: boolean): void {
  if (canSave) saveSetting('places', places).catch(e => console.warn('save places failed:', e))
}

/** Each list's place, or the single position saved before 4.0.0, or undefined. */
export async function readPlaces(): Promise<Places | undefined> {
  const saved = await getSetting<Places>('places')
  if (saved && typeof saved === 'object') {
    const places: Places = {}
    for (const [id, index] of Object.entries(saved)) {
      if (Number.isInteger(index) && index >= 0) places[id] = index
    }
    return places
  }
  const old = await getSetting<{ setlistId: string; index: number }>('position')
  if (old && typeof old.setlistId === 'string' && Number.isInteger(old.index) && old.index >= 0) {
    return { [old.setlistId]: old.index }
  }
  return undefined
}

export function setNavigation(set: Set, get: Get, canSave: () => boolean): SetNavigation {
  // Every move inside the set ends an extra and records the list's place
  const moveTo = (index: number, more: Partial<StoreState> = {}) => {
    const { setlistSongs, setlistData, places } = get()
    const currentIndex = clampIndex(index, setlistSongs().length)
    set({ ...more, currentIndex, extra: null, places: { ...places, [setlistData.activeId]: currentIndex } })
    savePlaces(get().places, canSave())
  }

  return {
    places: {},
    extra: null,
    nextSong: () => {
      const { extra, currentIndex, allSongs } = get()
      // After an extra, Next goes back to the song the player left; a vanished extra was never shown
      const returning = !!extra && allSongs().some(song => song.title === extra.title)
      moveTo(returning ? currentIndex : currentIndex + 1)
    },
    prevSong: () => moveTo(get().currentIndex - 1),
    goToSong: index => moveTo(index, { editMode: false }),
    playExtra: (title, fromListId) => set({ extra: { title, fromListId }, editMode: false }),
  }
}
