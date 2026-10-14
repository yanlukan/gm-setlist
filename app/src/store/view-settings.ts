import type { StoreApi } from 'zustand'
import type { Theme, ViewMode } from '../types'
import type { Guitar } from '../music/voicings'
import type { Instrument } from '../music/chart-view'
import { saveTheme, saveSetting, getSetting, getTheme } from './persistence'
import type { StoreState } from './use-store'

/** The sheets the bottom bar opens; only one is open at a time. */
export type SheetName = 'setlists' | 'songs' | 'notes' | 'more' | 'finder'

/**
 * How the player wants the app to look: the same for every song, and saved
 * so it survives a relaunch. Read back by the store's hydrate.
 */
export interface ViewSettings {
  theme: Theme
  viewMode: ViewMode
  /** Plain chords on the chart and diagrams: Cmaj7 as C. Saved. */
  simpleChords: boolean
  /** The guitar for every song, or 'auto' for each song's own (from its sound). Saved. */
  guitar: Guitar | 'auto'
  /** Who is reading: the keyboard player gets chords as they sound, no shapes. Saved. */
  instrument: Instrument
  /** The bar's open sheet, if any. Not saved. Previous, Next and the pedal close it. */
  openSheet: SheetName | null
  toggleTheme: () => void
  toggleViewMode: () => void
  toggleSimpleChords: () => void
  setGuitar: (guitar: Guitar | 'auto') => void
  setInstrument: (instrument: Instrument) => void
  /** Opens the sheet, or closes it when it is already open. */
  toggleSheet: (name: SheetName) => void
  closeSheet: () => void
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
    simpleChords: false,
    guitar: 'auto',
    instrument: 'guitar',
    openSheet: null,

    toggleTheme: () => {
      set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
      persist('saveTheme', () => saveTheme(get().theme))
    },

    toggleViewMode: () => {
      set(state => {
        const viewMode: ViewMode = state.viewMode === 'normal' ? 'stage' : 'normal'
        // Stage Mode locks the chart, so it cannot be entered mid-edit.
        // Each screen has its own sheets, so switching closes the open one.
        return { viewMode, openSheet: null, ...(viewMode === 'stage' && { editMode: false }) }
      })
      persist('save viewMode', () => saveSetting('viewMode', get().viewMode))
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

    toggleSheet: name => set(state => ({ openSheet: state.openSheet === name ? null : name })),
    closeSheet: () => set({ openSheet: null }),
  }
}

/**
 * The saved view settings, for the store's hydrate. A value that is missing
 * or not one the app knows is left out, so the default stays.
 */
export async function readViewSettings(): Promise<
  Partial<Pick<ViewSettings, 'theme' | 'viewMode' | 'simpleChords' | 'guitar' | 'instrument'>>
> {
  const [theme, viewMode, simpleChords, guitar, instrument] = await Promise.all([
    getTheme(),
    getSetting<ViewMode>('viewMode'),
    getSetting<boolean>('simpleChords'),
    getSetting<Guitar | 'auto'>('guitar'),
    getSetting<Instrument>('instrument'),
  ])
  return {
    ...(theme && { theme }),
    ...((viewMode === 'stage' || viewMode === 'normal') && { viewMode }),
    ...(typeof simpleChords === 'boolean' && { simpleChords }),
    ...((guitar === 'auto' || guitar === 'acoustic' || guitar === 'electric') && { guitar }),
    ...((instrument === 'guitar' || instrument === 'keyboard') && { instrument }),
  }
}
