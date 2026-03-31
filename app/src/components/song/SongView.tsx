/**
 * SongView — full-screen song viewer with transpose, lyrics toggle,
 * tappable chords, and chord diagram bar. Used from both Search and Setlist.
 */
import { useState, useMemo } from 'react'
import { sectionColor, transposeChord, shouldUseFlats } from '../../music/theory'
import { lookupChord } from '../../data/chords-db'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { VoicingPicker } from '../diagrams/VoicingPicker'

interface LyricsLine {
  c?: string
  l?: string
}

interface SongViewProps {
  title: string
  artist: string
  sections: { name: string; chords: string }[]
  lyrics?: LyricsLine[] | null
  onClose: () => void
  /** Optional right-side header button */
  actionLabel?: string
  onAction?: () => void
  actionDone?: boolean
}

export function SongView({
  title, artist, sections, lyrics,
  onClose, actionLabel, onAction, actionDone,
}: SongViewProps) {
  const [showLyrics, setShowLyrics] = useState(false)
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [pickerChord, setPickerChord] = useState<string | null>(null)

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
    return lyrics.map(line =>
      line.c ? { c: transposeString(line.c) } : line
    )
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

  const btnStyle = {
    padding: '4px 10px', borderRadius: 6, fontSize: 15, fontWeight: 600,
    background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 12px', borderBottom: '1px solid var(--badge-bg)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button onClick={onClose} style={{ ...btnStyle, background: 'none', color: 'var(--accent)' }}>
          Back
        </button>
        <button onClick={() => setTransposeSemitones(s => s - 1)} style={btnStyle}>-</button>
        <span style={{
          fontSize: 12, fontWeight: 600, minWidth: 24, textAlign: 'center',
          color: transposeSemitones === 0 ? 'var(--text-muted)' : 'var(--accent)',
        }}>
          {transposeSemitones === 0 ? 'Key' : (transposeSemitones > 0 ? '+' : '') + transposeSemitones}
        </span>
        <button onClick={() => setTransposeSemitones(s => s + 1)} style={btnStyle}>+</button>
        <div style={{ flex: 1 }} />
        {hasLyrics && (
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            style={{
              ...btnStyle,
              background: showLyrics ? 'var(--accent)' : 'var(--badge-bg)',
              color: showLyrics ? '#fff' : 'var(--text)',
            }}
          >
            Lyrics
          </button>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              ...btnStyle,
              background: actionDone ? 'var(--success, #4ade80)' : 'var(--accent)',
              color: '#fff',
            }}
          >
            {actionDone ? 'Added!' : actionLabel}
          </button>
        )}
      </div>

      {/* Song content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>{title}</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{artist}</div>

        {showLyrics && hasLyrics ? (
          <div>
            {(transposedLyrics ?? lyrics!).map((line, i) => {
              if (line.c) {
                return (
                  <div key={i} style={{ letterSpacing: 1, wordSpacing: 8, marginTop: 8 }}>
                    {renderTappableChords(line.c, 16, 'var(--accent)')}
                  </div>
                )
              }
              if (line.l) {
                return <div key={i} style={{ fontSize: 15, lineHeight: 1.5 }}>{line.l}</div>
              }
              return null
            })}
          </div>
        ) : (
          transposedSections.map((section, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                color: sectionColor(section.name), marginBottom: 2,
              }}>
                {section.name}
              </div>
              <div style={{ letterSpacing: 1, wordSpacing: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {renderTappableChords(section.chords, 20)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Diagram bar */}
      {uniqueChords.length > 0 && (
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 8, padding: 8,
          borderTop: '1px solid var(--badge-bg)',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', flexShrink: 0,
        }}>
          {uniqueChords.map(name => {
            const voicings = lookupChord(name)
            if (!voicings) return null
            return (
              <div
                key={name}
                onClick={() => setPickerChord(name)}
                style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{name}</span>
                <ChordDiagram voicing={voicings[0]} size={70} />
              </div>
            )
          })}
        </div>
      )}

      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          selectedIndex={0}
          onSelect={() => setPickerChord(null)}
          onClose={() => setPickerChord(null)}
        />
      )}
    </div>
  )
}
