import type { Song } from '../types'
import { SONGS } from './songs'

const isText = (v: unknown): v is string => typeof v === 'string'
const SOURCES = ['Ear', 'Book', 'Record', 'Chart']

/** A song file that can be opened (notes and capo may be missing, addedSongs fills them): a title, the text fields, a tempo,
 *  a time signature of whole beats, at least one section with chords, and a song order and source only when well formed. */
export function isAddedSong(value: unknown): value is Song {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  if (!isText(s.title) || !isText(s.artist) || !isText(s.key) || !isText(s.timeSignature)) return false
  if (typeof s.bpm !== 'number' || !Number.isFinite(s.bpm)) return false
  if (s.title.trim() === '') return false
  const time = /^(\d+)\/(\d+)$/.exec(s.timeSignature)
  if (!time || Number(time[1]) < 1 || Number(time[2]) < 1) return false
  if (s.form !== undefined && !(Array.isArray(s.form) && s.form.every(isText))) return false
  if (s.chordsFrom !== undefined && !SOURCES.includes(s.chordsFrom as string)) return false
  if (s.notes !== undefined && !isText(s.notes)) return false
  if (s.capo !== undefined && s.capo !== null && (typeof s.capo !== 'number' || !Number.isFinite(s.capo))) return false
  if (!Array.isArray(s.sections) || s.sections.length === 0) return false
  return s.sections.every(sec => typeof sec === 'object' && sec !== null && isText((sec as Record<string, unknown>).name) && isText((sec as Record<string, unknown>).chords))
}

/** The valid songs among the files, by file name; a title already shipped or already taken is skipped. */
export function addedSongs(files: Record<string, unknown>, shipped: Song[]): Song[] {
  const taken = new Set(shipped.map(s => s.title))
  const out: Song[] = []
  for (const name of Object.keys(files).sort()) {
    const file = files[name]
    if (!isAddedSong(file) || taken.has(file.title)) continue
    taken.add(file.title)
    out.push({ ...file, notes: file.notes ?? '', capo: file.capo ?? null })
  }
  return out
}

/** The songs written as JSON files in ./added, opened like the shipped ones. Vite only: Node scripts use scripts/added-songs.mjs. */
export const ADDED_SONGS: Song[] = addedSongs(
  import.meta.glob('./added/*.json', { eager: true, import: 'default' }),
  SONGS,
)
