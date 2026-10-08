import { useMemo } from 'react'
import { bandPositions, fretSpan, indexOfShape, voicingsFor } from '../music/voicings'
import { transposeFor } from '../music/setlist-text'
import { isChartMark } from '../music/theory'
import { capoFor, DEFAULT_VIEW, guitarFor, shownSections, type ChartView } from '../music/chart-view'
import { useChartView } from '../store/use-store'
import type { Song, SongEdits } from '../types'

export interface BandPlan {
  /** The recommended shape for each chord, as an index into `voicingsFor(chord)`. */
  picks: Record<string, number>
  /** The frets those shapes cover: the song's recommended area of the neck. */
  span: ReturnType<typeof fretSpan>
  /** The picks that are the song's researched shapes (`Song.shapes`), by chord. */
  researched: Record<string, number>
}

/**
 * The recommended shape for each chord of a song. Chords are named as they
 * are shown (in the key the band plays, less any capo, plain if the player
 * asked for plain chords) and listed in the order they first appear.
 */
export function useBandPositions(song: Song | undefined, edits: SongEdits | undefined): BandPlan {
  const view = useChartView()
  return useMemo(() => bandPlanFor(song, edits, view), [song, edits, view])
}

/** How a song's recommended area of the neck reads on screen. */
export function positionLabel(span: BandPlan['span']): string {
  if (!span) return ''
  if (span.open) return span.max <= 3 ? 'Open position' : `Open to fret ${span.max}`
  return `Frets ${span.min}–${span.max}`
}

/**
 * Plans already worked out, per song, per state of its edits and per way of
 * showing chords. The chart, the diagrams and the song list all ask for the
 * same plans; an edit makes a new edits object, so a changed chart is always
 * planned afresh.
 */
const plans = new WeakMap<Song, WeakMap<object, Map<string, BandPlan>>>()
const NO_EDITS = {}

/** The same plan as `useBandPositions`, for any number of songs at once. */
export function bandPlanFor(song: Song | undefined, edits: SongEdits | undefined, view: ChartView = DEFAULT_VIEW): BandPlan {
  if (!song) return { picks: {}, span: null, researched: {} }
  const bySong = plans.get(song) ?? new WeakMap<object, Map<string, BandPlan>>()
  plans.set(song, bySong)
  const byEdits = bySong.get(edits ?? NO_EDITS) ?? new Map<string, BandPlan>()
  bySong.set(edits ?? NO_EDITS, byEdits)
  const viewKey = `${view.simple}:${guitarFor(song, edits, view)}`
  const known = byEdits.get(viewKey)
  if (known) return known
  const plan = planSong(song, edits, view)
  byEdits.set(viewKey, plan)
  return plan
}

function planSong(song: Song, edits: SongEdits | undefined, view: ChartView): BandPlan {
  const counts = new Map<string, number>()
  for (const section of shownSections(song, edits, view)) {
    for (const token of section.chords.split(/[\s|,]+/)) {
      if (token && !isChartMark(token)) counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }
  // Researched shapes are for the key the band plays, with no capo. In
  // another key a chord of the same name is a different chord of the song
  // (Faith's F# down two is E), so the shapes are chosen afresh.
  const fixed: Record<string, number> = {}
  if (transposeFor(song, edits) === (song.transpose ?? 0) && capoFor(song, edits) === 0) {
    for (const [name, shape] of Object.entries(song.shapes ?? {})) {
      const index = indexOfShape(name, shape)
      if (index >= 0 && counts.has(name)) fixed[name] = index
    }
  }
  const picks = bandPositions([...counts].map(([name, weight]) => ({ name, weight })), guitarFor(song, edits, view), fixed)
  const shapes = Object.entries(picks).map(([name, i]) => voicingsFor(name)[i]).filter(v => v && !v.wrong)
  // Only the researched shapes the plan kept (acoustic leaves out the two- and three-string ones)
  const researched = Object.fromEntries(Object.entries(fixed).filter(([name, i]) => picks[name] === i))
  return { picks, span: fretSpan(shapes), researched }
}
