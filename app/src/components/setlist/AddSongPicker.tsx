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

function CreateSongForm({ setlistId, onDone }: { setlistId: string, onDone: () => void }) {
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
      title: trimmed,
      artist: artist.trim() || 'Unknown',
      key,
      bpm: parseInt(bpm) || 120,
      timeSignature: timeSig,
      capo: null,
      notes: '',
      sections: [{ name: 'Verse', chords: '' }],
      imported: false,
    }

    addCustomSong(song)
    addSongToSetlist(setlistId, song.title)
    onDone()
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 16,
    background: 'var(--badge-bg, #333)',
    color: 'var(--text, #fff)',
    border: '1px solid var(--badge-bg, #444)',
    borderRadius: 8,
  }

  const labelStyle = {
    fontSize: 13,
    color: 'var(--text-muted, #888)',
    marginBottom: 4,
    display: 'block' as const,
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text, #fff)' }}>
        New Song
      </h3>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Song title"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Artist</label>
        <input
          value={artist}
          onChange={e => setArtist(e.target.value)}
          placeholder="Artist name"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Key</label>
          <select value={key} onChange={e => setKey(e.target.value)} style={inputStyle}>
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>BPM</label>
          <input
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            type="number"
            inputMode="numeric"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Time</label>
          <select value={timeSig} onChange={e => setTimeSig(e.target.value)} style={inputStyle}>
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
            <option value="2/4">2/4</option>
            <option value="12/8">12/8</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onDone}
          style={{
            flex: 1, padding: 12, borderRadius: 8, fontSize: 15,
            background: 'var(--badge-bg, #333)', color: 'var(--text, #fff)', border: 'none',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!title.trim()}
          style={{
            flex: 1, padding: 12, borderRadius: 8, fontSize: 15, fontWeight: 600,
            background: title.trim() ? 'var(--accent, #4a9eff)' : '#555',
            color: '#fff', border: 'none',
            opacity: title.trim() ? 1 : 0.5,
          }}
        >
          Create
        </button>
      </div>
    </div>
  )
}

export function AddSongPicker({ setlistId, currentTitles, onClose }: AddSongPickerProps) {
  const allSongs = useStore(s => s.allSongs)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)
  const [showCreate, setShowCreate] = useState(false)

  const songs = allSongs()
  const currentSet = new Set(currentTitles)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg, #111)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--text, #fff)', fontSize: 20 }}>Add Songs</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: 'var(--accent, #4af)', fontSize: 16, fontWeight: 600,
          }}
        >
          Done
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showCreate ? (
          <CreateSongForm setlistId={setlistId} onDone={() => setShowCreate(false)} />
        ) : (
          <>
            {/* Create new song button */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '14px 20px',
                background: 'none', border: 'none',
                borderBottom: '2px solid var(--border, rgba(255,255,255,0.1))',
                cursor: 'pointer',
              }}
            >
              <span style={{
                color: 'var(--success, #4ade80)', fontSize: 22, width: 24,
                textAlign: 'center', fontWeight: 700,
              }}>
                +
              </span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: 'var(--success, #4ade80)', fontWeight: 600, fontSize: 15 }}>
                  Create New Song
                </div>
                <div style={{ color: 'var(--text-muted, #888)', fontSize: 12, marginTop: 2 }}>
                  Add a song manually with title, key, and sections
                </div>
              </div>
            </button>

            {/* Existing songs list */}
            {songs.map(song => {
              const inSetlist = currentSet.has(song.title)
              return (
                <div
                  key={song.title}
                  onClick={() => {
                    if (!inSetlist) addSongToSetlist(setlistId, song.title)
                  }}
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
          </>
        )}
      </div>
    </div>
  )
}
