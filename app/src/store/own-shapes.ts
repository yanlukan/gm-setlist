import type { StoreApi } from 'zustand'
import { parseShapeText } from '../music/own-shapes'
import { chordNotes, setOwnShapes, shapeText } from '../music/voicings'
import { saveSelectedVoicings, saveSetting } from './persistence'
import type { StoreState } from './use-store'

/**
 * The shapes slice of the store: a shape picked for a chord in every song,
 * and the shapes the player wrote. Both saved, read back by the store's hydrate.
 */
export interface ShapeSettings {
  /** A shape picked for a chord in every song. A song's own pick comes first. */
  selectedVoicings: Record<string, number>
  /** Shapes the player wrote, by chord, as fret text (x-x-2-2-3-5). */
  ownShapes: Record<string, string[]>
  selectVoicing: (chord: string, index: number) => void
  /** Forget the shape picked for a chord, so each song shows its band shape again. */
  clearVoicing: (chord: string) => void
  /** Keep a written shape for a chord. Tidied; ignored when it cannot be read or is already kept. */
  addOwnShape: (chord: string, text: string) => void
  removeOwnShape: (chord: string, text: string) => void
}

type Set = StoreApi<StoreState>['setState']
type Get = StoreApi<StoreState>['getState']

export function shapeSettings(set: Set, get: Get, canSave: () => boolean): ShapeSettings {
  const persist = (label: string, write: () => Promise<unknown>) => {
    if (canSave()) write().catch(e => console.warn(`${label} failed:`, e))
  }
  const keepOwn = (ownShapes: Record<string, string[]>) => {
    set({ ownShapes })
    setOwnShapes(ownShapes)
    persist('save own shapes', () => saveSetting('ownShapes', ownShapes))
  }
  return {
    selectedVoicings: {},
    ownShapes: {},

    selectVoicing: (chord, index) => {
      set(state => ({ selectedVoicings: { ...state.selectedVoicings, [chord]: index } }))
      persist('saveSelectedVoicings', () => saveSelectedVoicings(get().selectedVoicings))
    },

    clearVoicing: chord => {
      set(state => {
        const rest = { ...state.selectedVoicings }
        delete rest[chord]
        return { selectedVoicings: rest }
      })
      persist('saveSelectedVoicings', () => saveSelectedVoicings(get().selectedVoicings))
    },

    addOwnShape: (chord, text) => {
      const voicing = parseShapeText(text)
      if (!voicing || !chordNotes(chord)) return
      const shape = shapeText(voicing)
      const have = get().ownShapes[chord] ?? []
      if (have.includes(shape)) return
      keepOwn({ ...get().ownShapes, [chord]: [...have, shape] })
    },

    removeOwnShape: (chord, text) => {
      const rest = (get().ownShapes[chord] ?? []).filter(s => s !== text)
      const next = { ...get().ownShapes }
      if (rest.length) next[chord] = rest
      else delete next[chord]
      keepOwn(next)
    },
  }
}
