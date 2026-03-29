import { useState, type CSSProperties } from 'react'
import { getDiatonicChords, getDiatonic7ths, getAllChordNames, shouldUseFlats } from '../../music/theory'

interface ChordPickerProps {
  currentKey: string
  onSelect: (chord: string) => void
  onClose: () => void
}

export function ChordPicker({ currentKey, onSelect, onClose }: ChordPickerProps) {
  const [showAll, setShowAll] = useState(false)

  const useFlats = shouldUseFlats(currentKey, 0)
  const diatonicTriads = getDiatonicChords(currentKey)
  const diatonic7ths = getDiatonic7ths(currentKey)
  const allChords = getAllChordNames(useFlats)

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '45vh',
    overflowY: 'auto',
    zIndex: 100,
    background: 'var(--picker-bg)',
    borderTop: '2px solid var(--edit-border)',
    padding: 12,
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  }

  const sectionLabelStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginTop: 10,
    marginBottom: 6,
  }

  const chipGridStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  }

  const chipStyle: CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    background: 'var(--badge-bg)',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
  }

  const diatonicChipStyle: CSSProperties = {
    ...chipStyle,
    border: '2px solid #3b82f6',
  }

  const showAllBtnStyle: CSSProperties = {
    marginTop: 10,
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    border: '1px dashed var(--text-muted)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  }

  const doneBtnStyle: CSSProperties = {
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--edit-border)',
    color: '#000',
    border: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>In Key ({currentKey})</span>
        <button style={doneBtnStyle} onClick={onClose}>Done</button>
      </div>

      <div style={sectionLabelStyle}>Triads</div>
      <div style={chipGridStyle}>
        {diatonicTriads.map(chord => (
          <button key={chord} style={diatonicChipStyle} onClick={() => onSelect(chord)}>
            {chord}
          </button>
        ))}
      </div>

      <div style={sectionLabelStyle}>7ths</div>
      <div style={chipGridStyle}>
        {diatonic7ths.map(chord => (
          <button key={chord} style={diatonicChipStyle} onClick={() => onSelect(chord)}>
            {chord}
          </button>
        ))}
      </div>

      {!showAll && (
        <button style={showAllBtnStyle} onClick={() => setShowAll(true)}>
          Show all chords...
        </button>
      )}

      {showAll && (
        <>
          <div style={sectionLabelStyle}>All Chords</div>
          <div style={chipGridStyle}>
            {allChords.map(chord => (
              <button key={chord} style={chipStyle} onClick={() => onSelect(chord)}>
                {chord}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
