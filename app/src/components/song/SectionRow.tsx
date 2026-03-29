import { useRef, type CSSProperties } from 'react'
import { sectionColor } from '../../music/theory'

interface SectionRowProps {
  name: string
  chords: string
  fontSize: number
  editMode?: boolean
  index?: number
  total?: number
  onChordsChange?: (chords: string) => void
  onLabelChange?: (name: string) => void
  onChordsFocus?: (el: HTMLDivElement) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
}

export function SectionRow({
  name,
  chords,
  fontSize,
  editMode,
  index,
  total,
  onChordsChange,
  onLabelChange,
  onChordsFocus,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionRowProps) {
  const chordsRef = useRef<HTMLDivElement>(null)

  const labelStyle: CSSProperties = {
    minWidth: 72,
    maxWidth: 90,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: sectionColor(name),
    flexShrink: 0,
    ...(editMode && {
      borderBottom: '1px dashed var(--edit-border)',
      outline: 'none',
    }),
  }

  const chordsStyle: CSSProperties = {
    fontSize,
    fontWeight: 'bold',
    letterSpacing: 1,
    wordSpacing: 14,
    whiteSpace: 'pre-wrap',
    ...(editMode && {
      background: 'var(--badge-bg)',
      borderRadius: 6,
      padding: '2px 6px',
      outline: 'none',
      minWidth: 60,
    }),
  }

  const editBtnStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: 14,
    lineHeight: 1,
    color: 'var(--text-muted)',
  }

  const deleteBtnStyle: CSSProperties = {
    ...editBtnStyle,
    color: '#ef4444',
    fontWeight: 700,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {editMode && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
          <button
            style={editBtnStyle}
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            &#9650;
          </button>
          <button
            style={editBtnStyle}
            onClick={onMoveDown}
            disabled={index !== undefined && total !== undefined && index >= total - 1}
            title="Move down"
          >
            &#9660;
          </button>
          <button style={deleteBtnStyle} onClick={onDelete} title="Delete section">
            &times;
          </button>
        </div>
      )}

      {editMode ? (
        <div
          style={labelStyle}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onLabelChange?.(e.currentTarget.textContent ?? '')}
        >
          {name}
        </div>
      ) : (
        <span style={labelStyle}>{name}</span>
      )}

      {editMode ? (
        <div
          ref={chordsRef}
          style={chordsStyle}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onChordsChange?.(e.currentTarget.textContent ?? '')}
          onFocus={() => {
            if (chordsRef.current) onChordsFocus?.(chordsRef.current)
          }}
        >
          {chords}
        </div>
      ) : (
        <span style={chordsStyle}>{chords}</span>
      )}
    </div>
  )
}
