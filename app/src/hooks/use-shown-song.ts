import { useMemo } from 'react'
import { useStore } from '../store/use-store'
import { neighboursOf, placeOf, setSongsOf, shownSongOf, type Neighbours, type ShownSong, type SongState } from '../store/shown-song'
import type { Song } from '../types'

export interface ShownSongView extends ShownSong, Neighbours {
  setSongs: Song[]
  /** The set's current place (0-based), inside the songs found on this device. */
  place: number
}

// zustand 5 needs stable selector results: select the pieces, derive with useMemo
export function useShownSong(): ShownSongView {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const currentIndex = useStore(s => s.currentIndex)
  const extra = useStore(s => s.extra)
  return useMemo(() => {
    const state: SongState = { songs, customSongs, setlistData, currentIndex, extra }
    const setSongs = setSongsOf(state)
    return { ...shownSongOf(state), ...neighboursOf(state), setSongs, place: placeOf(state, setSongs) }
  }, [songs, customSongs, setlistData, currentIndex, extra])
}

/** The songs of one list; the playing list when no id is given. */
export function useSetSongs(listId?: string): Song[] {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  return useMemo(
    () => setSongsOf({ songs, customSongs, setlistData, currentIndex: 0, extra: null }, listId),
    [songs, customSongs, setlistData, listId],
  )
}
