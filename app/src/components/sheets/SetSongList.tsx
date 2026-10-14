import { useEffect, useMemo, useRef } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { formatLength, playedKey } from '../../music/setlist-text'
import { bandPlanFor, positionLabel } from '../../hooks/use-band-positions'
import { hasEditedChart } from '../../music/chart-edits'
import type { Song } from '../../types'

interface Props {
  songs: Song[]
  /** The row playing now, or null when nothing in this list is playing. */
  currentIndex: number | null
  /** The set song an extra was played from, marked "you left here". */
  leftIndex: number | null
  onPick: (index: number) => void
}

/** A list's songs as rows: number, title, key, length and what to know before playing. */
export function SetSongList({ songs, currentIndex, leftIndex, onPick }: Props) {
  const edits = useStore(s => s.edits)
  const view = useChartView()
  const positions = useMemo(
    () => (view.instrument === 'keyboard' ? [] : songs.map(song => positionLabel(bandPlanFor(song, edits[song.title], view).span))),
    [songs, edits, view],
  )
  const currentRef = useRef<HTMLButtonElement>(null)
  const focusIndex = currentIndex ?? leftIndex

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  return (
    <div className="set-song-list">
      {songs.map((song, i) => {
        const { key, semitones } = playedKey(song, edits[song.title])
        const position = positions[i]
        const isCurrent = i === currentIndex
        return (
          <button
            key={song.title}
            ref={i === focusIndex ? currentRef : undefined}
            className={isCurrent ? 'songtile is-current' : 'songtile'}
            aria-current={isCurrent ? 'true' : undefined}
            onClick={() => onPick(i)}
          >
            <span className="songtile-num">{i + 1}</span>
            <span className="songtile-main">
              <span className="songtile-title">{song.title}</span>
              <span className="songtile-meta">
                {i === leftIndex && <span className="songtile-left">you left here</span>}
                {key && <span>{key}</span>}
                {song.duration && <span>{formatLength(song.duration)}</span>}
                {semitones !== 0 && (
                  <span className="chip chip-transpose">{semitones > 0 ? `+${semitones}` : semitones}</span>
                )}
                {song.lowerKey && semitones === 0 && <span className="chip chip-warn">LOWER KEY</span>}
                {hasEditedChart(song, edits[song.title]) && (
                  <span className="chip chip-edited" title="This song shows your own chords, not the built-in chart">EDITED</span>
                )}
                {position && (
                  <span className="songtile-position" aria-label={`Recommended position: ${position}`}>{position}</span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
