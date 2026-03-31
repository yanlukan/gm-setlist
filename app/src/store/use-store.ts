import { create } from 'zustand'
import type { Song, Section, SongEdits, SetlistData, Theme, ViewMode } from '../types'
import { DEFAULT_SONGS } from '../data/songs'
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
} from './persistence'

const defaultSetlistData: SetlistData = {
  lists: {
    default: {
      id: 'default',
      name: 'My Setlist',
      songTitles: [],
    },
    gm: {
      id: 'gm',
      name: 'GM Tribute',
      songTitles: DEFAULT_SONGS.map(s => s.title),
    },
  },
  activeId: 'default',
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
    const edits = get().edits[title]
    saveSongEdits(title, edits)
  },

  saveNotes: (title: string, notes: string) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], notes },
      },
    }))
    const edits = get().edits[title]
    saveSongEdits(title, edits)
  },

  saveKey: (title: string, key: string) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], key },
      },
    }))
    const edits = get().edits[title]
    saveSongEdits(title, edits)
  },

  saveBpm: (title: string, bpm: number) => {
    set(state => ({
      edits: {
        ...state.edits,
        [title]: { ...state.edits[title], bpm },
      },
    }))
    const edits = get().edits[title]
    saveSongEdits(title, edits)
  },

  resetEdits: (title: string) => {
    set(state => {
      const { [title]: _, ...rest } = state.edits
      return { edits: rest }
    })
    deleteSongEdits(title)
  },

  // Setlist actions
  setActiveSetlist: (id: string) => {
    set(state => ({
      setlistData: { ...state.setlistData, activeId: id },
      currentIndex: 0,
    }))
    const data = get().setlistData
    saveSetlistData(data)
  },

  createSetlist: (name: string) => {
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
    const data = get().setlistData
    saveSetlistData(data)
  },

  deleteSetlist: (id: string) => {
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
    const data = get().setlistData
    saveSetlistData(data)
  },

  renameSetlist: (id: string, name: string) => {
    set(state => ({
      setlistData: {
        ...state.setlistData,
        lists: {
          ...state.setlistData.lists,
          [id]: { ...state.setlistData.lists[id], name },
        },
      },
    }))
    const data = get().setlistData
    saveSetlistData(data)
  },

  reorderSetlistSongs: (id: string, songTitles: string[]) => {
    set(state => ({
      setlistData: {
        ...state.setlistData,
        lists: {
          ...state.setlistData.lists,
          [id]: { ...state.setlistData.lists[id], songTitles },
        },
      },
    }))
    const data = get().setlistData
    saveSetlistData(data)
  },

  addSongToSetlist: (id: string, songTitle: string) => {
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
    const data = get().setlistData
    saveSetlistData(data)
  },

  removeSongFromSetlist: (id: string, songTitle: string) => {
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
      }
    })
    const data = get().setlistData
    saveSetlistData(data)
  },

  // Voicing selection
  selectVoicing: (chord: string, index: number) => {
    set(state => ({
      selectedVoicings: { ...state.selectedVoicings, [chord]: index },
    }))
    const { selectedVoicings } = get()
    saveSelectedVoicings(selectedVoicings)
  },

  // Other actions
  addCustomSong: (song: Song) => {
    const { customSongs } = get()
    if (customSongs.some(s => s.title === song.title)) return
    set(state => ({ customSongs: [...state.customSongs, song] }))
    saveCustomSongs(get().customSongs)
  },

  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    }))
    const { theme } = get()
    saveTheme(theme)
  },

  toggleViewMode: () => {
    set(state => ({
      viewMode: state.viewMode === 'normal' ? 'stage' : 'normal',
    }))
  },

  toggleDiagrams: () => {
    set(state => ({ diagramsVisible: !state.diagramsVisible }))
  },

  hydrate: async () => {
    const [, setlistDataResult, customSongsResult, themeResult, selectedVoicingsResult] = await Promise.all([
      Promise.resolve(null), // placeholder — edits are loaded per-song below
      getSetlistData(),
      getCustomSongs(),
      getTheme(),
      getSelectedVoicings(),
    ])

    // Load all song edits
    const allSongTitles = [
      ...DEFAULT_SONGS.map(s => s.title),
      ...(customSongsResult ?? []).map((s: Song) => s.title),
    ]
    const editsEntries = await Promise.all(
      allSongTitles.map(async title => {
        const edits = await getSongEdits(title)
        return edits ? ([title, edits] as const) : null
      }),
    )
    const edits: Record<string, SongEdits> = {}
    for (const entry of editsEntries) {
      if (entry) edits[entry[0]] = entry[1]
    }

    set({
      ...(setlistDataResult && { setlistData: setlistDataResult }),
      ...(customSongsResult && customSongsResult.length > 0 && { customSongs: customSongsResult }),
      ...(themeResult && { theme: themeResult }),
      ...(selectedVoicingsResult && { selectedVoicings: selectedVoicingsResult }),
      edits,
    })
  },
}))
