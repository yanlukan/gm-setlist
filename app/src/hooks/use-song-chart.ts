import { useMemo } from 'react'
import { useChartView, useStore } from '../store/use-store'
import { capoFor, shapeKey, shapeSections, shapeShift, simplifyRuleFor, simplifyText } from '../music/chart-view'
import { hasBars } from '../music/bars'
import { formMatches } from '../music/form'
import { letterByName } from '../music/letters'
import { layOutParts } from '../music/phrases'
import { hasEditedChart } from '../music/chart-edits'
import { playedKey, transposeFor } from '../music/setlist-text'
import { useBandPositions, type BandPlan } from './use-band-positions'
import type { Section, Song, SongEdits } from '../types'

/** Everything a screen draws from one song, worked out once. */
export interface SongChart {
  song: Song
  songEdits: SongEdits | undefined
  /** The stored chart, at the song's own pitch. */
  sections: Section[]
  /** At the shapes' pitch: what the editor shows and writes back through. */
  displaySections: Section[]
  /** As read: each part of a section on a line of its own, plain if the player asked. Never edited. */
  readSections: Section[]
  /** Written in bars, so drawn in bands. */
  bands: boolean
  notes: string
  form: string[]
  /** The order is shown only when every step is a part of the chart. */
  showForm: boolean
  /** Each part's letter, for a chart in bands. */
  letters: Map<string, string> | undefined
  /** The keyboard player reads every chord as it sounds: no capo, no shapes, no guitar sound. */
  keyboard: boolean
  semitones: number
  capo: number
  /** From the stored chart to the shapes played: the band's key, less the capo. */
  shift: number
  sourceKey: string
  /** The key the band plays it in. */
  playedKey: string
  /** The key of the shapes played: the played key with the capo taken off. */
  shapesKey: string
  /** The band plays it lower and no transpose is set yet. */
  lowerKey: boolean
  bpm: number
  /** The chart shows the player's own chords. */
  edited: boolean
  span: BandPlan['span']
  /** The recommended shape for each chord. */
  band: Record<string, number>
  /** Changes whenever what is drawn changes. */
  fitKey: string
}

export function useSongChart(song: Song | undefined): SongChart | null {
  const edits = useStore(s => s.edits)
  const view = useChartView()
  const songEdits = song ? edits[song.title] : undefined
  const { picks: band, span } = useBandPositions(song, songEdits)
  const rule = simplifyRuleFor(song, songEdits, view)

  return useMemo(() => {
    if (!song) return null
    const displaySections = shapeSections(song, songEdits, view)
    // The parts are found before the chords are made plain, so plain and full
    // charts break their lines in the same places.
    const laidOut = displaySections.map(sec => ({ ...sec, chords: layOutParts(sec.chords) }))
    const readSections = view.simple ? laidOut.map(sec => ({ ...sec, chords: simplifyText(sec.chords, rule) })) : laidOut
    const bands = readSections.some(s => s.chords.split('\n').some(line => hasBars(line)))
    const form = songEdits?.form ?? song.form ?? []
    const semitones = transposeFor(song, songEdits)
    const capo = capoFor(song, songEdits, view)
    const keyboard = view.instrument === 'keyboard'
    const played = playedKey(song, songEdits).key
    return {
      song,
      songEdits,
      sections: songEdits?.sections ?? song.sections ?? [],
      displaySections,
      readSections,
      bands,
      notes: songEdits?.notes ?? song.notes ?? '',
      form,
      showForm: formMatches(form, readSections),
      letters: bands ? letterByName(readSections.map(s => s.name)) : undefined,
      keyboard,
      semitones,
      capo,
      shift: shapeShift(song, songEdits, view),
      sourceKey: songEdits?.key ?? song.key ?? '',
      playedKey: played,
      shapesKey: shapeKey(played, -capo),
      lowerKey: !!song.lowerKey && semitones === 0,
      bpm: songEdits?.bpm ?? song.bpm,
      edited: hasEditedChart(song, songEdits),
      span,
      band,
      fitKey: JSON.stringify([song.title, readSections, form, keyboard, capo]),
    }
  }, [song, songEdits, view, rule, band, span])
}
