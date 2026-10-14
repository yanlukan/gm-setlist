import { DEFAULT_SONGS } from '../data/songs'
import type { Song } from '../types'

/**
 * The song's number in the George Michael Complete songbook, or undefined when
 * it is not in the book. A copy of a built-in song (from an old backup) finds
 * its number through the built-in song of the same title.
 */
export function songbookOf(song: Song): number | undefined {
  return song.songbook ?? DEFAULT_SONGS.find(s => s.title === song.title)?.songbook
}
