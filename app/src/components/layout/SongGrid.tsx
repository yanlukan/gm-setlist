import { useEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import type { Song } from '../../types'

interface SongGridProps {
  songs: Song[]
  onClose: () => void
}

/**
 * Every song in the setlist at once, as big numbered tiles. On an iPad the
 * whole 21-song set fits on one screen, so jumping to any song is one tap —
 * no scrolling a thin strip to find it.
 */
export function SongGrid({ songs, onClose }: SongGridProps) {
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const edits = useStore(s => s.edits)
  const setlistName = useStore(s => s.setlistData.lists[s.setlistData.activeId]?.name ?? 'Setlist')
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="songgrid-screen" role="dialog" aria-modal="true" aria-label="All songs">
      <div className="songgrid-header">
        <div className="songgrid-title">{setlistName}</div>
        <div className="songgrid-count">{songs.length} songs</div>
        <button className="songgrid-close" onClick={onClose}>Close</button>
      </div>

      <div className="songgrid-body">
        <div className="songgrid">
          {songs.map((song, i) => {
            const songEdits = edits[song.title]
            const semitones = songEdits?.transpose ?? 0
            const baseKey = songEdits?.key ?? song.key
            const key = semitones && baseKey
              ? transposeChord(baseKey, semitones, shouldUseFlats(baseKey, semitones))
              : baseKey
            const isCurrent = i === currentIndex

            return (
              <button
                key={song.title}
                ref={isCurrent ? currentRef : undefined}
                className={isCurrent ? 'songtile is-current' : 'songtile'}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => {
                  goToSong(i)
                  onClose()
                }}
              >
                <span className="songtile-num">{i + 1}</span>
                <span className="songtile-main">
                  <span className="songtile-title">{song.title}</span>
                  <span className="songtile-meta">
                    {key && <span>{key}</span>}
                    {semitones !== 0 && (
                      <span className="chip chip-transpose">{semitones > 0 ? `+${semitones}` : semitones}</span>
                    )}
                    {song.lowerKey && semitones === 0 && <span className="chip chip-warn">LOWER KEY</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
