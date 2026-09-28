import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useStore } from '../../store/use-store'
import { SetlistSongItem } from './SetlistSongItem'
import { formatSetlist } from '../../music/setlist-text'
import { shareText } from '../../utils/share'
import { AddSongPicker } from './AddSongPicker'
import type { Song } from '../../types'

interface SetlistScreenProps {
  onClose: () => void
}

export function SetlistScreen({ onClose }: SetlistScreenProps) {
  const setlistData = useStore(s => s.setlistData)
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const currentIndex = useStore(s => s.currentIndex)
  const setActiveSetlist = useStore(s => s.setActiveSetlist)
  const createSetlist = useStore(s => s.createSetlist)
  const deleteSetlist = useStore(s => s.deleteSetlist)
  const renameSetlist = useStore(s => s.renameSetlist)
  const reorderSetlistSongs = useStore(s => s.reorderSetlistSongs)
  const goToSong = useStore(s => s.goToSong)
  const duplicateSetlist = useStore(s => s.duplicateSetlist)
  const edits = useStore(s => s.edits)
  const showToast = useStore(s => s.showToast)

  const [showPicker, setShowPicker] = useState(false)

  const activeId = setlistData.activeId
  const activeList = setlistData.lists[activeId]
  const songTitles = activeList?.songTitles ?? []

  // The chart indexes only titles that resolve to a song, so map through that.
  const resolved = useMemo(() => {
    const all = [...songs, ...customSongs]
    return songTitles
      .map(title => all.find(s => s.title === title))
      .filter((s): s is Song => s !== undefined)
  }, [songs, customSongs, songTitles])
  const currentTitle = resolved[currentIndex]?.title

  // Open on the song you're on, not always at the top of the list.
  useEffect(() => {
    document.querySelector('.sl-row.is-current')?.scrollIntoView?.({ block: 'center' })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songTitles.indexOf(active.id as string)
    const newIndex = songTitles.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    reorderSetlistSongs(activeId, arrayMove(songTitles, oldIndex, newIndex))
  }

  function handleSelectSong(index: number) {
    // Rows are positions in the saved title list, but the chart indexes the
    // list of songs that actually resolve. If any title fails to resolve,
    // the two differ and a raw index opens the wrong song — so go by title.
    const title = songTitles[index]
    const position = resolved.findIndex(s => s.title === title)
    if (position >= 0) goToSong(position)
    onClose()
  }

  function handleNewSetlist() {
    const name = window.prompt('New setlist name:')
    if (name?.trim()) createSetlist(name.trim())
  }

  function handleRename() {
    if (!activeList) return
    const name = window.prompt('Rename setlist:', activeList.name)
    if (name?.trim()) renameSetlist(activeId, name.trim())
  }

  async function handleShare() {
    if (!activeList) return
    const outcome = await shareText(activeList.name, formatSetlist(activeList.name, resolved, edits))
    if (outcome === 'copied') showToast('Setlist copied — paste it anywhere')
    if (outcome === 'failed') showToast('Could not share the setlist')
  }

  function handleDelete() {
    if (activeId === 'default') return
    if (!window.confirm(`Delete "${activeList?.name}"? A restore point is saved first.`)) return
    deleteSetlist(activeId)
  }

  return (
    <div className="sl-screen">
      <div className="sl-header">
        <h2 className="sl-title">Setlists</h2>
        <button className="songgrid-close" onClick={onClose}>Done</button>
      </div>

      <div className="sl-tabs">
        {Object.keys(setlistData.lists).map(id => (
          <button
            key={id}
            className={id === activeId ? 'sl-tab is-active' : 'sl-tab'}
            onClick={() => setActiveSetlist(id)}
          >
            {setlistData.lists[id].name}
          </button>
        ))}
        <button className="sl-tab sl-tab-new" onClick={handleNewSetlist}>+ New</button>
      </div>

      <div className="sl-actions">
        <span className="sl-hint">
          {songTitles.length} songs &middot; hold &#9776; and drag to reorder
        </span>
        <button className="tb-btn" onClick={handleShare} disabled={resolved.length === 0}>Share</button>
        <button className="tb-btn" onClick={() => duplicateSetlist(activeId)}>Duplicate</button>
        <button className="tb-btn" onClick={handleRename}>Rename</button>
        {activeId !== 'default' && (
          <button className="tb-btn sl-danger" onClick={handleDelete}>Delete</button>
        )}
      </div>

      <div className="sl-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={songTitles} strategy={verticalListSortingStrategy}>
            {songTitles.map((title, i) => (
              <SetlistSongItem
                key={title}
                songTitle={title}
                index={i}
                setlistId={activeId}
                isCurrent={title === currentTitle}
                onSelect={handleSelectSong}
              />
            ))}
          </SortableContext>
        </DndContext>

        {songTitles.length === 0 && <div className="sl-empty">No songs in this setlist yet.</div>}

        <button className="sl-add" onClick={() => setShowPicker(true)}>+ Add Song</button>
      </div>

      {showPicker && (
        <AddSongPicker
          setlistId={activeId}
          currentTitles={songTitles}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
