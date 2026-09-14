import { create } from 'zustand'
import type { Song, Section, SongEdits, SetlistData, Theme, ViewMode } from '../types'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../data/songs'
import { transposeText, transposeChord, shouldUseFlats } from '../music/theory'
import {
  saveSongEdits,
  getSongEdits,
  deleteSongEdits,
  saveSetlistData,
  getSetlistData,
  saveCustomSongs,
  getCustomSongs,
  saveTheme,
  getTheme,
  saveSelectedVoicings,
  getSelectedVoicings,
  takeSnapshot,
} from './persistence'

export const defaultSetlistData: SetlistData = {
  lists: {
    default: {
      id: 'default',
      name: 'GM Tribute — Sept 2026',
      songTitles: [...GIG_SETLIST_2026],
    },
  },
  activeId: 'default',
}

/**
 * Set when loading from IndexedDB failed. While this is true every write is
 * suppressed: a failed read must never be mistaken for "the user has no data"
 * and then overwritten with defaults. This is the guard that turns the gig
 * failure mode from "data destroyed" into "data temporarily not showing".
 */
let readOnly = false

export function isReadOnly(): boolean {
  return readOnly
}

function persistEdits(title: string, edits: SongEdits): void {
  if (readOnly) return
  saveSongEdits(title, edits).catch(e => console.warn('saveSongEdits failed:', e))
}

/**
 * Persist setlists, snapshotting first. `reason` shows up in the restore list
 * so a mistake can be identified and rolled back by name.
 */
let writeQueue: Promise<unknown> = Promise.resolve()

function persistSetlist(previous: SetlistData, next: SetlistData, reason: string): void {
  if (readOnly) return
  // Queue the writes so two quick changes cannot land out of order, and
  // snapshot the state as it was BEFORE this change so restoring undoes it.
  writeQueue = writeQueue
    .then(() => takeSnapshot(reason, previous))
    .then(() => saveSetlistData(next))
    .catch(e => console.warn('saveSetlistData failed:', e))
}

/** Keep the current position inside the setlist after songs are added/removed. */
function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

interface StoreState {
  // State
  songs: Song[]
  customSongs: Song[]
  edits: Record<string, SongEdits>
  setlistData: SetlistData
  currentIndex: number
  editMode: boolean
  theme: Theme
  viewMode: ViewMode
  diagramsVisible: boolean
  selectedVoicings: Record<string, number>

  // Computed
  allSongs: () => Song[]
  setlistSongs: () => Song[]
  currentSong: () => Song | undefined
  getEditedSections: (title: string) => Section[]
  getEditedNotes: (title: string) => string
  getCurrentKey: (title: string) => string
  getTranspose: (title: string) => number
  getDisplaySections: (title: string) => Section[]
  getDisplayKey: (title: string) => string

  // Navigation
  nextSong: () => void
  prevSong: () => void
  goToSong: (index: number) => void

  // Edit actions
  toggleEditMode: () => void
  saveSections: (title: string, sections: Section[]) => void
  saveNotes: (title: string, notes: string) => void
  saveKey: (title: string, key: string) => void
  saveBpm: (title: string, bpm: number) => void
  setTranspose: (title: string, semitones: number) => void
  resetEdits: (title: string) => void

  // Setlist actions
  setActiveSetlist: (id: string) => void
  createSetlist: (name: string) => void
  deleteSetlist: (id: string) => void
  renameSetlist: (id: string, name: string) => void
  reorderSetlistSongs: (id: string, songTitles: string[]) => void
  addSongToSetlist: (id: string, songTitle: string) => void
  removeSongFromSetlist: (id: string, songTitle: string) => void

  // Other actions
  selectVoicing: (chord: string, index: number) => void
  addCustomSong: (song: Song) => void
  toggleTheme: () => void
  toggleViewMode: () => void
  toggleDiagrams: () => void
  restoreGigOrder: () => void
  loadFailed: boolean
  hydrate: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  // State
  songs: DEFAULT_SONGS,
  customSongs: [],
  edits: {},
  setlistData: defaultSetlistData,
  currentIndex: 0,
  editMode: false,
  theme: 'dark' as Theme,
  viewMode: 'normal' as ViewMode,
  diagramsVisible: true,
  selectedVoicings: {},
  loadFailed: false,

  // Computed
  allSongs: () => {
    const { songs, customSongs } = get()
    return [...songs, ...customSongs]
  },

  setlistSongs: () => {
    const { setlistData, allSongs } = get()
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return []
    const all = allSongs()
    return active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter((s): s is Song => s !== undefined)
  },

  currentSong: () => {
    const { setlistSongs, currentIndex } = get()
    return setlistSongs()[currentIndex]
  },

  getEditedSections: (title: string) => {
    const { edits, allSongs } = get()
    if (edits[title]?.sections) return edits[title].sections!
    const song = allSongs().find(s => s.title === title)
    return song?.sections ?? []
  },

  getEditedNotes: (title: string) => {
    const { edits, allSongs } = get()
    if (edits[title]?.notes !== undefined) return edits[title].notes!
    const song = allSongs().find(s => s.title === title)
    return song?.notes ?? ''
  },

  getCurrentKey: (title: string) => {
    const { edits, allSongs } = get()
    if (edits[title]?.key !== undefined) return edits[title].key!
    const song = allSongs().find(s => s.title === title)
    return song?.key ?? ''
  },

  getTranspose: (title: string) => get().edits[title]?.transpose ?? 0,

  /**
   * Chords as they should be READ on stage. Stored chords stay at source
   * pitch; the transpose is applied here, so it can always be undone.
   */
  getDisplaySections: (title: string) => {
    const { getEditedSections, getCurrentKey, getTranspose } = get()
    const sections = getEditedSections(title)
    const semitones = getTranspose(title)
    if (!semitones) return sections
    const useFlats = shouldUseFlats(getCurrentKey(title), semitones)
    return sections.map(section => ({
      name: section.name,
      chords: transposeText(section.chords, semitones, useFlats),
    }))
  },

  getDisplayKey: (title: string) => {
    const { getCurrentKey, getTranspose } = get()
    const key = getCurrentKey(title)
    const semitones = getTranspose(title)
    if (!semitones || !key) return key
    return transposeChord(key, semitones, shouldUseFlats(key, semitones))
  },

  // Navigation
  nextSong: () => {
    const { currentIndex, setlistSongs } = get()
    const max = setlistSongs().length - 1
    set({ currentIndex: Math.min(currentIndex + 1, max) })
  },

  prevSong: () => {
    const { currentIndex } = get()
    set({ currentIndex: Math.max(currentIndex - 1, 0) })
  },

  goToSong: (index: number) => {
    const { setlistSongs } = get()
    const max = setlistSongs().length - 1
    set({ currentIndex: Math.max(0, Math.min(index, max)), editMode: false })
  },

  // Edit actions
  toggleEditMode: () => {
    set(state => ({ editMode: !state.editMode }))
  },

  saveSections: (title: string, sections: Section[]) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], sections },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  saveNotes: (title: string, notes: string) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], notes },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  saveKey: (title: string, key: string) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], key },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  saveBpm: (title: string, bpm: number) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], bpm },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  /** Non-destructive: only the semitone offset is stored. */
  setTranspose: (title: string, semitones: number) => {
    const clamped = Math.max(-11, Math.min(11, semitones))
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], transpose: clamped },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  resetEdits: (title: string) => {
    set(state => {
      const { [title]: _, ...rest } = state.edits
      return { edits: rest }
    })
    if (!readOnly) deleteSongEdits(title).catch(e => console.warn('deleteSongEdits failed:', e))
  },

  // Setlist actions
  setActiveSetlist: (id: string) => {
    const previous = get().setlistData
    set(state => ({
      setlistData: { ...state.setlistData, activeId: id },
      currentIndex: 0,
    }))
    persistSetlist(previous, get().setlistData, 'switch setlist')
  },

  createSetlist: (name: string) => {
    const previous = get().setlistData
    const id = `sl-${Date.now()}`
    set(state => ({
      setlistData: {
        lists: {
          ...state.setlistData.lists,
          [id]: { id, name, songTitles: [] },
        },
        activeId: id,
      },
      currentIndex: 0,
    }))
    persistSetlist(previous, get().setlistData, 'create setlist')
  },

  deleteSetlist: (id: string) => {
    const previous = get().setlistData
    if (id === 'default') return
    set(state => {
      const { [id]: _, ...rest } = state.setlistData.lists
      return {
        setlistData: {
          lists: rest,
          activeId: 'default',
        },
        currentIndex: 0,
      }
    })
    persistSetlist(previous, get().setlistData, 'delete setlist')
  },

  renameSetlist: (id: string, name: string) => {
    const previous = get().setlistData
    set(state => ({
      setlistData: {
        ...state.setlistData,
        lists: {
          ...state.setlistData.lists,
          [id]: { ...state.setlistData.lists[id], name },
        },
      },
    }))
    persistSetlist(previous, get().setlistData, 'rename setlist')
  },

  reorderSetlistSongs: (id: string, songTitles: string[]) => {
    const previous = get().setlistData
    set(state => ({
      setlistData: {
        ...state.setlistData,
        lists: {
          ...state.setlistData.lists,
          [id]: { ...state.setlistData.lists[id], songTitles },
        },
      },
    }))
    persistSetlist(previous, get().setlistData, 'reorder songs')
  },

  addSongToSetlist: (id: string, songTitle: string) => {
    const previous = get().setlistData
    set(state => {
      const list = state.setlistData.lists[id]
      if (!list || list.songTitles.includes(songTitle)) return state
      return {
        setlistData: {
          ...state.setlistData,
          lists: {
            ...state.setlistData.lists,
            [id]: { ...list, songTitles: [...list.songTitles, songTitle] },
          },
        },
      }
    })
    persistSetlist(previous, get().setlistData, 'add song')
  },

  removeSongFromSetlist: (id: string, songTitle: string) => {
    const previous = get().setlistData
    set(state => {
      const list = state.setlistData.lists[id]
      if (!list) return state
      return {
        setlistData: {
          ...state.setlistData,
          lists: {
            ...state.setlistData.lists,
            [id]: { ...list, songTitles: list.songTitles.filter(t => t !== songTitle) },
          },
        },
        ...(id === state.setlistData.activeId && {
          currentIndex: clampIndex(state.currentIndex, list.songTitles.length - 1),
        }),
      }
    })
    persistSetlist(previous, get().setlistData, 'remove song')
  },

  // Voicing selection
  selectVoicing: (chord: string, index: number) => {
    set(state => ({
      selectedVoicings: { ...state.selectedVoicings, [chord]: index },
    }))
    if (!readOnly) saveSelectedVoicings(get().selectedVoicings).catch(e => console.warn('saveSelectedVoicings failed:', e))
  },

  // Other actions
  addCustomSong: (song: Song) => {
    const { customSongs } = get()
    if (customSongs.some(s => s.title === song.title)) return
    set(state => ({ customSongs: [...state.customSongs, song] }))
    if (!readOnly) saveCustomSongs(get().customSongs).catch(e => console.warn('saveCustomSongs failed:', e))
  },

  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    }))
    if (!readOnly) saveTheme(get().theme).catch(e => console.warn('saveTheme failed:', e))
  },

  toggleViewMode: () => {
    set(state => ({
      viewMode: state.viewMode === 'normal' ? 'stage' : 'normal',
    }))
  },

  toggleDiagrams: () => {
    set(state => ({ diagramsVisible: !state.diagramsVisible }))
  },

  /** Rebuild the active setlist as the printed Sept 2026 running order. */
  restoreGigOrder: () => {
    const previous = get().setlistData
    set(state => {
      const id = state.setlistData.activeId
      const list = state.setlistData.lists[id]
      if (!list) return state
      return {
        setlistData: {
          ...state.setlistData,
          lists: { ...state.setlistData.lists, [id]: { ...list, songTitles: [...GIG_SETLIST_2026] } },
        },
        currentIndex: 0,
      }
    })
    persistSetlist(previous, get().setlistData, 'restore GM Tribute order')
  },

  hydrate: async () => {
    let setlistDataResult: SetlistData | undefined
    let customSongsResult: Song[] = []
    let themeResult: Theme | undefined
    let selectedVoicingsResult: Record<string, number> | undefined

    try {
      ;[setlistDataResult, customSongsResult, themeResult, selectedVoicingsResult] =
        await Promise.all([
          getSetlistData(),
          getCustomSongs(),
          getTheme(),
          getSelectedVoicings(),
        ])
    } catch (e) {
      // Reading failed. Go read-only rather than showing defaults and then
      // overwriting the user's real data with them on the next save.
      readOnly = true
      set({ loadFailed: true })
      console.error('Could not read saved data — running read-only:', e)
      return
    }

    // Load per-song edits. One bad record must not lose the rest.
    const allSongTitles = [
      ...DEFAULT_SONGS.map(s => s.title),
      ...(customSongsResult ?? []).map((s: Song) => s.title),
    ]
    const editsEntries = await Promise.all(
      allSongTitles.map(async title => {
        try {
          const songEdits = await getSongEdits(title)
          return songEdits ? ([title, songEdits] as const) : null
        } catch {
          return null
        }
      }),
    )
    const edits: Record<string, SongEdits> = {}
    for (const entry of editsEntries) {
      if (entry) edits[entry[0]] = entry[1]
    }

    // Saved data is authoritative. Never replace it with defaults here — an
    // empty setlist is a legitimate state (the user just made one), and
    // overwriting it is what destroyed the setlists before the last gig.
    readOnly = false
    set(state => ({
      ...(setlistDataResult && { setlistData: setlistDataResult }),
      ...(customSongsResult && customSongsResult.length > 0 && { customSongs: customSongsResult }),
      ...(themeResult && { theme: themeResult }),
      ...(selectedVoicingsResult && { selectedVoicings: selectedVoicingsResult }),
      edits,
      loadFailed: false,
      currentIndex: clampIndex(
        state.currentIndex,
        setlistDataResult
          ? (setlistDataResult.lists[setlistDataResult.activeId]?.songTitles.length ?? 0)
          : state.setlistData.lists[state.setlistData.activeId]?.songTitles.length ?? 0,
      ),
    }))
  },
}))
