import type { Section, Song } from '../types'
import type { ChartDraft } from './chart-text-import'
import { withRecordCheck, type CheckEntry } from './record-check'
import { openUnsure, sureBarProblem } from './evidence'

/** What server/add_song.py answers for one recording (see server/recording_check/README.md). */
export interface AddAnswer {
  /** The recording's file name, never its folder. */
  recording: string
  duration: number
  key: string
  bpm: number
  timeSignature: string
  route: 'chart' | 'words' | 'record'
  /** Route chart: stage 5's check of the chart against the record. */
  check?: CheckEntry
  /** Routes words and record: the bars, the song order and the Unsure bars. */
  sections?: Section[]
  form?: string[]
  evidence?: Song['evidence']
}

const isText = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isSections = (v: unknown): v is Section[] =>
  Array.isArray(v) && v.length > 0 && v.every(s => s && isText(s.name) && isText(s.chords))

/** The reason an answer cannot make a song, or null when it can. */
export function answerProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'the answer is not an object'
  const a = value as Record<string, unknown>
  if (!isText(a.recording) || a.recording === '' || /[\\/]/.test(a.recording)) return 'the answer must name the recording by file name'
  if (!isNumber(a.duration) || !isNumber(a.bpm) || a.bpm <= 0) return 'the answer needs a duration and a tempo'
  if (!isText(a.key) || a.key === '') return 'the answer needs a key'
  if (!isText(a.timeSignature) || !/^\d+\/\d+$/.test(a.timeSignature)) return 'the answer needs a time signature'
  if (a.route === 'chart') {
    const check = a.check as Record<string, unknown> | undefined
    if (typeof check !== 'object' || check === null || !isText(check.verdict) || !Array.isArray(check.bars)) return 'route chart needs a check'
    return null
  }
  if (a.route !== 'words' && a.route !== 'record') return `unknown route ${String(a.route)}`
  if (!isSections(a.sections)) return `route ${a.route} needs sections`
  if (!Array.isArray(a.form) || !a.form.every(isText)) return `route ${a.route} needs a song order`
  if (a.evidence !== undefined && (typeof a.evidence !== 'object' || a.evidence === null)) return `route ${a.route} has bad evidence`
  // Route record: every bar comes from the detector alone, so every bar must be an open Unsure bar
  const sure = a.route === 'record' ? sureBarProblem({ sections: a.sections, evidence: a.evidence as Song['evidence'] }) : null
  return sure && `route record: ${sure}`
}

/** Route words with a chart it could not line up falls back to the record's own parts: no part says it is from the chart. */
const fromChart = (answer: AddAnswer) => Object.values(answer.evidence ?? {}).some(section => section.from === 'Chart')

/** The rule Python's audio.cache_file uses: lower case, every run of other characters one dash. */
export const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const songFileName = (title: string) => `${slug(title)}.json`

const bars = (n: number) => `${n} ${n === 1 ? 'bar' : 'bars'}`

/** What the route did, in plain words, with the count of Unsure bars. */
function routeNote(answer: AddAnswer, unsure: number): string {
  if (answer.route === 'words' && !fromChart(answer)) {
    return `Your chart could not be lined up, so the bars and chords are read off the recording; every bar is unsure until you hear it (${bars(unsure)}).`
  }
  if (answer.route === 'record') return `Bars and chords read off the recording; every bar is unsure until you hear it (${bars(unsure)}).`
  if (answer.route === 'chart' && answer.check?.verdict !== 'lined up') {
    return 'From your chart; the recording could not be lined up, so nothing is marked.'
  }
  if (answer.route === 'words') return `From your chart, its chords placed on the recording's bars; ${bars(unsure)} to check.`
  return `From your chart, lined up with the recording; ${bars(unsure)} to check.`
}

/** The finished song for one answer. Throws when the route needs a chart the input does not have. */
export function addedSong(input: { title: string; artist: string; draft: ChartDraft | null }, answer: AddAnswer): Song {
  const base = {
    title: input.title,
    artist: input.artist,
    key: answer.key,
    bpm: answer.bpm,
    timeSignature: answer.timeSignature,
    capo: null,
    notes: '',
    duration: Math.round(answer.duration),
  }
  let song: Song
  if (answer.route === 'chart') {
    if (!input.draft || input.draft.sections.length === 0) throw new Error('route chart needs the chart')
    song = { ...base, sections: input.draft.sections, form: input.draft.form, chordsFrom: 'Chart' }
    if (answer.check) song = withRecordCheck([song], { [input.title]: answer.check })[0]
  } else {
    if (!answer.sections?.length) throw new Error(`route ${answer.route} needs sections`)
    song = {
      ...base,
      sections: answer.sections,
      form: answer.form,
      chordsFrom: answer.route === 'words' && fromChart(answer) ? 'Chart' : 'Record',
      ...(answer.evidence ? { evidence: answer.evidence } : {}),
    }
  }
  const unsure = openUnsure(song, undefined).length
  return { ...song, notes: `Recording: ${answer.recording}. ${routeNote(answer, unsure)}` }
}
