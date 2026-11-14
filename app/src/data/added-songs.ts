import type { Song } from '../types'
import { sureBarProblem } from '../music/evidence'
import { SONGS } from './songs'

const isText = (v: unknown): v is string => typeof v === 'string'
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const SOURCES = ['Ear', 'Book', 'Record', 'Chart']
const isSource = (v: unknown) => SOURCES.includes(v as string)

/** One title for another, whatever its case, spacing or apostrophes (' or ’). */
export const sameTitle = (a: string, b: string) => {
  const plain = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[‘’`]/g, "'")
  return plain(a) === plain(b)
}

/** What is wrong with one bar's evidence, or null. */
function barProblem(bar: unknown): string | null {
  if (!isObject(bar)) return 'a bar is not an object'
  if (typeof bar.bar !== 'number' || !Number.isInteger(bar.bar) || bar.bar < 0) return 'a bar has no bar number'
  if (!isText(bar.chords)) return `bar ${bar.bar} has no chords`
  if (!isSource(bar.from) && bar.from !== 'Unsure') return `bar ${bar.bar} has an unknown source`
  if (bar.readings === undefined) return null
  const good = Array.isArray(bar.readings) && bar.readings.every(r => isObject(r) && isSource(r.from) && isText(r.chords))
  return good ? null : `bar ${bar.bar} has bad readings`
}

/** What is wrong with the evidence's shape (types.ts SectionEvidence, by the name of a part), or null. */
function evidenceProblem(evidence: unknown, names: string[]): string | null {
  if (!isObject(evidence)) return 'the evidence is not an object'
  for (const [name, section] of Object.entries(evidence)) {
    if (!names.includes(name)) return `the evidence names "${name}", not a part of the song`
    if (!isObject(section)) return `the evidence for "${name}" is not an object`
    if (section.from !== undefined && !isSource(section.from)) return `the evidence for "${name}" has an unknown source`
    if (section.bars === undefined) continue
    if (!Array.isArray(section.bars)) return `the evidence for "${name}" has no list of bars`
    for (const bar of section.bars) {
      const problem = barProblem(bar)
      if (problem) return `the evidence for "${name}": ${problem}`
    }
  }
  return null
}

/** Why a song file cannot be opened, or null when it can (notes and capo may be missing, addedSongs fills them):
 *  a title, the text fields, a tempo above 0, a time signature of whole beats, at least one section with chords and
 *  each name once, a song order of those names, a known source, evidence of the right shape, and a song from the
 *  record with every bar Unsure (as add-song.mjs writes it). */
export function addedSongProblem(value: unknown): string | null {
  if (!isObject(value)) return 'not a song: not an object'
  const s = value
  if (!isText(s.title) || s.title.trim() === '') return 'no title'
  if (!isText(s.artist) || !isText(s.key) || !isText(s.timeSignature)) return 'no artist, key or time signature'
  if (typeof s.bpm !== 'number' || !Number.isFinite(s.bpm) || s.bpm <= 0) return 'no tempo above 0'
  const time = /^(\d+)\/(\d+)$/.exec(s.timeSignature)
  if (!time || Number(time[1]) < 1 || Number(time[2]) < 1) return `the time signature ${s.timeSignature} is not whole beats`
  if (s.chordsFrom !== undefined && !isSource(s.chordsFrom)) return 'an unknown source for the chords'
  if (s.notes !== undefined && !isText(s.notes)) return 'notes that are not text'
  if (s.capo !== undefined && s.capo !== null && (typeof s.capo !== 'number' || !Number.isFinite(s.capo))) return 'a capo that is not a number'
  if (!Array.isArray(s.sections) || s.sections.length === 0) return 'no sections'
  if (!s.sections.every(sec => isObject(sec) && isText(sec.name) && isText(sec.chords))) return 'a section without a name or chords'
  const names = (s.sections as { name: string }[]).map(sec => sec.name)
  const twice = names.find((name, i) => names.indexOf(name) !== i)
  if (twice !== undefined) return `two parts are called "${twice}"`
  if (s.form !== undefined) {
    if (!Array.isArray(s.form) || !s.form.every(isText)) return 'a song order that is not a list of names'
    const missing = s.form.find(name => !names.includes(name))
    if (missing !== undefined) return `the song order names "${missing}", not a part of the song`
  }
  if (s.evidence !== undefined) {
    const problem = evidenceProblem(s.evidence, names)
    if (problem) return problem
  }
  if (s.chordsFrom === 'Record') {
    const sure = sureBarProblem(s as unknown as Song)
    if (sure) return `from the record, but ${sure}`
  }
  return null
}

/** A song file that can be opened (see addedSongProblem). */
export const isAddedSong = (value: unknown): value is Song => addedSongProblem(value) === null

/** The valid songs among the files, by file name, and the files skipped with why: a title already shipped or already taken is skipped. */
export function addedSongsReport(files: Record<string, unknown>, shipped: Song[]): { songs: Song[]; skipped: { file: string; reason: string }[] } {
  const taken: string[] = shipped.map(s => s.title)
  const songs: Song[] = []
  const skipped: { file: string; reason: string }[] = []
  for (const file of Object.keys(files).sort()) {
    const value = files[file]
    const problem = addedSongProblem(value)
    if (problem) {
      skipped.push({ file, reason: problem })
      continue
    }
    const song = value as Song
    const held = taken.find(title => sameTitle(title, song.title))
    if (held !== undefined) {
      skipped.push({ file, reason: `"${held}" is already in the library` })
      continue
    }
    taken.push(song.title)
    songs.push({ ...song, notes: song.notes ?? '', capo: song.capo ?? null })
  }
  return { songs, skipped }
}

/** The valid songs among the files, by file name (see addedSongsReport). */
export const addedSongs = (files: Record<string, unknown>, shipped: Song[]): Song[] => addedSongsReport(files, shipped).songs

/** The shipped songs, whose titles an added song may not take: for scripts/added-songs.mjs, which loads this module. */
export { SONGS as SHIPPED_SONGS }

/** The songs written as JSON files in ./added, opened like the shipped ones. Vite only: Node scripts use scripts/added-songs.mjs. */
export const ADDED_SONGS: Song[] = addedSongs(
  import.meta.glob('./added/*.json', { eager: true, import: 'default' }),
  SONGS,
)
