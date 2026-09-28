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
  return [name, '', ...lines].join('\n')
}
