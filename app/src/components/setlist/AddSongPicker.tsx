import { useState } from 'react'
import { useStore } from '../../store/use-store'
import type { Song } from '../../types'

interface AddSongPickerProps {
  setlistId: string
  currentTitles: string[]
  onClose: () => void
}

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
              'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm']

const SERVER_URLS = ['http://localhost:3000', 'https://api.stratlab.uk']

async function findServer(): Promise<string | null> {
  for (const url of SERVER_URLS) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) return url
    } catch { /* try next */ }
  }
  return null
}

interface ChordResult {
  title: string
  artist: string
  spotifyId: string
  thumbnail?: string
  sections: { name: string; chords: string }[]
  genre?: string
}

type Tab = 'library' | 'search' | 'create'

// ---- Online chord search ----
function ChordSearch({ setlistId, onDone }: { setlistId: string; onDone: () => void }) {
  const addCustomSong = useStore(s => s.addCustomSong)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChordResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])

    try {
      const server = await findServer()
      if (!server) {
        setError('Server not available. Start the server at home first.')
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
        setError('No chord charts found for this song')
      }
    } catch (e) {
      setError('Connection failed')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = (result: ChordResult) => {
    const song: Song = {
      title: result.title,
      artist: result.artist || 'Unknown',
      key: guessKey(result.sections),
      bpm: 120,
      timeSignature: '4/4',
      capo: null,
      notes: `From Chordonomicon (${result.genre || 'unknown genre'})`,
      sections: result.sections,
      imported: true,
    }
    addCustomSong(song)
    addSongToSetlist(setlistId, song.title)
    onDone()
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text, #fff)' }}>
        Search Chord Charts
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted, #888)', margin: '0 0 12px' }}>
        Search 275,000 songs from the Chordonomicon database
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Song name or artist..."
          style={{
            flex: 1, padding: '10px 12px', fontSize: 16,
            background: 'var(--badge-bg, #333)', color: 'var(--text, #fff)',
            border: '1px solid var(--badge-bg, #444)', borderRadius: 8,
          }}
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 600,
            background: 'var(--accent, #4a9eff)', color: '#fff', border: 'none',
            opacity: searching ? 0.5 : 1,
          }}
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--danger, #ef4444)', fontSize: 14, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {results.map(r => (
        <div
          key={r.spotifyId}
          onClick={() => handleAdd(r)}
          style={{
            display: 'flex', gap: 12, padding: '12px 0',
            borderBottom: '1px solid var(--badge-bg, rgba(255,255,255,0.1))',
            cursor: 'pointer',
          }}
        >
          {r.thumbnail && (
            <img
              src={r.thumbnail}
              alt=""
              style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text, #fff)' }}>{r.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #888)' }}>{r.artist}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #666)', marginTop: 2 }}>
              {r.sections.length} sections — {r.genre || ''}
            </div>
          </div>
          <span style={{ color: 'var(--accent, #4af)', fontSize: 18, fontWeight: 600, alignSelf: 'center' }}>+</span>
        </div>
      ))}
    </div>
  )
}

// ---- Manual create form ----
function CreateSongForm({ setlistId, onDone }: { setlistId: string; onDone: () => void }) {
  const addCustomSong = useStore(s => s.addCustomSong)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('C')
  const [bpm, setBpm] = useState('120')
  const [timeSig, setTimeSig] = useState('4/4')

  const handleCreate = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const song: Song = {
      title: trimmed, artist: artist.trim() || 'Unknown', key,
      bpm: parseInt(bpm) || 120, timeSignature: timeSig,
      capo: null, notes: '',
      sections: [{ name: 'Verse', chords: '' }],
    }
    addCustomSong(song)
    addSongToSetlist(setlistId, song.title)
    onDone()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 16,
    background: 'var(--badge-bg, #333)', color: 'var(--text, #fff)',
    border: '1px solid var(--badge-bg, #444)', borderRadius: 8,
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text, #fff)' }}>New Song</h3>
      <div style={{ marginBottom: 12 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title *" style={inputStyle} autoFocus />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={key} onChange={e => setKey(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={bpm} onChange={e => setBpm(e.target.value)} type="number" inputMode="numeric" placeholder="BPM" style={{ ...inputStyle, flex: 1 }} />
        <select value={timeSig} onChange={e => setTimeSig(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {['4/4', '3/4', '6/8', '2/4', '12/8'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDone} style={{ flex: 1, padding: 12, borderRadius: 8, fontSize: 15, background: 'var(--badge-bg, #333)', color: 'var(--text, #fff)', border: 'none' }}>
          Cancel
        </button>
        <button onClick={handleCreate} disabled={!title.trim()} style={{
          flex: 1, padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 600,
          background: title.trim() ? 'var(--accent, #4a9eff)' : '#555', color: '#fff', border: 'none',
        }}>
          Create
        </button>
      </div>
    </div>
  )
}

// ---- Main picker ----
export function AddSongPicker({ setlistId, currentTitles, onClose }: AddSongPickerProps) {
  const allSongs = useStore(s => s.allSongs)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)
  const [tab, setTab] = useState<Tab>('library')

  const songs = allSongs()
  const currentSet = new Set(currentTitles)

  const tabStyle = (active: boolean) => ({
    flex: 1, padding: '10px 0', fontSize: 14, fontWeight: active ? 600 : 400,
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--accent, #4af)' : '2px solid transparent',
    color: active ? 'var(--accent, #4af)' : 'var(--text-muted, #888)',
    cursor: 'pointer' as const,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg, #111)', zIndex: 300,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
      }}>
        <h2 style={{ margin: 0, color: 'var(--text, #fff)', fontSize: 20 }}>Add Song</h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--accent, #4af)', fontSize: 16, fontWeight: 600,
        }}>
          Done
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
        <button style={tabStyle(tab === 'library')} onClick={() => setTab('library')}>Library</button>
        <button style={tabStyle(tab === 'search')} onClick={() => setTab('search')}>Search Online</button>
        <button style={tabStyle(tab === 'create')} onClick={() => setTab('create')}>Create</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'search' && (
          <ChordSearch setlistId={setlistId} onDone={() => setTab('library')} />
        )}

        {tab === 'create' && (
          <CreateSongForm setlistId={setlistId} onDone={() => setTab('library')} />
        )}

        {tab === 'library' && songs.map(song => {
          const inSetlist = currentSet.has(song.title)
          return (
            <div
              key={song.title}
              onClick={() => { if (!inSetlist) addSongToSetlist(setlistId, song.title) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', cursor: inSetlist ? 'default' : 'pointer',
                opacity: inSetlist ? 0.3 : 1,
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.05))',
              }}
            >
              <span style={{
                color: inSetlist ? 'var(--text-muted, #888)' : 'var(--accent, #4af)',
                fontSize: 18, width: 24, textAlign: 'center', fontWeight: 600,
              }}>
                {inSetlist ? '\u2713' : '+'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text, #fff)', fontWeight: 500 }}>{song.title}</div>
                <div style={{ color: 'var(--text-muted, #888)', fontSize: 13, marginTop: 2 }}>
                  {song.artist} — Key: {song.key} | {song.bpm} BPM
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Guess key from first chord of first section
function guessKey(sections: { name: string; chords: string }[]): string {
  for (const s of sections) {
    const first = s.chords.trim().split(/\s+/)[0]
    if (first) return first.replace(/[0-9]/g, '')
  }
  return 'C'
}
