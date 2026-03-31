/**
 * SongView — full-screen song viewer.
 * Search mode: transpose, lyrics, tappable chords, diagram bar
 * Setlist mode: + edit mode (reorder/add/delete sections, edit chords, notes)
 */
import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { sectionColor, transposeChord, shouldUseFlats } from '../../music/theory'
import { lookupChord } from '../../data/chords-db'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { VoicingPicker } from '../diagrams/VoicingPicker'

interface LyricsLine { c?: string; l?: string }
interface Section { name: string; chords: string }

const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Instrumental', 'Outro']

interface SongViewProps {
  title: string
  artist: string
  sections: Section[]
  lyrics?: LyricsLine[] | null
  notes?: string
  onClose: () => void
  // Search mode
  actionLabel?: string
  onAction?: () => void
  actionDone?: boolean
  // Setlist mode — editing
  editable?: boolean
  onSectionsChange?: (sections: Section[]) => void
  onNotesChange?: (notes: string) => void
}

export function SongView({
  title, artist, sections: initialSections, lyrics, notes: initialNotes,
  onClose, actionLabel, onAction, actionDone,
  editable, onSectionsChange, onNotesChange,
}: SongViewProps) {
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const selectVoicing = useStore(s => s.selectVoicing)
  const [showLyrics, setShowLyrics] = useState(false)
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [pickerChord, setPickerChord] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [customSectionName, setCustomSectionName] = useState('')

  const sections = initialSections
  const notes = initialNotes || ''
  const hasLyrics = lyrics && lyrics.length > 0

  // Transpose
  const transposeString = (chords: string): string => {
    if (transposeSemitones === 0) return chords
    const key = sections[0]?.chords.trim().split(/\s+/)[0] || 'C'
    const useFlats = shouldUseFlats(key, transposeSemitones)
    return chords.split(/(\s+)/).map(token =>
      token.trim() ? transposeChord(token, transposeSemitones, useFlats) : token
    ).join('')
  }

  const transposedSections = useMemo(() => {
    if (transposeSemitones === 0) return sections
    return sections.map(s => ({ ...s, chords: transposeString(s.chords) }))
  }, [sections, transposeSemitones])

  const transposedLyrics = useMemo(() => {
    if (!lyrics || transposeSemitones === 0) return lyrics
    return lyrics.map(line => line.c ? { c: transposeString(line.c) } : line)
  }, [lyrics, transposeSemitones])

  const uniqueChords = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const sec of transposedSections) {
      for (const c of sec.chords.split(/\s+/)) {
        const t = c.trim()
        if (t && !seen.has(t) && lookupChord(t)) {
          seen.add(t)
          result.push(t)
        }
      }
    }
    return result
  }, [transposedSections])

  // Section editing
  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    onSectionsChange?.(updated)
  }

  const deleteSection = (index: number) => {
    if (sections.length <= 1) return
    onSectionsChange?.(sections.filter((_, i) => i !== index))
  }

  const addSection = (name: string) => {
    onSectionsChange?.([...sections, { name, chords: '' }])
    setShowAddSection(false)
    setCustomSectionName('')
  }

  const updateSectionChords = (index: number, chords: string) => {
    const updated = sections.map((s, i) => i === index ? { ...s, chords } : s)
    onSectionsChange?.(updated)
  }

  const updateSectionName = (index: number, name: string) => {
    const updated = sections.map((s, i) => i === index ? { ...s, name } : s)
    onSectionsChange?.(updated)
  }

  // Tappable chord rendering
  const renderTappableChords = (text: string, fontSize: number, color?: string) => {
    const tokens = text.split(/(\s+)/)
    return (
      <span>
        {tokens.map((token, i) => {
          if (!token.trim()) return <span key={i}>{token}</span>
          const has = lookupChord(token)
          return (
            <span
              key={i}
              onClick={has ? (e) => { e.stopPropagation(); setPickerChord(token) } : undefined}
              style={{
                cursor: has ? 'pointer' : 'default',
                textDecoration: has ? 'underline' : 'none',
                textDecorationColor: 'var(--badge-bg)',
                textUnderlineOffset: 3,
                fontSize, fontWeight: 'bold',
                color: color || 'inherit',
              }}
            >
              {token}
            </span>
          )
        })}
      </span>
    )
  }

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '10px 12px', borderBottom: '1px solid var(--badge-bg)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ ...btnStyle, background: 'none', color: 'var(--accent)' }}>Back</button>

        {!editMode && (
          <>
            <button onClick={() => setTransposeSemitones(s => s - 1)} style={btnStyle}>-</button>
            <span style={{
              fontSize: 11, fontWeight: 600, minWidth: 22, textAlign: 'center',
              color: transposeSemitones === 0 ? 'var(--text-muted)' : 'var(--accent)',
            }}>
              {transposeSemitones === 0 ? 'Key' : (transposeSemitones > 0 ? '+' : '') + transposeSemitones}
            </span>
            <button onClick={() => setTransposeSemitones(s => s + 1)} style={btnStyle}>+</button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {hasLyrics && !editMode && (
          <button onClick={() => setShowLyrics(!showLyrics)} style={{
            ...btnStyle,
            background: showLyrics ? 'var(--accent)' : 'var(--badge-bg)',
            color: showLyrics ? '#fff' : 'var(--text)',
          }}>Lyrics</button>
        )}

        {editable && (
          <button onClick={() => setEditMode(!editMode)} style={{
            ...btnStyle,
            background: editMode ? 'var(--accent)' : 'var(--badge-bg)',
            color: editMode ? '#fff' : 'var(--text)',
          }}>{editMode ? 'Done' : 'Edit'}</button>
        )}

        {actionLabel && onAction && !editMode && (
          <button onClick={onAction} style={{
            ...btnStyle,
            background: actionDone ? 'var(--success, #4ade80)' : 'var(--accent)',
            color: '#fff',
          }}>{actionDone ? 'Added!' : actionLabel}</button>
        )}
      </div>

      {/* Song content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>{title}</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>{artist}</div>

        {showLyrics && hasLyrics && !editMode ? (
          <div>
            {(transposedLyrics ?? lyrics!).map((line, i) => {
              if (line.c) return (
                <div key={i} style={{ letterSpacing: 1, wordSpacing: 8, marginTop: 8 }}>
                  {renderTappableChords(line.c, 16, 'var(--accent)')}
                </div>
              )
              if (line.l) return <div key={i} style={{ fontSize: 15, lineHeight: 1.5 }}>{line.l}</div>
              return null
            })}
          </div>
        ) : (
          <>
            {transposedSections.map((section, i) => (
              <div key={i} style={{ marginBottom: editMode ? 8 : 12 }}>
                {editMode ? (
                  <EditableSection
                    section={section}
                    index={i}
                    total={sections.length}
                    onMove={dir => moveSection(i, dir)}
                    onDelete={() => deleteSection(i)}
                    onChordsChange={chords => updateSectionChords(i, chords)}
                    onNameChange={name => updateSectionName(i, name)}
                  />
                ) : (
                  <>
                    <div style={{
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      color: sectionColor(section.name), marginBottom: 2,
                    }}>{section.name}</div>
                    <div style={{ letterSpacing: 1, wordSpacing: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {renderTappableChords(section.chords, 20)}
                    </div>
                  </>
                )}
              </div>
            ))}

            {editMode && (
              <>
                {showAddSection ? (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0',
                    borderTop: '1px solid var(--badge-bg)', marginTop: 8,
                  }}>
                    {SECTION_TYPES.map(name => (
                      <button key={name} onClick={() => addSection(name)} style={{
                        ...btnStyle, fontSize: 13,
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
                      <button onClick={() => setShowAddSection(false)} style={{ ...btnStyle, color: 'var(--text-muted)' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddSection(true)} style={{
                    marginTop: 8, padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: 'transparent', border: '2px dashed var(--edit-border, #f59e0b)',
                    color: 'var(--edit-border, #f59e0b)',
                  }}>+ Add Section</button>
                )}
              </>
            )}
          </>
        )}

        {/* Notes */}
        {editMode ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NOTES</div>
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={e => {
                onNotesChange?.(e.currentTarget.textContent ?? '')
              }}
              style={{
                fontSize: 14, padding: 8, borderRadius: 6,
                background: 'var(--badge-bg)', outline: 'none', minHeight: 40,
                fontStyle: 'italic', color: 'var(--text-muted)',
              }}
            >{notes}</div>
          </div>
        ) : notes ? (
          <div style={{
            fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)',
            borderTop: '1px solid var(--badge-bg)', paddingTop: 6, marginTop: 12,
          }}>{notes}</div>
        ) : null}
      </div>

      {/* Diagram bar */}
      {!editMode && uniqueChords.length > 0 && (
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 8, padding: 8,
          borderTop: '1px solid var(--badge-bg)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', flexShrink: 0,
        }}>
          {uniqueChords.map(name => {
            const voicings = lookupChord(name)
            if (!voicings) return null
            return (
              <div key={name} onClick={() => setPickerChord(name)} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{name}</span>
                <ChordDiagram voicing={voicings[0]} size={70} />
              </div>
            )
          })}
        </div>
      )}

      {pickerChord && (
        <VoicingPicker chord={pickerChord} selectedIndex={selectedVoicings[pickerChord] ?? 0}
          onSelect={(i) => { selectVoicing(pickerChord, i); setPickerChord(null) }} onClose={() => setPickerChord(null)} />
      )}
    </div>
  )
}

// Editable section row
function EditableSection({ section, index, total, onMove, onDelete, onChordsChange, onNameChange }: {
  section: Section; index: number; total: number;
  onMove: (dir: -1 | 1) => void; onDelete: () => void;
  onChordsChange: (chords: string) => void; onNameChange: (name: string) => void;
}) {
  const smallBtn: React.CSSProperties = {
    padding: '2px 6px', fontSize: 12, background: 'transparent',
    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 6,
      padding: '6px 0', borderBottom: '1px solid var(--badge-bg)',
    }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, paddingTop: 2 }}>
        {index > 0 && <button onClick={() => onMove(-1)} style={smallBtn}>{'\u25B2'}</button>}
        {index < total - 1 && <button onClick={() => onMove(1)} style={smallBtn}>{'\u25BC'}</button>}
        {total > 1 && <button onClick={() => onDelete()} style={{ ...smallBtn, color: '#ef4444' }}>&times;</button>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onNameChange(e.currentTarget.textContent ?? section.name)}
          style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            color: sectionColor(section.name),
            borderBottom: '1px dashed var(--edit-border, #f59e0b)',
            outline: 'none', marginBottom: 4,
          }}
        >{section.name}</div>
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onChordsChange(e.currentTarget.textContent ?? section.chords)}
          style={{
            fontSize: 18, fontWeight: 'bold', letterSpacing: 1, wordSpacing: 10,
            background: 'var(--badge-bg)', borderRadius: 4, padding: '4px 6px',
            outline: 'none', whiteSpace: 'pre-wrap', minHeight: 28,
          }}
        >{section.chords}</div>
      </div>
    </div>
  )
}
