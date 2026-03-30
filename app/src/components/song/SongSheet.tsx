import { useState, useMemo, type CSSProperties } from 'react'
import { useStore } from '../../store/use-store'
import { useAutoScale } from '../../hooks/use-auto-scale'
import { SectionRow } from './SectionRow'
import { ChordPicker } from '../edit/ChordPicker'
import { SectionPicker } from '../edit/SectionPicker'

export function SongSheet() {
  // Select primitives / stable references from store
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

  // Derive computed values in the component
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

  const [chordRef, fontSize] = useAutoScale(
    [sections, currentKey],
  )

  if (!song) return null

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

  const titleStyle: CSSProperties = {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 0,
  }

  const chordAreaStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: editMode ? 'flex-start' : 'center',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
    marginTop: 12,
  }

  const notesStyle: CSSProperties = {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border)',
    paddingTop: 8,
    marginTop: 12,
    ...(editMode && {
      outline: 'none',
      background: 'var(--badge-bg)',
      borderRadius: 6,
      padding: 8,
      minHeight: 40,
    }),
  }

  const addSectionBtnStyle: CSSProperties = {
    marginTop: 8,
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    background: 'transparent',
    border: '2px dashed var(--edit-border)',
    color: 'var(--edit-border)',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 12px' }}>
      <h1 style={titleStyle}>{song.title}</h1>

      <div ref={chordRef} style={chordAreaStyle}>
        {sections.map((section, i) => (
          <SectionRow
            key={`${section.name}-${i}`}
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
          <button style={addSectionBtnStyle} onClick={() => setShowSectionPicker(true)}>
            + Add Section
          </button>
        )}
      </div>

      {(notes || editMode) ? (
        editMode ? (
          <div
            style={notesStyle}
            contentEditable
            suppressContentEditableWarning
            onBlur={e => handleNotesBlur(e.currentTarget.textContent ?? '')}
          >
            {notes}
          </div>
        ) : (
          notes ? <div style={notesStyle}>{notes}</div> : null
        )
      ) : null}

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
