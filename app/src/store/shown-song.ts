import type { Song } from '../types'
import type { StoreState } from './use-store'

export type SongState = Pick<StoreState, 'songs' | 'customSongs' | 'setlistData' | 'currentIndex' | 'extra'>

const everySong = (state: SongState): Song[] => [...state.songs, ...state.customSongs]

/** A list's songs in order (the playing list by default); titles with no song are skipped. */
export function setSongsOf(state: SongState, listId: string = state.setlistData.activeId): Song[] {
  const list = state.setlistData.lists[listId]
  if (!list) return []
  const all = everySong(state)
  return list.songTitles
    .map(title => all.find(song => song.title === title))
    .filter((song): song is Song => song !== undefined)
}

export interface ShownSong { song: Song | undefined; extraFrom: string | null }

/** The song on screen: the extra while one plays, otherwise the set's current song. */
export function shownSongOf(state: SongState): ShownSong {
  const { extra } = state
  const extraSong = extra ? everySong(state).find(song => song.title === extra.title) : undefined
  if (extra && extraSong) {
    return { song: extraSong, extraFrom: state.setlistData.lists[extra.fromListId]?.name ?? 'another list' }
  }
  return { song: setSongsOf(state)[state.currentIndex], extraFrom: null }
}

export interface Neighbours { previous: Song | undefined; next: Song | undefined; returning: boolean }

/** Where Previous and Next lead. After an extra, Next returns to the song the player left. */
export function neighboursOf(state: SongState): Neighbours {
  const songs = setSongsOf(state)
  const returning = shownSongOf(state).extraFrom !== null
  const i = state.currentIndex
  return { previous: songs[i - 1], next: returning ? songs[i] : songs[i + 1], returning }
}
