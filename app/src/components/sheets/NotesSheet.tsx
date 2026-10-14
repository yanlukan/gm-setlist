import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { Sheet } from './Sheet'

/** The song's notes: kept off the Stage chart, one tap away. */
export function NotesSheet({ onClose }: { onClose: () => void }) {
  const { song } = useShownSong()
  const edits = useStore(s => s.edits)
  const notes = song ? (edits[song.title]?.notes ?? song.notes ?? '') : ''

  return (
    <Sheet label="Notes" onClose={onClose} className="notes-sheet">
      <div className="sheet-head">
        <h2 className="sheet-title">{song ? song.title : 'Notes'}</h2>
      </div>
      {notes ? <p className="notes-text">{notes}</p> : <p className="sheet-hint">No notes for this song.</p>}
    </Sheet>
  )
}
