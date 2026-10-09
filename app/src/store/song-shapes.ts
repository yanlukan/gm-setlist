import { persistEdits, useStore } from './use-store'
import type { SongEdits } from '../types'

/** Change one song's edits and save them. */
function change(title: string, update: (edits: SongEdits) => SongEdits): void {
  const next = update(useStore.getState().edits[title] ?? {})
  useStore.setState(state => ({ edits: { ...state.edits, [title]: next } }))
  persistEdits(title, next)
}

/** Without the song's own picks, leaving no empty set behind. */
function withShapes(edits: SongEdits, shapes: Record<string, number | string>): SongEdits {
  const { shapes: _, ...rest } = edits
  return Object.keys(shapes).length > 0 ? { ...rest, shapes } : rest
}

/**
 * Move every chord of a song to an area of the neck. Picks made for the
 * song before belong where the chords were, so they go.
 */
export function moveChords(title: string, neck: number): void {
  change(title, edits => ({ ...withShapes(edits, {}), neck }))
}

/** Back to the songbook's shapes (or the app's usual ones): the move and the song's picks go. */
export function backToSongShapes(title: string): void {
  change(title, edits => {
    const { neck: _, ...rest } = withShapes(edits, {})
    return rest
  })
}

/** A shape the player picked for one chord of this song only: its index, or one of your own shapes as fret text. */
export function pickSongShape(title: string, chord: string, pick: number | string): void {
  change(title, edits => withShapes(edits, { ...edits.shapes, [chord]: pick }))
}

/** Back to the app's shape for one chord of this song. */
export function clearSongShape(title: string, chord: string): void {
  change(title, edits => {
    const { [chord]: _, ...rest } = edits.shapes ?? {}
    return withShapes(edits, rest)
  })
}
