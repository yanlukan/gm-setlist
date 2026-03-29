import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/use-store'

interface SetlistSongItemProps {
  songTitle: string
  index: number
  setlistId: string
  onSelect: (index: number) => void
}

export function SetlistSongItem({ songTitle, index, setlistId, onSelect }: SetlistSongItemProps) {
  const removeSongFromSetlist = useStore(s => s.removeSongFromSetlist)
  const allSongs = useStore(s => s.allSongs)
  const getCurrentKey = useStore(s => s.getCurrentKey)

  const song = allSongs().find(s => s.title === songTitle)
  const key = getCurrentKey(songTitle)
  const bpm = song?.bpm ?? 0
  const timeSig = song?.timeSignature ?? '4/4'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: songTitle })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
    background: isDragging ? 'rgba(255,255,255,0.05)' : 'transparent',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <button
        {...attributes}
        {...listeners}
        style={{
          touchAction: 'none',
          cursor: 'grab',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary, #888)',
          fontSize: 20,
          padding: '4px 8px',
          lineHeight: 1,
        }}
        aria-label="Drag to reorder"
      >
        &#9776;
      </button>

      <div
        style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        onClick={() => onSelect(index)}
      >
        <div style={{ color: 'var(--text, #fff)', fontWeight: 500 }}>
          {index + 1}. {songTitle}
        </div>
        <div style={{ color: 'var(--text-secondary, #888)', fontSize: 13, marginTop: 2 }}>
          Key: {key || '?'} | {bpm} BPM | {timeSig}
        </div>
      </div>

      <button
        onClick={() => removeSongFromSetlist(setlistId, songTitle)}
        style={{
          background: 'none',
          border: '1px solid #c33',
          color: '#c33',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Remove
      </button>
    </div>
  )
}
