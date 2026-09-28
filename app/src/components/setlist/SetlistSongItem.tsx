import { useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/use-store'
import { playedKey } from '../../music/setlist-text'

interface SetlistSongItemProps {
  songTitle: string
  index: number
  setlistId: string
  isCurrent?: boolean
  onSelect: (index: number) => void
}

export function SetlistSongItem({ songTitle, index, setlistId, isCurrent, onSelect }: SetlistSongItemProps) {
  const removeSongFromSetlist = useStore(s => s.removeSongFromSetlist)
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const edits = useStore(s => s.edits)

  const song = useMemo(
    () => [...songs, ...customSongs].find(s => s.title === songTitle),
    [songs, customSongs, songTitle],
  )

  // Show the key as it will be played, transpose included.
  const songEdits = edits[songTitle]
  const { key, semitones } = song ? playedKey(song, songEdits) : { key: '', semitones: 0 }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: songTitle })

  const className = ['sl-row', isDragging && 'is-dragging', isCurrent && 'is-current']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="sl-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        &#9776;
      </button>

      <button className="sl-song" onClick={() => onSelect(index)}>
        <span className="sl-song-title">
          <span className="sl-song-num">{index + 1}.</span>
          {songTitle}
        </span>
        <span className="sl-song-meta">
          {song ? (
            <>
              <span>Key {key || '?'}</span>
              {semitones !== 0 && (
                <span className="chip chip-transpose">{semitones > 0 ? `+${semitones}` : semitones}</span>
              )}
              {song.lowerKey && semitones === 0 && <span className="chip chip-warn">LOWER KEY</span>}
              <span>{songEdits?.bpm ?? song.bpm} BPM</span>
              <span>{song.timeSignature}</span>
            </>
          ) : (
            <span className="chip chip-warn">Song not found — it will be skipped</span>
          )}
        </span>
      </button>

      <button
        className="sl-remove"
        aria-label={`Remove ${songTitle} from setlist`}
        onClick={() => {
          if (confirm(`Remove "${songTitle}" from this setlist?`)) removeSongFromSetlist(setlistId, songTitle)
        }}
      >
        &times;
      </button>
    </div>
  )
}
