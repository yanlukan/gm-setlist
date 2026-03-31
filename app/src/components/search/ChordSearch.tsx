import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { SongView } from '../song/SongView'
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

interface LyricsLine { c?: string; l?: string }

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

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])
    try {
      const server = await findServer()
      if (!server) { setError('Server not available'); return }
      const res = await fetch(`${server}/api/chords/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Search failed'); return }
      setResults(data.results || [])
      if ((data.results || []).length === 0) setError('No results found')
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
      key: result.sections[0]?.chords.trim().split(/\s+/)[0]?.replace(/[0-9]/g, '') || 'C',
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

  // Song viewer
  if (viewing) {
    return (
      <SongView
        title={viewing.title}
        artist={viewing.artist}
        sections={viewing.sections}
        lyrics={viewing.lyrics}
        onClose={() => setViewing(null)}
        actionLabel="+ Setlist"
        onAction={() => handleAddToSetlist(viewing)}
        actionDone={added}
      />
    )
  }

  // Search screen
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--badge-bg)', flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>Search Chords</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}>
          Close
        </button>
      </div>

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

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        {error && <div style={{ color: 'var(--danger)', fontSize: 14, padding: '12px 0' }}>{error}</div>}

        {results.map((r, i) => (
          <div
            key={`${r.title}-${r.artist}-${i}`}
            onClick={() => setViewing(r)}
            style={{ padding: '12px 0', borderBottom: '1px solid var(--badge-bg)', cursor: 'pointer' }}
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
            Search 259,000+ songs
          </div>
        )}
      </div>
    </div>
  )
}
