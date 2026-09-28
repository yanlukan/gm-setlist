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
  saveDiagramsVisible,
  getDiagramsVisible,
  saveSetting,
  getSetting,
  takeSnapshot,
} from './persistence'

/** Where the player was, so a relaunch mid-set reopens on the same song. */
interface SavedPosition {
  setlistId: string
  index: number
}

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

/**
 * Take a restore point of the state BEFORE a change, then apply the change's
 * writes. Queued, so two quick changes cannot land out of order, and so the
 * restore point is always captured before anything it protects is written.
 */
function persistAfterSnapshot(previous: SetlistData, reason: string, writes: () => Promise<unknown>): void {
  if (readOnly) return
  writeQueue = writeQueue
    .then(() => takeSnapshot(reason, previous))
    .then(writes)
    .catch(e => console.warn(`${reason} failed:`, e))
}

function persistSetlist(previous: SetlistData, next: SetlistData, reason: string): void {
  persistAfterSnapshot(previous, reason, () => saveSetlistData(next))
}

function persistPosition(setlistId: string, index: number): void {
  if (readOnly) return
  const position: SavedPosition = { setlistId, index }
  saveSetting('position', position).catch(e => console.warn('save position failed:', e))
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

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
  duplicateSetlist: (id: string) => void
  /** Remove one of the user's own songs from the library and every setlist. */
  deleteCustomSong: (title: string) => void

  // Other actions
  selectVoicing: (chord: string, index: number) => void
  /** False if a song with that title already exists (titles are the song's identity). */
  addCustomSong: (song: Song) => boolean
  toggleTheme: () => void
  toggleViewMode: () => void
  toggleDiagrams: () => void
  restoreGigOrder: () => void
  /** A short confirmation shown at the bottom of the screen, e.g. "Copied". */
  toast: string | null
  showToast: (message: string) => void
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
  toast: null,
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
    set({ currentIndex: clampIndex(currentIndex + 1, setlistSongs().length) })
    persistPosition(get().setlistData.activeId, get().currentIndex)
  },

  prevSong: () => {
    const { currentIndex, setlistSongs } = get()
    set({ currentIndex: clampIndex(currentIndex - 1, setlistSongs().length) })
    persistPosition(get().setlistData.activeId, get().currentIndex)
  },

  goToSong: (index: number) => {
    const { setlistSongs } = get()
    set({ currentIndex: clampIndex(index, setlistSongs().length), editMode: false })
    persistPosition(get().setlistData.activeId, get().currentIndex)
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
    if (id === 'default' || !previous.lists[id]) return
    const remaining = Object.keys(previous.lists).filter(k => k !== id)
    if (remaining.length === 0) return // never leave the app with no setlist at all
    set(state => {
      const { [id]: _, ...rest } = state.setlistData.lists
      return {
        setlistData: {
          lists: rest,
          // 'default' may not exist, e.g. after importing someone else's backup
          activeId: rest.default ? 'default' : remaining[0],
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

  /** Copy a setlist (e.g. to cut it down for another venue) and switch to the copy. */
  duplicateSetlist: (id: string) => {
    const previous = get().setlistData
    const source = previous.lists[id]
    if (!source) return
    const newId = `sl-${Date.now()}`
    set(state => ({
      setlistData: {
        lists: {
          ...state.setlistData.lists,
          [newId]: { id: newId, name: `${source.name} (copy)`, songTitles: [...source.songTitles] },
        },
        activeId: newId,
      },
      currentIndex: 0,
    }))
    persistSetlist(previous, get().setlistData, 'duplicate setlist')
  },

  deleteCustomSong: (title: string) => {
    if (!get().customSongs.some(song => song.title === title)) return // built-in songs stay
    const previous = get().setlistData
    set(state => {
      const lists = Object.fromEntries(
        Object.entries(state.setlistData.lists).map(([id, list]) => [
          id,
          { ...list, songTitles: list.songTitles.filter(t => t !== title) },
        ]),
      )
      const { [title]: _, ...otherEdits } = state.edits
      return {
        customSongs: state.customSongs.filter(song => song.title !== title),
        setlistData: { ...state.setlistData, lists },
        edits: otherEdits,
        currentIndex: clampIndex(state.currentIndex, lists[state.setlistData.activeId]?.songTitles.length ?? 0),
      }
    })
    const { setlistData, customSongs } = get()
    persistAfterSnapshot(previous, `delete song ${title}`, async () => {
      await saveSetlistData(setlistData)
      await saveCustomSongs(customSongs)
      await deleteSongEdits(title)
    })
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
    // A second song with the same title would be hidden behind the first
    // everywhere (lookups, edits and setlists all go by title).
    if (get().allSongs().some(s => s.title.toLowerCase() === song.title.toLowerCase())) return false
    set(state => ({ customSongs: [...state.customSongs, song] }))
    if (!readOnly) saveCustomSongs(get().customSongs).catch(e => console.warn('saveCustomSongs failed:', e))
    return true
  },

  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    }))
    if (!readOnly) saveTheme(get().theme).catch(e => console.warn('saveTheme failed:', e))
  },

  toggleViewMode: () => {
    set(state => {
      const viewMode: ViewMode = state.viewMode === 'normal' ? 'stage' : 'normal'
      // Stage Mode locks the chart, so it cannot be entered mid-edit.
      return { viewMode, ...(viewMode === 'stage' && { editMode: false }) }
    })
    if (!readOnly) saveSetting('viewMode', get().viewMode).catch(e => console.warn('save viewMode failed:', e))
  },

  toggleDiagrams: () => {
    set(state => ({ diagramsVisible: !state.diagramsVisible }))
    // Remembered, so hiding them for a bigger chart sticks across launches.
    if (!readOnly) saveDiagramsVisible(get().diagramsVisible).catch(e => console.warn('saveDiagramsVisible failed:', e))
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

  showToast: (message: string) => {
    clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = setTimeout(() => set({ toast: null }), 2500)
  },

  hydrate: async () => {
    let setlistDataResult: SetlistData | undefined
    let customSongsResult: Song[] = []
    let themeResult: Theme | undefined
    let selectedVoicingsResult: Record<string, number> | undefined
    let diagramsVisibleResult: boolean | undefined
    let viewModeResult: ViewMode | undefined
    let positionResult: SavedPosition | undefined

    try {
      ;[
        setlistDataResult, customSongsResult, themeResult, selectedVoicingsResult,
        diagramsVisibleResult, viewModeResult, positionResult,
      ] = await Promise.all([
        getSetlistData(),
        getCustomSongs(),
        getTheme(),
        getSelectedVoicings(),
        getDiagramsVisible(),
        getSetting<ViewMode>('viewMode'),
        getSetting<SavedPosition>('position'),
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
    set(state => {
      const setlists = setlistDataResult ?? state.setlistData
      const listLength = setlists.lists[setlists.activeId]?.songTitles.length ?? 0
      // Reopen on the song the player was on, if it was in this same setlist.
      const savedIndex =
        positionResult && positionResult.setlistId === setlists.activeId && Number.isInteger(positionResult.index)
          ? positionResult.index
          : state.currentIndex
      return {
        ...(setlistDataResult && { setlistData: setlistDataResult }),
        ...(customSongsResult && customSongsResult.length > 0 && { customSongs: customSongsResult }),
        ...(themeResult && { theme: themeResult }),
        ...(selectedVoicingsResult && { selectedVoicings: selectedVoicingsResult }),
        ...(typeof diagramsVisibleResult === 'boolean' && { diagramsVisible: diagramsVisibleResult }),
        ...((viewModeResult === 'stage' || viewModeResult === 'normal') && { viewMode: viewModeResult }),
        edits,
        loadFailed: false,
        currentIndex: clampIndex(savedIndex, listLength),
      }
    })
  },
}))
