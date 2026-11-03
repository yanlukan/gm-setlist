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
  recording: string
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
  let text = `${entry.recording}, ${entry.checked}`
  if (entry.verdict === 'not lined up' || entry.verdict === 'no song order') text += ` · ${entry.verdict}`
  const n = entry.unchecked?.length ?? 0
  if (n > 0) text += ` · ${n} ${n === 1 ? 'bar' : 'bars'} not checked`
  return text
}

/** The song with one finding added as an Unsure bar, or null when the finding makes no mark. */
function withFinding(song: Song, found: CheckBar): Song | null {
  const sections = song.sections.filter(s => s.name === found.section)
  const section = song.evidence?.[found.section]
  const chartFrom = section?.from ?? song.chordsFrom
  if (!chartFrom || sections.length === 0) return null
  if (section?.bars?.some(b => b.bar === found.bar)) return null
  // Every part of that name must still read the disputed chords
  const reads = (s: { chords: string }) => {
    const bar = barsOfSection(s.chords)[found.bar]
    return bar !== undefined && barChords(bar) === found.chords
  }
  if (!sections.every(reads)) return null
  const record = squash(found.record)
  if (record === '' || record === found.chords) return null
  const bar: BarEvidence = {
    bar: found.bar,
    chords: found.chords,
    from: 'Unsure',
    readings: [{ from: chartFrom, chords: found.chords }, { from: 'Record', chords: record }],
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
