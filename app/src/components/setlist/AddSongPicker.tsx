import { useStore } from '../../store/use-store'

interface AddSongPickerProps {
  setlistId: string
  currentTitles: string[]
  onClose: () => void
}

export function AddSongPicker({ setlistId, currentTitles, onClose }: AddSongPickerProps) {
  const allSongs = useStore(s => s.allSongs)
  const addSongToSetlist = useStore(s => s.addSongToSetlist)

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
            background: 'none',
            border: 'none',
            color: 'var(--accent, #4af)',
            fontSize: 16,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Done
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {songs.map(song => {
          const inSetlist = currentSet.has(song.title)
          return (
            <div
              key={song.title}
              onClick={() => {
                if (!inSetlist) {
                  addSongToSetlist(setlistId, song.title)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 20px',
                cursor: inSetlist ? 'default' : 'pointer',
                opacity: inSetlist ? 0.3 : 1,
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.05))',
              }}
            >
              <span
                style={{
                  color: inSetlist ? 'var(--text-secondary, #888)' : 'var(--accent, #4af)',
                  fontSize: 18,
                  width: 24,
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {inSetlist ? '\u2713' : '+'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text, #fff)', fontWeight: 500 }}>{song.title}</div>
                <div style={{ color: 'var(--text-secondary, #888)', fontSize: 13, marginTop: 2 }}>
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
