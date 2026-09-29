import { useMemo } from 'react'
import { bandPositions, fretSpan, indexOfShape, voicingsFor } from '../music/voicings'
import { transposeFor } from '../music/setlist-text'
import { isChartMark, transposeInKey } from '../music/theory'
import type { Song, SongEdits } from '../types'

export interface BandPlan {
  /** The recommended shape for each chord, as an index into `voicingsFor(chord)`. */
  picks: Record<string, number>
  /** The frets those shapes cover: the song's recommended area of the neck. */
  span: ReturnType<typeof fretSpan>
}

/**
 * The recommended shape for each chord of a song. Chords are named as they
 * are shown, in the key the band plays, and listed in the order they first
 * appear.
 */
export function useBandPositions(song: Song | undefined, edits: SongEdits | undefined): BandPlan {
  return useMemo(() => bandPlanFor(song, edits), [song, edits])
}

/** How a song's recommended area of the neck reads on screen. */
export function positionLabel(span: BandPlan['span']): string {
  if (!span) return ''
  if (span.open) return span.max <= 3 ? 'Open position' : `Open to fret ${span.max}`
  return `Frets ${span.min}–${span.max}`
}

/**
 * Plans already worked out, per song and per state of its edits. The chart,
 * the diagrams and the song list all ask for the same plans; an edit makes a
 * new edits object, so a changed chart is always planned afresh.
 */
const plans = new WeakMap<Song, WeakMap<object, BandPlan>>()
const NO_EDITS = {}

/** The same plan as `useBandPositions`, for any number of songs at once. */
export function bandPlanFor(song: Song | undefined, edits: SongEdits | undefined): BandPlan {
  if (!song) return { picks: {}, span: null }
  const bySong = plans.get(song) ?? new WeakMap<object, BandPlan>()
  plans.set(song, bySong)
  const known = bySong.get(edits ?? NO_EDITS)
  if (known) return known
  const plan = planSong(song, edits)
  bySong.set(edits ?? NO_EDITS, plan)
  return plan
}

function planSong(song: Song, edits: SongEdits | undefined): BandPlan {
  {
    const sections = edits?.sections ?? song.sections ?? []
    const key = edits?.key ?? song.key ?? ''
    const semitones = transposeFor(song, edits)
    const counts = new Map<string, number>()
    for (const section of sections) {
      for (const token of transposeInKey(section.chords, key, semitones).split(/[\s|,]+/)) {
        if (token && !isChartMark(token)) counts.set(token, (counts.get(token) ?? 0) + 1)
      }
    }
    const fixed: Record<string, number> = {}
    for (const [name, shape] of Object.entries(song.shapes ?? {})) {
      const index = indexOfShape(name, shape)
      if (index >= 0) fixed[name] = index
    }
    const picks = bandPositions([...counts].map(([name, weight]) => ({ name, weight })), song.preset?.name, fixed)
    const shapes = Object.entries(picks).map(([name, i]) => voicingsFor(name)[i]).filter(Boolean)
    return { picks, span: fretSpan(shapes) }
  }
}
