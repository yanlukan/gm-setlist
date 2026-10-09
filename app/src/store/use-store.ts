import { create } from 'zustand'
import { useMemo } from 'react'
import type { Song, Section, SongEdits, SongVersion, Setlist, SetlistData, Theme, ViewMode } from '../types'
import { DEFAULT_SONGS, GIG_SETLIST_2026, REHEARSAL_SETLIST } from '../data/songs'
import { transposeInKey, transposeChord, shouldUseFlats } from '../music/theory'
import { transposeFor } from '../music/setlist-text'
import { sameSections } from '../music/chart-edits'
import { sameForm } from '../music/form'
import { MAX_CAPO, type ChartView, type Instrument } from '../music/chart-view'
import type { Guitar } from '../music/voicings'
import { keepVersion } from './song-history'
import { viewSettings, type ViewSettings } from './view-settings'
import {
  saveSongEdits,
  getSongEdits,
  deleteSongEdits,
  saveSetlistData,
  getSetlistData,
  saveCustomSongs,
  getCustomSongs,
  getTheme,
  saveSelectedVoicings,
  getSelectedVoicings,
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

/** Edits being written right now, and the songs whose last write failed. */
let pendingSaves = 0
const failedSaves = new Set<string>()

/**
 * Follow a write of one song's edits, so the screen can say whether they are
 * safe: "Saving", "Saved" or "Not saved". A failure stays until that song is
 * written again; the next song saved does not hide it.
 */
function track(title: string, write: Promise<unknown>): void {
  pendingSaves++
  useStore.setState({ saveStatus: 'saving' })
  write
    .then(() => { failedSaves.delete(title) })
    .catch(e => {
      console.warn('saving edits failed:', e)
      failedSaves.add(title)
    })
    .finally(() => {
      pendingSaves--
      if (pendingSaves === 0) useStore.setState({ saveStatus: failedSaves.size > 0 ? 'failed' : 'saved' })
    })
}

export function persistEdits(title: string, edits: SongEdits): void {
  if (readOnly) {
    useStore.setState({ saveStatus: 'readonly' })
    return
  }
  track(title, saveSongEdits(title, edits))
}

function persistDelete(title: string): void {
  if (readOnly) {
    useStore.setState({ saveStatus: 'readonly' })
    return
  }
  track(title, deleteSongEdits(title))
}

/**
 * Keep the song's chart as it is now, before something changes it, so it can
 * be brought back. `force` keeps it even right after another (before a reset
 * or a restore).
 */
function keepBefore(title: string, reason: string, force = false): void {
  if (readOnly) return
  const { getEditedSections, getEditedNotes, getForm } = useStore.getState()
  keepVersion(title, { sections: getEditedSections(title), notes: getEditedNotes(title), form: getForm(title) }, reason, force)
}

/** One thing the player changed goes back to the built-in one: it is no longer an edit. */
function dropEdit(title: string, field: 'sections' | 'notes' | 'form'): void {
  const { [field]: _dropped, ...rest } = useStore.getState().edits[title] ?? ({} as SongEdits)
  const keep = Object.keys(rest).length > 0
  useStore.setState(state => {
    const { [title]: _, ...others } = state.edits
    return { edits: keep ? { ...others, [title]: rest } : others }
  })
  if (keep) persistEdits(title, rest)
  else persistDelete(title)
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

/**
 * Add a setlist that ships with the app, once per device. It goes in beside
 * the player's own setlists, never over them, and a restore point is taken
 * first. Once added it is the player's: changed or deleted, it stays that way.
 */
async function seedSetlist(list: Setlist): Promise<void> {
  if (readOnly) return
  const flag = `seeded:${list.id}`
  try {
    if (await getSetting<boolean>(flag)) return
  } catch {
    return // unreadable: try again next launch rather than risk a second copy
  }
  const previous = useStore.getState().setlistData
  if (previous.lists[list.id]) {
    saveSetting(flag, true).catch(() => {})
    return
  }
  const next: SetlistData = {
    ...previous,
    lists: { ...previous.lists, [list.id]: { ...list, songTitles: [...list.songTitles] } },
  }
  useStore.setState({ setlistData: next })
  persistAfterSnapshot(previous, `add ${list.name}`, async () => {
    await saveSetlistData(next)
    await saveSetting(flag, true)
  })
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

/** The whole store. The view settings (theme, stage, instrument...) live in their own slice. */
export interface StoreState extends ViewSettings {
  // State
  songs: Song[]
  customSongs: Song[]
  edits: Record<string, SongEdits>
  setlistData: SetlistData
  currentIndex: number
  editMode: boolean
  selectedVoicings: Record<string, number>
  /**
   * A section tapped on the chart: the diagrams below then show only its
   * chords. Tied to the song's title, so it lapses on its own when the song
   * changes. Not saved.
   */
  focusSection: { title: string; index: number } | null

  // Computed
  allSongs: () => Song[]
  setlistSongs: () => Song[]
  currentSong: () => Song | undefined
  getEditedSections: (title: string) => Section[]
  getEditedNotes: (title: string) => string
  /** The order the sections are played in: the player's own, else the built-in one, else none. */
  getForm: (title: string) => string[]
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
  saveForm: (title: string, form: string[]) => void
  saveKey: (title: string, key: string) => void
  saveBpm: (title: string, bpm: number) => void
  setTranspose: (title: string, semitones: number) => void
  /** The capo for a song, 0 for none: the chart then shows the shapes to play. */
  setCapo: (title: string, capo: number) => void
  /** The guitar a song is played on, or null to follow the default again. */
  setSongGuitar: (title: string, guitar: Guitar | null) => void
  /** Drop the player's own transpose, going back to the band key (or none). */
  clearTranspose: (title: string) => void
  resetEdits: (title: string) => void
  /** Bring back an earlier version of a song. The chart it replaces is kept. */
  restoreVersion: (title: string, version: SongVersion) => void
  /** Show the built-in chart again. Only the chords go: notes, tempo and key stay. The saved chords are kept as an earlier version. */
  useBuiltInChart: (title: string) => void

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
  /** Forget the shape picked for a chord, so each song shows its band shape again. */
  clearVoicing: (chord: string) => void
  /** False if a song with that title already exists (titles are the song's identity). */
  addCustomSong: (song: Song) => boolean
  setFocusSection: (focus: { title: string; index: number } | null) => void
  restoreGigOrder: () => void
  /** A short confirmation shown at the bottom of the screen, e.g. "Copied". */
  toast: string | null
  showToast: (message: string) => void
  loadFailed: boolean
  /** Whether the player's edits are safely written: shown while editing. */
  saveStatus: 'saved' | 'saving' | 'failed' | 'readonly'
  hydrate: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  ...viewSettings(set, get, () => !readOnly),

  // State
  songs: DEFAULT_SONGS,
  customSongs: [],
  edits: {},
  setlistData: defaultSetlistData,
  currentIndex: 0,
  editMode: false,
  selectedVoicings: {},
  focusSection: null,
  toast: null,
  loadFailed: false,
  saveStatus: 'saved',

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

  getForm: (title: string) => {
    const { edits, allSongs } = get()
    if (edits[title]?.form) return edits[title].form!
    return allSongs().find(s => s.title === title)?.form ?? []
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

  getTranspose: (title: string) =>
    transposeFor(get().allSongs().find(song => song.title === title), get().edits[title]),

  /**
   * Chords as they should be READ on stage. Stored chords stay at source
   * pitch; the transpose is applied here, so it can always be undone.
   */
  getDisplaySections: (title: string) => {
    const { getEditedSections, getCurrentKey, getTranspose } = get()
    const sections = getEditedSections(title)
    const semitones = getTranspose(title)
    if (!semitones) return sections
    return sections.map(section => ({
      name: section.name,
      chords: transposeInKey(section.chords, getCurrentKey(title), semitones),
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
    // Nothing changed: do not turn a look at a song into a saved copy of it.
    // A saved copy shadows the built-in chart, so later chart fixes would
    // never reach that song on this device.
    if (sameSections(get().getEditedSections(title), sections)) return
    keepBefore(title, 'Before your changes')
    const builtIn = get().allSongs().find(s => s.title === title)?.sections ?? []
    if (sameSections(builtIn, sections)) {
      // Back to the built-in chart (Undo all the way, say): that is no longer
      // an edit, so the song follows later chart fixes again. Anything else
      // saved for it, like notes or a tempo, stays.
      dropEdit(title, 'sections')
      return
    }
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], sections },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  saveNotes: (title: string, notes: string) => {
    if (get().getEditedNotes(title) === notes) return
    keepBefore(title, 'Before your changes')
    if (notes === (get().allSongs().find(s => s.title === title)?.notes ?? '')) {
      dropEdit(title, 'notes')
      return
    }
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], notes },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  saveForm: (title: string, form: string[]) => {
    if (sameForm(get().getForm(title), form)) return
    keepBefore(title, 'Before your changes')
    // Back to the built-in order (or none, for a song that never had one): no longer an edit
    if (sameForm(get().allSongs().find(s => s.title === title)?.form, form)) {
      dropEdit(title, 'form')
      return
    }
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], form },
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

  setCapo: (title: string, capo: number) => {
    const clamped = Math.max(0, Math.min(MAX_CAPO, Math.round(capo)))
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], capo: clamped },
      },
    }))
    persistEdits(title, get().edits[title])
  },

  setSongGuitar: (title: string, guitar: Guitar | null) => {
    const { guitar: _old, ...rest } = get().edits[title] ?? ({} as SongEdits)
    const next: SongEdits = guitar ? { ...rest, guitar } : rest
    set(state => ({ edits: { ...state.edits, [title]: next } }))
    persistEdits(title, next)
  },

  clearTranspose: (title: string) => {
    const current = get().edits[title]
    if (!current || current.transpose === undefined) return
    const { transpose: _, ...rest } = current
    set(state => ({ edits: { ...state.edits, [title]: rest } }))
    persistEdits(title, rest)
  },

  resetEdits: (title: string) => {
    // Reset must never be the end of the player's chords: keep them first
    const mine = get().edits[title]
    if (mine?.sections || mine?.notes !== undefined || mine?.form) keepBefore(title, 'Before you reset it', true)
    set(state => {
      const { [title]: _, ...rest } = state.edits
      return { edits: rest }
    })
    persistDelete(title)
  },

  useBuiltInChart: (title: string) => {
    if (!get().edits[title]?.sections) return
    keepBefore(title, 'Before you went back to the built-in chart', true)
    dropEdit(title, 'sections')
  },

  restoreVersion: (title: string, version: SongVersion) => {
    keepBefore(title, 'Before you went back to an earlier version', true)
    get().saveSections(title, version.sections)
    get().saveNotes(title, version.notes)
    if (version.form) get().saveForm(title, version.form)
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

  clearVoicing: (chord: string) => {
    set(state => {
      const rest = { ...state.selectedVoicings }
      delete rest[chord]
      return { selectedVoicings: rest }
    })
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

  setFocusSection: focus => set({ focusSection: focus }),

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
    let simpleResult: boolean | undefined
    let guitarResult: Guitar | 'auto' | undefined
    let instrumentResult: Instrument | undefined

    try {
      ;[
        setlistDataResult, customSongsResult, themeResult, selectedVoicingsResult,
        diagramsVisibleResult, viewModeResult, positionResult, simpleResult, guitarResult,
        instrumentResult,
      ] = await Promise.all([
        getSetlistData(),
        getCustomSongs(),
        getTheme(),
        getSelectedVoicings(),
        getDiagramsVisible(),
        getSetting<ViewMode>('viewMode'),
        getSetting<SavedPosition>('position'),
        getSetting<boolean>('simpleChords'),
        getSetting<Guitar | 'auto'>('guitar'),
        getSetting<Instrument>('instrument'),
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
        ...(typeof simpleResult === 'boolean' && { simpleChords: simpleResult }),
        ...((guitarResult === 'auto' || guitarResult === 'acoustic' || guitarResult === 'electric') && { guitar: guitarResult }),
        ...((instrumentResult === 'guitar' || instrumentResult === 'keyboard') && { instrument: instrumentResult }),
        edits,
        loadFailed: false,
        currentIndex: clampIndex(savedIndex, listLength),
      }
    })

    // The next rehearsal's running order, added to the setlists once
    await seedSetlist(REHEARSAL_SETLIST)
  },
}))

/** The player's chord view settings, as one value for working out what to show. */
export function useChartView(): ChartView {
  const simple = useStore(s => s.simpleChords)
  const guitar = useStore(s => s.guitar)
  const instrument = useStore(s => s.instrument)
  return useMemo(() => ({ simple, guitar, instrument }), [simple, guitar, instrument])
}
