import type { Song } from '../types'
import { SONGS } from './songs'

const isText = (v: unknown): v is string => typeof v === 'string'

/** A song file that can be opened: the text fields, a tempo, and at least one section with chords. */
export function isAddedSong(value: unknown): value is Song {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  if (!isText(s.title) || !isText(s.artist) || !isText(s.key) || !isText(s.timeSignature)) return false
  if (typeof s.bpm !== 'number' || !Number.isFinite(s.bpm)) return false
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
    out.push(file)
  }
  return out
}

/** The songs written as JSON files in ./added, opened like the shipped ones. Vite only: Node scripts use scripts/added-songs.mjs. */
export const ADDED_SONGS: Song[] = addedSongs(
  import.meta.glob('./added/*.json', { eager: true, import: 'default' }),
  SONGS,
)
