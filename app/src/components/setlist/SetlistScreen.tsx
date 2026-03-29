import { useState } from 'react'
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
import { AddSongPicker } from './AddSongPicker'

interface SetlistScreenProps {
  onClose: () => void
}

export function SetlistScreen({ onClose }: SetlistScreenProps) {
  const setlistData = useStore(s => s.setlistData)
  const setActiveSetlist = useStore(s => s.setActiveSetlist)
  const createSetlist = useStore(s => s.createSetlist)
  const deleteSetlist = useStore(s => s.deleteSetlist)
  const renameSetlist = useStore(s => s.renameSetlist)
  const reorderSetlistSongs = useStore(s => s.reorderSetlistSongs)
  const goToSong = useStore(s => s.goToSong)

  const [showPicker, setShowPicker] = useState(false)

  const activeList = setlistData.lists[setlistData.activeId]
  const songTitles = activeList?.songTitles ?? []

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

    const newOrder = arrayMove(songTitles, oldIndex, newIndex)
    reorderSetlistSongs(setlistData.activeId, newOrder)
  }

  function handleSelectSong(index: number) {
    goToSong(index)
    onClose()
  }

  function handleNewSetlist() {
    const name = window.prompt('New setlist name:')
    if (name?.trim()) {
      createSetlist(name.trim())
    }
  }

  function handleRename() {
    if (!activeList) return
    const name = window.prompt('Rename setlist:', activeList.name)
    if (name?.trim()) {
      renameSetlist(setlistData.activeId, name.trim())
    }
  }

  function handleDelete() {
    if (setlistData.activeId === 'default') return
    if (!window.confirm(`Delete "${activeList?.name}"?`)) return
    deleteSetlist(setlistData.activeId)
  }

  const listIds = Object.keys(setlistData.lists)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg, #111)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--text, #fff)', fontSize: 22 }}>Setlists</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent, #4af)',
            fontSize: 16,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Done
        </button>
      </div>

      {/* Tabs row */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 0,
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
          flexShrink: 0,
        }}
      >
        {listIds.map(id => {
          const list = setlistData.lists[id]
          const isActive = id === setlistData.activeId
          return (
            <button
              key={id}
              onClick={() => setActiveSetlist(id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent, #4af)' : '2px solid transparent',
                color: isActive ? 'var(--accent, #4af)' : 'var(--text-secondary, #888)',
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {list.name}
            </button>
          )
        })}
        <button
          onClick={handleNewSetlist}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent, #4af)',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          + New
        </button>
      </div>

      {/* Actions row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleRename}
          style={{
            background: 'none',
            border: '1px solid var(--border, rgba(255,255,255,0.2))',
            color: 'var(--text, #fff)',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Rename
        </button>
        {setlistData.activeId !== 'default' && (
          <button
            onClick={handleDelete}
            style={{
              background: 'none',
              border: '1px solid #c33',
              color: '#c33',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete Setlist
          </button>
        )}
      </div>

      {/* Song list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={songTitles} strategy={verticalListSortingStrategy}>
            {songTitles.map((title, i) => (
              <SetlistSongItem
                key={title}
                songTitle={title}
                index={i}
                setlistId={setlistData.activeId}
                onSelect={handleSelectSong}
              />
            ))}
          </SortableContext>
        </DndContext>

        {songTitles.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary, #888)',
              padding: '40px 20px',
              fontSize: 15,
            }}
          >
            No songs in this setlist yet.
          </div>
        )}

        {/* Add Song button */}
        <button
          onClick={() => setShowPicker(true)}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 20px',
            background: 'none',
            border: 'none',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
            color: 'var(--accent, #4af)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          + Add Song
        </button>
      </div>

      {/* Song picker overlay */}
      {showPicker && (
        <AddSongPicker
          setlistId={setlistData.activeId}
          currentTitles={songTitles}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
