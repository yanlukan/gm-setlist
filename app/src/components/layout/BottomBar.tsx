import { useMemo, useState } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { SongGrid } from './SongGrid'
import type { Song } from '../../types'

/**
 * Song navigation. Previous and Next are big buttons that name the song they
 * go to, so the next song is always visible on stage. The middle button opens
 * every song in the set as a grid.
 */
export function BottomBar() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const currentIndex = useStore(s => s.currentIndex)
  const edits = useStore(s => s.edits)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const [gridOpen, setGridOpen] = useState(false)

  const setlistSongs = useMemo(() => {
    const all = [...songs, ...customSongs]
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return []
    return active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter((s): s is Song => s !== undefined)
  }, [songs, customSongs, setlistData])

  const total = setlistSongs.length
  const prev = currentIndex > 0 ? setlistSongs[currentIndex - 1] : undefined
  const next = currentIndex < total - 1 ? setlistSongs[currentIndex + 1] : undefined

  // The key the next song will actually be played in, so you can get ready for it.
  const nextKey = useMemo(() => {
    if (!next) return ''
    const baseKey = edits[next.title]?.key ?? next.key
    const semitones = edits[next.title]?.transpose ?? 0
    if (!semitones || !baseKey) return baseKey
    return transposeChord(baseKey, semitones, shouldUseFlats(baseKey, semitones))
  }, [next, edits])

  return (
    <>
      <nav className="songnav" aria-label="Song navigation">
        <button
          className="songnav-btn songnav-prev"
          onClick={prevSong}
          disabled={!prev}
          aria-label={prev ? `Previous song: ${prev.title}` : 'No previous song'}
        >
          <span className="songnav-arrow" aria-hidden="true">&#9664;</span>
          {prev && (
            <>
              <span className="songnav-num">{currentIndex}.</span>
              <span className="songnav-title">{prev.title}</span>
            </>
          )}
        </button>

        <button
          className="songnav-btn songnav-list"
          onClick={() => setGridOpen(true)}
          disabled={total === 0}
          aria-label="Show all songs"
        >
          &#9776;&nbsp; {total ? currentIndex + 1 : 0} / {total}
        </button>

        <button
          className="songnav-btn songnav-next"
          onClick={nextSong}
          disabled={!next}
          aria-label={next ? `Next song: ${next.title}` : 'End of set'}
        >
          {next ? (
            <>
              <span className="songnav-num">{currentIndex + 2}.</span>
              <span className="songnav-title">{next.title}</span>
              {nextKey && <span className="songnav-key">{nextKey}</span>}
            </>
          ) : (
            <span className="songnav-title">End of set</span>
          )}
          <span className="songnav-arrow" aria-hidden="true">&#9654;</span>
        </button>
      </nav>

      {gridOpen && <SongGrid songs={setlistSongs} onClose={() => setGridOpen(false)} />}
    </>
  )
}
