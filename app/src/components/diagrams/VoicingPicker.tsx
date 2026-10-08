import { useEffect, useRef } from 'react'
import { Modal } from '../shared/Modal'
import { voicingsFor } from '../../music/voicings'
import { ChordDiagram } from './ChordDiagram'
import { strum } from '../../music/sound'

interface VoicingPickerProps {
  chord: string
  /** The capo on for this song, so a shape is heard at the pitch it sounds. */
  capo?: number
  selectedIndex: number
  /** The recommended shape for this song. */
  recommendedIndex?: number
  onSelect: (index: number) => void
  /** Present when a shape was picked by hand: go back to the recommended one. */
  onUseRecommended?: () => void
  onClose: () => void
}

export function VoicingPicker({ chord, capo = 0, selectedIndex, recommendedIndex, onSelect, onUseRecommended, onClose }: VoicingPickerProps) {
  const voicings = voicingsFor(chord)
  const selectedRef = useRef<HTMLDivElement>(null)

  // The chosen shape can be far down the list: start there, not at the top
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

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

        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>
          The recommended shape suits this song's sound and sits with its other chords. A shape you tap is used for {chord} in every song.
        </p>
        {onUseRecommended && (
          <button
            onClick={onUseRecommended}
            style={{
              display: 'block', width: '100%', marginBottom: 12, padding: '10px 12px', borderRadius: 8,
              border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Use the recommended shape
          </button>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          {voicings.map((voicing, i) => voicing.wrong ? null : (
            <div
              key={i}
              ref={i === selectedIndex ? selectedRef : undefined}
              role="button"
              aria-label={`${chord} at ${voicing.l}${i === recommendedIndex ? ', recommended' : ''}${i === selectedIndex ? ', selected' : ''}`}
              onClick={() => onSelect(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                border: i === selectedIndex ? '2px solid #3b82f6' : '2px solid transparent',
                background: i === selectedIndex ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
              }}
            >
              <ChordDiagram voicing={voicing} size={112} />
              <span style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                {voicing.l}
              </span>
              <button
                type="button"
                className="diagram-play"
                aria-label={`Play ${chord} at ${voicing.l}`}
                onClick={e => {
                  e.stopPropagation()
                  strum(voicing, capo)
                }}
              >
                &#9654;
              </button>
              {i === recommendedIndex && (
                <span style={{ fontSize: 9, color: '#4ade80', marginTop: 2, fontWeight: 700 }}>
                  Recommended
                </span>
              )}
              {i === selectedIndex && (
                <span style={{ fontSize: 9, color: '#3b82f6', marginTop: 2, fontWeight: 600 }}>
                  Selected
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
