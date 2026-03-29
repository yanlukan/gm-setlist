import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { CHORD_DB } from '../../data/chords-db'
import { ChordDiagram } from './ChordDiagram'

interface VoicingPickerProps {
  chord: string
  onClose: () => void
}

export function VoicingPicker({ chord, onClose }: VoicingPickerProps) {
  const voicings = CHORD_DB[chord] ?? []
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <Modal open onClose={onClose}>
      <div
        style={{
          background: 'var(--bg, #1a1a1a)',
          borderRadius: 12,
          padding: 20,
          maxWidth: 420,
          width: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{chord}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 22,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          {voicings.map((voicing, i) => (
            <div
              key={i}
              onClick={() => setSelectedIndex(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                border: i === selectedIndex ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              <ChordDiagram voicing={voicing} size={110} />
              <span style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                {voicing.l}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
