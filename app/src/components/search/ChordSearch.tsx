import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { sectionColor } from '../../music/theory'
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

interface SearchResult {
  title: string
  artist: string
  sections: { name: string; chords: string }[]
  genre?: string
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

  // Quick view mode — show chords for a song
  if (viewing) {
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
          <button
            onClick={() => setViewing(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}
          >
            Back
          </button>
          <button
            onClick={() => handleAddToSetlist(viewing)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: added ? 'var(--success, #4ade80)' : 'var(--accent, #4a9eff)',
              color: '#fff', border: 'none',
            }}
          >
            {added ? 'Added!' : '+ Add to Setlist'}
          </button>
        </div>

        {/* Song content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>{viewing.title}</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{viewing.artist}</div>

          {viewing.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                color: sectionColor(section.name), marginBottom: 2,
              }}>
                {section.name}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 'bold', letterSpacing: 1, wordSpacing: 10,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {section.chords}
              </div>
            </div>
          ))}
        </div>
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
