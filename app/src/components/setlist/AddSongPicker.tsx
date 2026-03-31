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

type Tab = 'library' | 'create'

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

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
        <button style={tabStyle(tab === 'library')} onClick={() => setTab('library')}>Library</button>
        <button style={tabStyle(tab === 'create')} onClick={() => setTab('create')}>Create</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'create' && (
          <CreateSongForm setlistId={setlistId} onDone={() => setTab('library')} />
        )}

        {tab === 'library' && (
          songs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No songs yet. Use Search to find songs or Create to add manually.
            </div>
          ) : songs.map(song => {
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
          })
        )}
      </div>
    </div>
  )
}
