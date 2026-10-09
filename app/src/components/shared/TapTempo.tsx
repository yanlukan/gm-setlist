import { useState, useRef, useMemo, useEffect } from 'react'
import { useStore } from '../../store/use-store'
import { Modal } from './Modal'
import { startClick, beatsPerBar } from '../../music/click'

interface Props {
  open: boolean
  onClose: () => void
}

export function TapTempo({ open, onClose }: Props) {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const saveBpm = useStore(s => s.saveBpm)

  const currentSong = useMemo(() => {
    const all = [...songs, ...customSongs]
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return undefined
    const setlist = active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return setlist[currentIndex]
  }, [songs, customSongs, setlistData, currentIndex, edits])

  const [bpm, setBpm] = useState((currentSong ? (edits[currentSong.title]?.bpm ?? currentSong.bpm) : 120))
  const tapsRef = useRef<number[]>([])
  // Hearing the tempo: a click at the shown bpm, four (or three) to the bar
  const [clicking, setClicking] = useState(false)
  const beats = beatsPerBar(currentSong?.timeSignature ?? '4/4')

  useEffect(() => {
    if (open) {
      setBpm((currentSong ? (edits[currentSong.title]?.bpm ?? currentSong.bpm) : 120))
      tapsRef.current = []
    }
    setClicking(false)
  }, [open, currentSong])

  // The click follows the shown tempo: it restarts when the taps change it,
  // and stops when the sheet closes or the component goes
  useEffect(() => {
    if (!clicking || !open) return
    const stop = startClick(bpm, beats)
    if (!stop) { setClicking(false); return }
    return stop
  }, [clicking, open, bpm, beats])

  const handleTap = () => {
    const now = Date.now()
    const taps = tapsRef.current
    // A pause starts a fresh count; averaging the gap in gives a nonsense tempo.
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) taps.length = 0
    taps.push(now)
    if (taps.length > 8) taps.shift()
    if (tapsRef.current.length >= 2) {
      const taps = tapsRef.current
      const intervals = taps.slice(1).map((t, i) => t - taps[i])
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculated = Math.round(60000 / avgInterval)
      if (calculated >= 20 && calculated <= 300) setBpm(calculated)
    }
  }

  const close = () => {
    setClicking(false)
    onClose()
  }

  const handleSave = () => {
    if (currentSong) saveBpm(currentSong.title, bpm)
    close()
  }

  return (
    <Modal open={open} onClose={close}>
      <div style={{
        background: 'var(--picker-bg)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        width: '80%',
        maxWidth: 300,
      }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>{bpm}</div>
        <button
          // On touch-down, not release: a tap tempo is about when the finger lands.
          onPointerDown={e => { e.preventDefault(); handleTap() }}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleTap() }
          }}
          style={{
          width: '100%', padding: 20, fontSize: 20, fontWeight: 'bold',
          background: 'var(--accent)', color: '#fff', borderRadius: 8, marginBottom: 12,
        }}>TAP</button>
        <button
          onClick={() => setClicking(c => !c)}
          aria-pressed={clicking}
          style={{
            width: '100%', padding: 10, fontSize: 16, fontWeight: 600, borderRadius: 8, marginBottom: 16,
            background: clicking ? 'var(--warning, #f59e0b)' : 'var(--badge-bg)',
            color: clicking ? '#000' : 'inherit',
          }}>{clicking ? 'Stop' : 'Hear it'}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={close} style={{
            flex: 1, padding: 10, fontSize: 16, borderRadius: 8, background: 'var(--badge-bg)',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 1, padding: 10, fontSize: 16, borderRadius: 8, background: 'var(--success)', color: '#000',
          }}>Save</button>
        </div>
      </div>
    </Modal>
  )
}
