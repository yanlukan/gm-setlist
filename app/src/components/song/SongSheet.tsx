import { useState, useMemo, useEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { SectionRow } from './SectionRow'
import { ChordPicker } from '../edit/ChordPicker'
import { SectionPicker } from '../edit/SectionPicker'

export function SongSheet() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const editMode = useStore(s => s.editMode)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)

  const [pickerTarget, setPickerTarget] = useState<HTMLDivElement | null>(null)
  const [showSectionPicker, setShowSectionPicker] = useState(false)
  const [fontSize, setFontSize] = useState(32)
  const chordRef = useRef<HTMLDivElement>(null)

  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const setlistSongs = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return allSongs
    const mapped = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return mapped.length > 0 ? mapped : allSongs
  }, [allSongs, setlistData])

  const song = setlistSongs[currentIndex]

  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const notes = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.notes !== undefined) return edits[song.title].notes!
    return song.notes ?? ''
  }, [song, edits])

  const currentKey = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.key !== undefined) return edits[song.title].key!
    return song.key ?? ''
  }, [song, edits])

  // Auto-scale font to fit container
  useEffect(() => {
    const el = chordRef.current
    if (!el) return

    // In edit mode, don't shrink — just use a readable size
    if (editMode) {
      setFontSize(22)
      return
    }

    // Reset to max size then shrink until fits
    let size = 32
    el.style.fontSize = size + 'px'

    // Use rAF to measure after browser layout
    requestAnimationFrame(() => {
      while (el.scrollHeight > el.clientHeight && size > 16) {
        size -= 2
        el.style.fontSize = size + 'px'
      }
      setFontSize(size)
    })
  }, [sections, editMode, song?.title])

  if (!song) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>
        No songs in setlist. Tap Setlist to add songs.
      </div>
    )
  }

  const handleSectionChange = (index: number, field: 'name' | 'chords', value: string) => {
    const updated = sections.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    )
    saveSections(song.title, updated)
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    saveSections(song.title, updated)
  }

  const handleDelete = (index: number) => {
    if (sections.length <= 1) return
    const updated = sections.filter((_, i) => i !== index)
    saveSections(song.title, updated)
  }

  const handleAddSection = (name: string) => {
    const updated = [...sections, { name, chords: '' }]
    saveSections(song.title, updated)
    setShowSectionPicker(false)
  }

  const handleChordSelect = (chord: string) => {
    if (!pickerTarget) return
    const current = pickerTarget.textContent ?? ''
    const separator = current.length > 0 ? '  ' : ''
    pickerTarget.textContent = current + separator + chord
    pickerTarget.dispatchEvent(new Event('blur', { bubbles: true }))
  }

  const handleNotesBlur = (text: string) => {
    saveNotes(song.title, text)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: 700,
      margin: '0 auto',
      padding: '0 12px',
      overflow: editMode ? 'auto' : 'hidden',
      height: '100%',
    }}>
      {/* Title */}
      <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0 4px', flexShrink: 0 }}>
        {song.title}
      </h1>

      {/* Sections */}
      <div
        ref={chordRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          minHeight: 0,
          overflow: editMode ? 'visible' : 'hidden',
        }}
      >
        {sections.map((section, i) => (
          <SectionRow
            key={`${song.title}-${i}`}
            name={section.name}
            chords={section.chords}
            fontSize={fontSize}
            editMode={editMode}
            index={i}
            total={sections.length}
            onChordsChange={value => handleSectionChange(i, 'chords', value)}
            onLabelChange={value => handleSectionChange(i, 'name', value)}
            onChordsFocus={el => setPickerTarget(el)}
            onMoveUp={() => handleMove(i, -1)}
            onMoveDown={() => handleMove(i, 1)}
            onDelete={() => handleDelete(i)}
          />
        ))}
        {editMode && (
          <button
            onClick={() => setShowSectionPicker(true)}
            style={{
              marginTop: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: '2px dashed var(--edit-border)',
              color: 'var(--edit-border)',
              flexShrink: 0,
            }}
          >
            + Add Section
          </button>
        )}
      </div>

      {/* Notes */}
      {(notes || editMode) && (
        editMode ? (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => handleNotesBlur(e.currentTarget.textContent ?? '')}
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              outline: 'none',
              background: 'var(--badge-bg)',
              borderRadius: 6,
              padding: 8,
              minHeight: 40,
              marginTop: 8,
              flexShrink: 0,
            }}
          >
            {notes}
          </div>
        ) : notes ? (
          <div style={{
            fontSize: 14,
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--badge-bg)',
            paddingTop: 6,
            marginTop: 6,
            flexShrink: 0,
          }}>
            {notes}
          </div>
        ) : null
      )}

      {/* Pickers */}
      {editMode && pickerTarget && (
        <ChordPicker
          currentKey={currentKey}
          onSelect={handleChordSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}
      {editMode && showSectionPicker && (
        <SectionPicker
          onSelect={handleAddSection}
          onClose={() => setShowSectionPicker(false)}
        />
      )}
    </div>
  )
}
