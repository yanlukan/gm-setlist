import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { sectionColor, transposeChord, shouldUseFlats } from '../../music/theory'
import { lookupChord } from '../../data/chords-db'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import type { Song } from '../../types'

async function findServer(): Promise<string | null> {
  const urls = [
    'http://localhost:3000',
    `http://${window.location.hostname}:3000`,
    'https://api.stratlab.uk',
  ]
  for (const url of urls) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return url
    } catch { /* next */ }
  }
  return null
}

interface LyricsLine {
  c?: string  // chord line
  l?: string  // lyrics line
}

interface SearchResult {
  title: string
  artist: string
  sections: { name: string; chords: string }[]
  genre?: string
  lyrics?: LyricsLine[] | null
}

interface Props {
  onClose: () => void
}

export function ChordSearch({ onClose }: Props) {
  const addCustomSong = useStore(s => s.addCustomSong)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)
  const setlistData = useStore(s => s.setlistData)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<SearchResult | null>(null)
  const [added, setAdded] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [pickerChord, setPickerChord] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])
    setViewing(null)

    try {
      const server = await findServer()
      if (!server) {
        setError('Server not available. Start it with: cd server && npm run dev')
        return
      }
      const res = await fetch(`${server}/api/chords/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Search failed')
        return
      }
      setResults(data.results || [])
      if ((data.results || []).length === 0) {
        setError('No results found')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setSearching(false)
    }
  }

  const handleAddToSetlist = (result: SearchResult) => {
    const song: Song = {
      title: result.title,
      artist: result.artist || 'Unknown',
      key: guessKey(result.sections),
      bpm: 120,
      timeSignature: '4/4',
      capo: null,
      notes: '',
      sections: result.sections,
      imported: true,
    }
    addCustomSong(song)
    addSongToSetlist(setlistData.activeId, song.title)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // Transpose helper for a space-separated chord string
  const transposeChordString = (chords: string, semitones: number): string => {
    if (semitones === 0) return chords
    const key = guessKey(viewing?.sections ?? [])
    const useFlats = shouldUseFlats(key, semitones)
    return chords.split(/(\s+)/).map(token =>
      token.trim() ? transposeChord(token, semitones, useFlats) : token
    ).join('')
  }

  // Transposed view data
  const transposedSections = useMemo(() => {
    if (!viewing || transposeSemitones === 0) return viewing?.sections ?? []
    return viewing.sections.map(s => ({
      ...s,
      chords: transposeChordString(s.chords, transposeSemitones),
    }))
  }, [viewing, transposeSemitones])

  const transposedLyrics = useMemo(() => {
    if (!viewing?.lyrics || transposeSemitones === 0) return viewing?.lyrics ?? null
    return viewing.lyrics.map(line => {
      if (line.c) return { c: transposeChordString(line.c, transposeSemitones) }
      return line
    })
  }, [viewing, transposeSemitones])

  // Unique chords from transposed sections for diagram bar
  const uniqueChords = useMemo(() => {
    if (!viewing) return []
    const seen = new Set<string>()
    const result: string[] = []
    for (const sec of transposedSections) {
      for (const c of sec.chords.split(/\s+/)) {
        const trimmed = c.trim()
        if (trimmed && !seen.has(trimmed) && lookupChord(trimmed)) {
          seen.add(trimmed)
          result.push(trimmed)
        }
      }
    }
    return result
  }, [viewing, transposedSections])

  // Render chord text with tappable chord names
  const renderTappableChords = (text: string, fontSize: number, color?: string) => {
    const tokens = text.split(/(\s+)/)
    return (
      <span>
        {tokens.map((token, i) => {
          if (!token.trim()) return <span key={i}>{token}</span>
          const hasVoicing = lookupChord(token)
          return (
            <span
              key={i}
              onClick={hasVoicing ? (e) => { e.stopPropagation(); setPickerChord(token) } : undefined}
              style={{
                cursor: hasVoicing ? 'pointer' : 'default',
                textDecoration: hasVoicing ? 'underline' : 'none',
                textDecorationColor: 'var(--badge-bg)',
                textUnderlineOffset: 3,
                fontSize,
                fontWeight: 'bold',
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

  // Quick view mode — show chords for a song
  if (viewing) {
    const hasLyrics = viewing.lyrics && viewing.lyrics.length > 0

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg, #111)', zIndex: 300,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderBottom: '1px solid var(--badge-bg)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { setViewing(null); setShowLyrics(false); setTransposeSemitones(0) }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}
          >
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <button
              onClick={() => setTransposeSemitones(s => s - 1)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 15, fontWeight: 600,
                background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
              }}
            >
              -
            </button>
            <span style={{ fontSize: 12, color: transposeSemitones === 0 ? 'var(--text-muted)' : 'var(--accent)', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
              {transposeSemitones === 0 ? 'Key' : (transposeSemitones > 0 ? '+' : '') + transposeSemitones}
            </span>
            <button
              onClick={() => setTransposeSemitones(s => s + 1)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 15, fontWeight: 600,
                background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
              }}
            >
              +
            </button>
          </div>
          <div style={{ flex: 1 }} />
          {hasLyrics && (
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: showLyrics ? 'var(--accent)' : 'var(--badge-bg)',
                color: showLyrics ? '#fff' : 'var(--text)',
                border: 'none',
              }}
            >
              Lyrics
            </button>
          )}
          <button
            onClick={() => handleAddToSetlist(viewing)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: added ? 'var(--success, #4ade80)' : 'var(--accent, #4a9eff)',
              color: '#fff', border: 'none',
            }}
          >
            {added ? 'Added!' : '+ Setlist'}
          </button>
        </div>

        {/* Song content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>{viewing.title}</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{viewing.artist}</div>

          {showLyrics && hasLyrics ? (
            // Lyrics view — chords above lyrics
            <div>
              {(transposedLyrics ?? viewing.lyrics!).map((line, i) => {
                if (line.c) {
                  return (
                    <div key={i} style={{
                      letterSpacing: 1, wordSpacing: 8,
                      marginTop: 8,
                    }}>
                      {renderTappableChords(line.c, 16, 'var(--accent)')}
                    </div>
                  )
                }
                if (line.l) {
                  return (
                    <div key={i} style={{ fontSize: 15, lineHeight: 1.5 }}>
                      {line.l}
                    </div>
                  )
                }
                return null
              })}
            </div>
          ) : (
            // Chords-only view (sections)
            transposedSections.map((section, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  color: sectionColor(section.name), marginBottom: 2,
                }}>
                  {section.name}
                </div>
                <div style={{
                  letterSpacing: 1, wordSpacing: 10,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {renderTappableChords(section.chords, 20)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chord diagram bar */}
        {uniqueChords.length > 0 && (
          <div style={{
            display: 'flex', overflowX: 'auto', gap: 8, padding: 8,
            borderTop: '1px solid var(--badge-bg)',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
            flexShrink: 0,
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

        {/* Voicing picker */}
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

  // Search mode
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg, #111)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--badge-bg)',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>Search Chords</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}
        >
          Close
        </button>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', flexShrink: 0 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Song name or artist..."
          autoFocus
          style={{
            flex: 1, padding: '10px 12px', fontSize: 16,
            background: 'var(--badge-bg)', color: 'var(--text)',
            border: '1px solid var(--badge-bg)', borderRadius: 8,
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none',
            opacity: searching ? 0.5 : 1,
          }}
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 14, padding: '12px 0' }}>{error}</div>
        )}

        {results.map((r, i) => (
          <div
            key={`${r.title}-${r.artist}-${i}`}
            onClick={() => setViewing(r)}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid var(--badge-bg)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {r.artist} — {r.sections.length} section{r.sections.length !== 1 ? 's' : ''}
              {r.lyrics && r.lyrics.length > 0 ? ' — has lyrics' : ''}
            </div>
          </div>
        ))}

        {!searching && results.length === 0 && !error && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: 15 }}>
            Search 232,000+ songs
          </div>
        )}
      </div>
    </div>
  )
}

function guessKey(sections: { name: string; chords: string }[]): string {
  for (const s of sections) {
    const first = s.chords.trim().split(/\s+/)[0]
    if (first) return first.replace(/[0-9]/g, '')
  }
  return 'C'
}
