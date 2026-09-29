import type { Song, SongEdits } from '../types'
import { shouldUseFlats, transposeChord } from './theory'

export interface PlayedKey {
  /** The key the song is actually played in, transpose applied. */
  key: string
  /** The key before transposing (the song's key, or an edited one). */
  original: string
  semitones: number
}

/** The player's own transpose if they set one, else the band's key, else none. */
export function transposeFor(song: Song | undefined, edits?: SongEdits): number {
  return edits?.transpose ?? song?.transpose ?? 0
}

export function playedKey(song: Song, edits?: SongEdits): PlayedKey {
  const original = edits?.key ?? song.key
  const semitones = transposeFor(song, edits)
  const key = semitones && original
    ? transposeChord(original, semitones, shouldUseFlats(original, semitones))
    : original
  return { key, original, semitones }
}

/**
 * The setlist as plain text for the band: running order and the key each
 * song is played in. Lower-key songs whose transpose isn't set yet are
 * flagged so nobody learns the wrong key.
 */
export function formatSetlist(name: string, songs: Song[], edits: Record<string, SongEdits>): string {
  const lines = songs.map((song, i) => {
    const { key, original, semitones } = playedKey(song, edits[song.title])
    const detail = semitones
      ? `${key}, orig. ${original}`
      : song.lowerKey
        ? `${key}, lower key TBC`
        : key
    return `${i + 1}. ${song.title} (${detail})`
  })
  const length = setLength(songs)
  const summary = `${songs.length} songs` + (length ? `, about ${length} by the recordings` : '')
  return [name, summary, '', ...lines].join('\n')
}

/** 283 -> "4:43" */
export function formatLength(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
}

/**
 * Total running time of the recordings, e.g. "1 h 39 m". Songs without a
 * known length are left out and the total gets a "+" so it never looks exact.
 */
export function setLength(songs: Song[]): string {
  const known = songs.filter(s => typeof s.duration === 'number')
  if (known.length === 0) return ''
  const total = Math.round(known.reduce((sum, s) => sum + (s.duration ?? 0), 0) / 60)
  const text = total >= 60 ? `${Math.floor(total / 60)} h ${total % 60} m` : `${total} m`
  return known.length < songs.length ? text + '+' : text
}
