import type { Section, Song, SongEdits } from '../types'

/** Two charts with the same sections, in the same order, with the same chords. */
export function sameSections(a: readonly Section[], b: readonly Section[]): boolean {
  return a.length === b.length && a.every((s, i) => s.name === b[i].name && s.chords === b[i].chords)
}

/**
 * The song shows chords the player changed rather than the built-in chart.
 * Such a song keeps them: a fix to the built-in chart does not reach it.
 */
export function hasEditedChart(song: Song, edits: SongEdits | undefined): boolean {
  return !!edits?.sections && !sameSections(edits.sections, song.sections ?? [])
}
