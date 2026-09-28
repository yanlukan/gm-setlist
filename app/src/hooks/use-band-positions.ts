import { useMemo } from 'react'
import { bandPositions } from '../music/voicings'
import { transposeFor } from '../music/setlist-text'
import { isChartMark, transposeInKey } from '../music/theory'
import type { Song, SongEdits } from '../types'

/**
 * The band shape to show for each chord of a song, as an index into
 * `voicingsFor(chord)`. Chords are named as they are shown, in the key the
 * band plays, and listed in the order they first appear.
 */
export function useBandPositions(song: Song | undefined, edits: SongEdits | undefined): Record<string, number> {
  return useMemo(() => {
    if (!song) return {}
    const sections = edits?.sections ?? song.sections ?? []
    const key = edits?.key ?? song.key ?? ''
    const semitones = transposeFor(song, edits)
    const counts = new Map<string, number>()
    for (const section of sections) {
      for (const token of transposeInKey(section.chords, key, semitones).split(/[\s|,]+/)) {
        if (token && !isChartMark(token)) counts.set(token, (counts.get(token) ?? 0) + 1)
      }
    }
    return bandPositions([...counts].map(([name, weight]) => ({ name, weight })), song.preset?.name)
  }, [song, edits])
}
