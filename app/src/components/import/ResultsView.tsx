import { useState } from 'react'
import type { Section } from '../../types'

export interface AnalysisResult {
  title: string
  artist: string
  key: string
  bpm: number
  timeSignature: string
  sections: Section[]
  confidence: number
  source: string
  canRefine: boolean
  jobId?: string
}

interface Props {
  result: AnalysisResult
  onSave: (result: AnalysisResult) => void
  onRefine?: () => void
  refining?: boolean
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return '#22c55e'
  if (confidence >= 60) return '#eab308'
  return '#ef4444'
}

export function ResultsView({ result, onSave, onRefine, refining }: Props) {
  const [title, setTitle] = useState(result.title)
  const [artist, setArtist] = useState(result.artist)
  const [capo, setCapo] = useState(0)

  const handleSave = () => {
    onSave({ ...result, title, artist })
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 12px',
          color: 'var(--text)',
          width: '100%',
        }}
      />
      <input
        value={artist}
        onChange={e => setArtist(e.target.value)}
        style={{
          fontSize: 14,
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '6px 12px',
          color: 'var(--text-muted)',
          width: '100%',
        }}
      />

      {/* Confidence banner */}
      <div style={{
        background: confidenceColor(result.confidence) + '20',
        border: `1px solid ${confidenceColor(result.confidence)}`,
        borderRadius: 6,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: confidenceColor(result.confidence), fontWeight: 600 }}>
          {result.confidence}% confidence ({result.source})
        </span>
        {result.canRefine && onRefine && (
          <button
            onClick={onRefine}
            disabled={refining}
            style={{
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              cursor: refining ? 'not-allowed' : 'pointer',
              opacity: refining ? 0.6 : 1,
            }}
          >
            {refining ? 'Refining...' : 'Refine'}
          </button>
        )}
      </div>

      {/* Meta badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Key', value: result.key },
          { label: 'BPM', value: String(result.bpm) },
          { label: 'Time', value: result.timeSignature },
        ].map(badge => (
          <span key={badge.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 13,
            color: 'var(--text)',
          }}>
            {badge.label}: {badge.value}
          </span>
        ))}
      </div>

      {/* Capo dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Capo:</label>
        <select
          value={capo}
          onChange={e => setCapo(Number(e.target.value))}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            color: 'var(--text)',
          }}
        >
          {Array.from({ length: 13 }, (_, i) => (
            <option key={i} value={i}>{i === 0 ? 'None' : `Fret ${i}`}</option>
          ))}
        </select>
      </div>

      {/* Sections preview */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          Sections ({result.sections.length})
        </div>
        {result.sections.map((section, i) => (
          <div key={i} style={{
            padding: '6px 10px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
              {section.name}
            </div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}>
              {section.chords}
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          background: '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 0',
          fontWeight: 700,
          fontSize: 16,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Save to Library
      </button>
    </div>
  )
}
