import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useSetSongs, useShownSong } from '../../hooks/use-shown-song'
import { setLength } from '../../music/setlist-text'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { Sheet } from './Sheet'
import { SetSongList } from './SetSongList'

/**
 * Every setlist on the left, the tapped list's songs on the right. In the list
 * being played a tap goes to that song. In any other list a tap plays the song
 * once, as an extra, and Next then goes back to the song the player left;
 * "Play this whole list" switches the set instead. Only Practice edits lists.
 */
export function SetlistsSheet({ onStage, onClose }: { onStage: boolean; onClose: () => void }) {
  const lists = useStore(s => s.setlistData.lists)
  const activeId = useStore(s => s.setlistData.activeId)
  const goToSong = useStore(s => s.goToSong)
  const playExtra = useStore(s => s.playExtra)
  const setActiveSetlist = useStore(s => s.setActiveSetlist)
  // The place inside the songs found on this device, like the bar's count
  const { setSongs: playing, extraFrom, place: currentIndex } = useShownSong()
  const [chosenId, setChosenId] = useState(activeId)
  const [editing, setEditing] = useState(false)
  // A list deleted while the sheet is open falls back to the one being played
  const chosen = lists[chosenId] ? chosenId : activeId
  const songs = useSetSongs(chosen)
  const isPlaying = chosen === activeId
  const left = playing[currentIndex]
  const length = setLength(songs)

  return (
    <>
      <Sheet label="Setlists" onClose={onClose} className="setlists-sheet">
        <div className="lists-col">
          {Object.values(lists).map(item => (
            <button
              key={item.id}
              className="lists-item"
              aria-pressed={item.id === chosen}
              onClick={() => setChosenId(item.id)}
            >
              <span className="lists-name">{item.name}</span>
              <span className="lists-count">{item.songTitles.length} songs</span>
              {item.id === activeId && <span className="lists-tag">PLAYING NOW</span>}
            </button>
          ))}
        </div>

        <div className="lists-songs">
          <div className="sheet-head">
            <h2 className="sheet-title">{lists[chosen]?.name}</h2>
            <span className="sheet-sub">{songs.length} songs{length ? ` · about ${length}` : ''}</span>
            {isPlaying && !onStage && (
              <button className="sheet-action" onClick={() => setEditing(true)}>Edit list</button>
            )}
            {!isPlaying && songs.length > 0 && (
              <button
                className="sheet-action is-primary"
                onClick={() => {
                  setActiveSetlist(chosen)
                  onClose()
                }}
              >
                Play this whole list
              </button>
            )}
          </div>

          {songs.length === 0 ? (
            <p className="sheet-hint">This list is empty.</p>
          ) : isPlaying ? (
            <SetSongList
              songs={songs}
              currentIndex={extraFrom ? null : currentIndex}
              leftIndex={extraFrom ? currentIndex : null}
              onPick={i => {
                goToSong(i)
                onClose()
              }}
            />
          ) : (
            <>
              <p className="sheet-hint">
                {left
                  ? `Tap a song to play it as an extra. Next then reads Back to the set and takes you to ${left.title}.`
                  : 'Tap a song to play it as an extra.'}
              </p>
              <SetSongList
                songs={songs}
                currentIndex={null}
                leftIndex={null}
                onPick={i => {
                  playExtra(songs[i].title, chosen)
                  onClose()
                }}
              />
            </>
          )}
        </div>
      </Sheet>
      {editing && <SetlistScreen onClose={() => setEditing(false)} />}
    </>
  )
}
