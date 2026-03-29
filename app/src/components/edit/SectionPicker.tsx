import { useState, type CSSProperties } from 'react'

interface SectionPickerProps {
  onSelect: (name: string) => void
  onClose: () => void
}

const PRESET_TYPES = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge',
  'Solo', 'Breakdown', 'Instrumental', 'Outro',
]

export function SectionPicker({ onSelect, onClose }: SectionPickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')

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
    marginBottom: 10,
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

  const customChipStyle: CSSProperties = {
    ...chipStyle,
    border: '2px dashed var(--text-muted)',
    background: 'transparent',
  }

  const closeBtnStyle: CSSProperties = {
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  }

  const inputStyle: CSSProperties = {
    marginTop: 8,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 15,
    border: '1px solid var(--edit-border)',
    background: 'var(--badge-bg)',
    color: 'inherit',
    width: 200,
  }

  const handleCustomSubmit = () => {
    const trimmed = customName.trim()
    if (trimmed) {
      onSelect(trimmed)
      setCustomName('')
      setShowCustom(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Add Section</span>
        <button style={closeBtnStyle} onClick={onClose}>&times;</button>
      </div>

      <div style={chipGridStyle}>
        {PRESET_TYPES.map(name => (
          <button key={name} style={chipStyle} onClick={() => onSelect(name)}>
            {name}
          </button>
        ))}
        <button style={customChipStyle} onClick={() => setShowCustom(true)}>
          Custom...
        </button>
      </div>

      {showCustom && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            style={inputStyle}
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="Section name"
            autoFocus
          />
          <button
            style={{ ...chipStyle, background: 'var(--edit-border)', color: '#000' }}
            onClick={handleCustomSubmit}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
