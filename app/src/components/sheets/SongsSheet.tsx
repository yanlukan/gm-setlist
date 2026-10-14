import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { setLength } from '../../music/setlist-text'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { Sheet } from './Sheet'
import { SetSongList } from './SetSongList'

/** Every song in the playing list. Stage only moves around it; Practice can also edit the list. */
export function SongsSheet({ onStage, onClose }: { onStage: boolean; onClose: () => void }) {
  const { setSongs, extraFrom } = useShownSong()
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const listName = useStore(s => s.setlistData.lists[s.setlistData.activeId]?.name ?? 'Setlist')
  const [editing, setEditing] = useState(false)
  const length = setLength(setSongs)

  return (
    <>
      <Sheet label="All songs" onClose={onClose} className="songs-sheet">
        <div className="sheet-head">
          <h2 className="sheet-title">{listName}</h2>
          <span className="sheet-sub">{setSongs.length} songs{length ? ` · about ${length}` : ''}</span>
          {!onStage && <button className="sheet-action" onClick={() => setEditing(true)}>Edit list</button>}
        </div>
        {onStage && <p className="sheet-hint">Tap a song to go there.</p>}
        <SetSongList
          songs={setSongs}
          currentIndex={extraFrom ? null : currentIndex}
          leftIndex={extraFrom ? currentIndex : null}
          onPick={i => {
            goToSong(i)
            onClose()
          }}
        />
      </Sheet>
      {editing && <SetlistScreen onClose={() => setEditing(false)} />}
    </>
  )
}
