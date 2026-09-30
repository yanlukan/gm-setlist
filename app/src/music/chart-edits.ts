import type { Section, Song, SongEdits } from '../types'

/** Two charts with the same sections, in the same order, with the same chords. */
export function sameSections(a: readonly Section[], b: readonly Section[]): boolean {
  return a.length === b.length && a.every((s, i) => s.name === b[i].name && s.chords === b[i].chords)
}

/** One section that is not the same in two charts, by position. A missing section reads as null. */
export interface SectionDifference {
  name: string
  mine: string | null
  builtIn: string | null
  /** The built-in section at this position: it may have another name, when the saved chart is laid out differently. */
  builtInName: string | null
}

/** The sections of a saved chart that are not as the built-in chart has them. */
export function differingSections(mine: readonly Section[], builtIn: readonly Section[]): SectionDifference[] {
  const found: SectionDifference[] = []
  for (let i = 0; i < Math.max(mine.length, builtIn.length); i++) {
    const a = mine[i]
    const b = builtIn[i]
    if (a?.name === b?.name && a?.chords === b?.chords) continue
    found.push({ name: a?.name ?? b.name, mine: a ? a.chords : null, builtIn: b ? b.chords : null, builtInName: b ? b.name : null })
  }
  return found
}

/**
 * The song shows chords the player changed rather than the built-in chart.
 * Such a song keeps them: a fix to the built-in chart does not reach it.
 */
export function hasEditedChart(song: Song, edits: SongEdits | undefined): boolean {
  return !!edits?.sections && !sameSections(edits.sections, song.sections ?? [])
}
