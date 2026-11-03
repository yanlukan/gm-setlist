import type { BarEvidence, Song } from '../types'
import { barsOfSection, barChords, squash } from './evidence'
import recordCheckData from '../data/recording-check.json'

/** One bar the recording check has something to say about. */
export interface CheckBar {
  section: string
  bar: number
  chords: string
  kind: 'chord' | 'rhythm'
  record: string
  confidence: number
  at: number[]
}

export interface CheckEntry {
  /** The recording's file name; null when the song has none. */
  recording: string | null
  checked: string
  shift: number
  verdict: string
  bars: CheckBar[]
  unchecked: { section: string; bar: number }[]
}

/** The recording check's findings, one entry per song title. */
export type RecordCheck = Record<string, CheckEntry>

export const RECORD_CHECK = recordCheckData as RecordCheck

export const recordCheckOf = (title: string): CheckEntry | undefined => RECORD_CHECK[title]

/** The line More shows for a check: the recording, the date, and what was not lined up or not checked. */
export function recordCheckText(entry: CheckEntry): string {
  let text = `${entry.recording ?? 'no recording'}, ${entry.checked}`
  if (entry.verdict === 'not lined up' || entry.verdict === 'no song order') text += ` · ${entry.verdict}`
  const n = entry.unchecked?.length ?? 0
  if (n > 0) text += ` · ${n} ${n === 1 ? 'bar' : 'bars'} not checked`
  return text
}

/** A section by ear or from the record: the ear wins and the check marks nothing there. */
const HAND = new Set(['Ear', 'Record'])

/** The song with one finding added as an Unsure bar, or null when the finding makes no mark. */
function withFinding(song: Song, found: CheckBar): Song | null {
  const sections = song.sections.filter(s => s.name === found.section)
  const section = song.evidence?.[found.section]
  if (section?.from && HAND.has(section.from)) return null
  const chartFrom = section?.from ?? song.chordsFrom
  if (!chartFrom || sections.length === 0) return null
  const chords = squash(found.chords)
  if (section?.bars?.some(b => b.bar === found.bar)) return null
  // Every part of that name must still read the disputed chords
  const reads = (s: { chords: string }) => {
    const bar = barsOfSection(s.chords)[found.bar]
    return bar !== undefined && barChords(bar) === chords
  }
  if (!sections.every(reads)) return null
  const record = squash(found.record)
  if (record === '' || record === chords) return null
  const bar: BarEvidence = {
    bar: found.bar,
    chords,
    from: 'Unsure',
    readings: [{ from: chartFrom, chords }, { from: 'Record', chords: record }],
  }
  return {
    ...song,
    evidence: { ...song.evidence, [found.section]: { ...section, bars: [...(section?.bars ?? []), bar] } },
  }
}

/** The songs with the recording's chord findings added as Unsure bars. Never changes its input. */
export function withRecordCheck(songs: Song[], check: RecordCheck): Song[] {
  return songs.map(song => {
    const entry = check[song.title]
    if (!entry || entry.verdict !== 'lined up') return song
    return entry.bars
      .filter(f => f.kind === 'chord')
      .reduce<Song>((acc, f) => withFinding(acc, f) ?? acc, song)
  })
}
