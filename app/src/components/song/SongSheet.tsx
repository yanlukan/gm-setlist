import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { sectionColor, shouldUseFlats, transposeText } from '../../music/theory'
import { lookupChord } from '../../data/chords-db'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import { EditableText } from '../shared/EditableText'

export function SongSheet() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const editMode = useStore(s => s.editMode)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const selectVoicing = useStore(s => s.selectVoicing)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)

  const [pickerChord, setPickerChord] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [customSectionName, setCustomSectionName] = useState('')

  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const setlistSongs = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return allSongs
    const mapped = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return mapped
  }, [allSongs, setlistData])

  const song = setlistSongs[currentIndex]

  // Stored chords are always at the song's own pitch.
  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const semitones = song ? (edits[song.title]?.transpose ?? 0) : 0
  const sourceKey = song ? (edits[song.title]?.key ?? song.key ?? '') : ''

  // What actually goes on the screen. Editing writes back through this, so the
  // guitarist edits what they see and the stored chart stays at source pitch.
  const displaySections = useMemo(() => {
    if (!semitones) return sections
    const useFlats = shouldUseFlats(sourceKey, semitones)
    return sections.map(sec => ({ name: sec.name, chords: transposeText(sec.chords, semitones, useFlats) }))
  }, [sections, semitones, sourceKey])

  const toSourcePitch = (text: string) =>
    semitones ? transposeText(text, -semitones, shouldUseFlats(sourceKey, 0)) : text

  const notes = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.notes !== undefined) return edits[song.title].notes!
    return song.notes ?? ''
  }, [song, edits])

  if (!song) {
    // An empty setlist is a normal state, not an error — but don't leave the
    // player staring at a blank screen with nothing to tap.
    const listName = setlistData.lists[setlistData.activeId]?.name ?? 'this setlist'
    return (
      <div style={{
        padding: 24, color: 'var(--text-muted)', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        margin: '0 auto', maxWidth: 420,
      }}>
        <div style={{ fontSize: 16 }}>&ldquo;{listName}&rdquo; is empty.</div>
        <div style={{ fontSize: 14 }}>
          Your other setlists are safe — open <strong>Setlist</strong> above to switch.
        </div>
        <button
          onClick={() => {
            if (confirm(`Fill "${listName}" with the GM Tribute running order?`)) restoreGigOrder()
          }}
          style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: '#4a9eff', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Load GM Tribute running order
        </button>
      </div>
    )
  }

  const fontSize = displaySections.length > 10 ? 18 : displaySections.length > 6 ? 22 : 26

  // Section editing
  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    saveSections(song.title, updated)
  }

  const deleteSection = (index: number) => {
    if (sections.length <= 1) return
    saveSections(song.title, sections.filter((_, i) => i !== index))
  }

  const addSection = (name: string) => {
    saveSections(song.title, [...sections, { name, chords: '' }])
    setShowAddSection(false)
    setCustomSectionName('')
  }

  const updateChords = (index: number, chords: string) => {
    const atSource = toSourcePitch(chords)
    saveSections(song.title, sections.map((s, i) => i === index ? { ...s, chords: atSource } : s))
  }

  const updateName = (index: number, name: string) => {
    saveSections(song.title, sections.map((s, i) => i === index ? { ...s, name } : s))
  }

  // Tappable chords
  const renderChords = (text: string, size: number) => {
    if (editMode) return <span style={{ fontSize: size, fontWeight: 'bold' }}>{text}</span>
    return (
      <span>
        {text.split(/(\s+)/).map((token, i) => {
          if (!token.trim()) return <span key={i}>{token}</span>
          const has = lookupChord(token)
          return (
            <span key={i}
              onClick={has ? (e) => { e.stopPropagation(); setPickerChord(token) } : undefined}
              style={{
                cursor: has ? 'pointer' : 'default',
                textDecoration: has ? 'underline' : 'none',
                textDecorationColor: 'var(--badge-bg)',
                textUnderlineOffset: 3,
                fontSize: size, fontWeight: 'bold',
              }}
            >{token}</span>
          )
        })}
      </span>
    )
  }

  const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Instrumental', 'Outro']

  const smallBtn: React.CSSProperties = {
    padding: '2px 6px', fontSize: 12, background: 'transparent',
    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%',
      maxWidth: 700, margin: '0 auto', padding: '0 12px',
      overflow: 'auto', height: '100%', WebkitOverflowScrolling: 'touch',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0 4px', flexShrink: 0 }}>
        {song.title}
      </h1>

      {song.cue && (
        <div style={{
          flexShrink: 0, marginBottom: 6, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(245, 158, 11, 0.16)', borderLeft: '4px solid #f59e0b',
          fontSize: 14, fontWeight: 600, color: 'var(--text)',
        }}>
          {song.cue}
        </div>
      )}

      {song.lowerKey && semitones === 0 && (
        <div style={{
          flexShrink: 0, marginBottom: 6, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(229, 62, 62, 0.18)', borderLeft: '4px solid #e53e3e',
          fontSize: 14, fontWeight: 700, color: 'var(--text)',
        }}>
          LOWER KEY — showing original {sourceKey}. Set the transpose with &minus; / + above.
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: editMode ? 2 : 4 }}>
        {displaySections.map((section, i) => (
          <div key={`${song.title}-${i}`} style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            ...(editMode && { padding: '4px 0', borderBottom: '1px solid var(--badge-bg)' }),
          }}>
            {/* Edit controls */}
            {editMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                {i > 0 && <button onClick={() => moveSection(i, -1)} style={smallBtn}>{'\u25B2'}</button>}
                {i < sections.length - 1 && <button onClick={() => moveSection(i, 1)} style={smallBtn}>{'\u25BC'}</button>}
                {sections.length > 1 && <button onClick={() => deleteSection(i)} style={{ ...smallBtn, color: '#ef4444' }}>&times;</button>}
              </div>
            )}

            {/* Label */}
            {editMode ? (
              <EditableText
                value={section.name}
                onChange={name => updateName(i, name)}
                style={{
                  minWidth: 72, maxWidth: 90, fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', color: sectionColor(section.name),
                  borderBottom: '1px dashed var(--edit-border, #f59e0b)',
                  outline: 'none', flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                minWidth: 72, maxWidth: 90, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', color: sectionColor(section.name), flexShrink: 0,
              }}>{section.name}</div>
            )}

            {/* Chords */}
            {editMode ? (
              <EditableText
                value={section.chords}
                onChange={chords => updateChords(i, chords)}
                style={{
                  fontSize: 18, fontWeight: 'bold', letterSpacing: 1, wordSpacing: 10,
                  background: 'var(--badge-bg)', borderRadius: 4, padding: '2px 6px',
                  outline: 'none', whiteSpace: 'pre-wrap', minWidth: 60, flex: 1,
                }}
              />
            ) : (
              <div style={{ letterSpacing: 1, wordSpacing: 14, whiteSpace: 'pre-wrap' }}>
                {renderChords(section.chords, fontSize)}
              </div>
            )}
          </div>
        ))}

        {/* Add section */}
        {editMode && (
          showAddSection ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0' }}>
              {SECTION_TYPES.map(name => (
                <button key={name} onClick={() => addSection(name)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
                }}>{name}</button>
              ))}
              <div style={{ display: 'flex', gap: 4, width: '100%', marginTop: 4 }}>
                <input
                  value={customSectionName}
                  onChange={e => setCustomSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customSectionName.trim()) addSection(customSectionName.trim()) }}
                  placeholder="Custom name..."
                  style={{
                    flex: 1, padding: '6px 10px', fontSize: 14,
                    background: 'var(--badge-bg)', color: 'var(--text)',
                    border: '1px solid var(--badge-bg)', borderRadius: 6,
                  }}
                />
                <button onClick={() => setShowAddSection(false)} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: 13,
                  background: 'var(--badge-bg)', color: 'var(--text-muted)', border: 'none',
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSection(true)} style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'transparent', border: '2px dashed var(--edit-border, #f59e0b)',
              color: 'var(--edit-border, #f59e0b)',
            }}>+ Add Section</button>
          )
        )}
      </div>

      {/* Notes */}
      {editMode ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NOTES</div>
          <EditableText
            value={notes}
            onChange={text => saveNotes(song.title, text)}
            style={{
              fontSize: 14, padding: 8, borderRadius: 6, background: 'var(--badge-bg)',
              outline: 'none', minHeight: 40, fontStyle: 'italic', color: 'var(--text-muted)',
            }}
          />
        </div>
      ) : notes ? (
        <div style={{
          fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)',
          borderTop: '1px solid var(--badge-bg)', paddingTop: 6, marginTop: 6,
        }}>{notes}</div>
      ) : null}

      {/* Voicing picker */}
      {pickerChord && (
        <VoicingPicker chord={pickerChord} selectedIndex={selectedVoicings[pickerChord] ?? 0}
          onSelect={(i) => { selectVoicing(pickerChord, i); setPickerChord(null) }} onClose={() => setPickerChord(null)} />
      )}
    </div>
  )
}
