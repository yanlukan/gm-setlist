import type { StoreApi } from 'zustand'
import type { Theme, ViewMode } from '../types'
import type { Guitar } from '../music/voicings'
import type { Instrument } from '../music/chart-view'
import { saveTheme, saveDiagramsVisible, saveSetting } from './persistence'
import type { StoreState } from './use-store'

/**
 * How the player wants the app to look: the same for every song, and saved
 * so it survives a relaunch. Read back by the store's hydrate.
 */
export interface ViewSettings {
  theme: Theme
  viewMode: ViewMode
  diagramsVisible: boolean
  /** Plain chords on the chart and diagrams: Cmaj7 as C. Saved. */
  simpleChords: boolean
  /** The guitar for every song, or 'auto' for each song's own (from its sound). Saved. */
  guitar: Guitar | 'auto'
  /** Who is reading: the keyboard player gets chords as they sound, no shapes. Saved. */
  instrument: Instrument
  toggleTheme: () => void
  toggleViewMode: () => void
  toggleDiagrams: () => void
  toggleSimpleChords: () => void
  setGuitar: (guitar: Guitar | 'auto') => void
  setInstrument: (instrument: Instrument) => void
}

type Set = StoreApi<StoreState>['setState']
type Get = StoreApi<StoreState>['getState']

/**
 * The view settings slice of the store. `canSave` is false while the store
 * is read-only (saved data could not be read), when nothing may be written.
 */
export function viewSettings(set: Set, get: Get, canSave: () => boolean): ViewSettings {
  const persist = (label: string, write: () => Promise<unknown>) => {
    if (canSave()) write().catch(e => console.warn(`${label} failed:`, e))
  }
  return {
    theme: 'dark',
    viewMode: 'normal',
    diagramsVisible: true,
    simpleChords: false,
    guitar: 'auto',
    instrument: 'guitar',

    toggleTheme: () => {
      set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
      persist('saveTheme', () => saveTheme(get().theme))
    },

    toggleViewMode: () => {
      set(state => {
        const viewMode: ViewMode = state.viewMode === 'normal' ? 'stage' : 'normal'
        // Stage Mode locks the chart, so it cannot be entered mid-edit.
        return { viewMode, ...(viewMode === 'stage' && { editMode: false }) }
      })
      persist('save viewMode', () => saveSetting('viewMode', get().viewMode))
    },

    toggleDiagrams: () => {
      set(state => ({ diagramsVisible: !state.diagramsVisible }))
      // Remembered, so hiding them for a bigger chart sticks across launches.
      persist('saveDiagramsVisible', () => saveDiagramsVisible(get().diagramsVisible))
    },

    toggleSimpleChords: () => {
      set(state => ({ simpleChords: !state.simpleChords }))
      persist('save simpleChords', () => saveSetting('simpleChords', get().simpleChords))
    },

    setGuitar: guitar => {
      set({ guitar })
      persist('save guitar', () => saveSetting('guitar', guitar))
    },

    setInstrument: instrument => {
      set({ instrument })
      persist('save instrument', () => saveSetting('instrument', instrument))
    },
  }
}
