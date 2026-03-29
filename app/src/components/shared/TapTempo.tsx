import { useState, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
}

export function TapTempo({ open, onClose }: Props) {
  const currentSong = useStore(s => s.currentSong())
  const saveBpm = useStore(s => s.saveBpm)
  const [bpm, setBpm] = useState(currentSong?.bpm ?? 120)
  const tapsRef = useRef<number[]>([])

  const handleTap = () => {
    const now = Date.now()
    tapsRef.current.push(now)
    if (tapsRef.current.length > 8) tapsRef.current.shift()
    if (tapsRef.current.length >= 2) {
      const taps = tapsRef.current
      const intervals = taps.slice(1).map((t, i) => t - taps[i])
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculated = Math.round(60000 / avgInterval)
      if (calculated >= 20 && calculated <= 300) setBpm(calculated)
    }
  }

  const handleSave = () => {
    if (currentSong) saveBpm(currentSong.title, bpm)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{
        background: 'var(--picker-bg)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        width: '80%',
        maxWidth: 300,
      }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>{bpm}</div>
        <button onClick={handleTap} style={{
          width: '100%', padding: 20, fontSize: 20, fontWeight: 'bold',
          background: 'var(--accent)', color: '#fff', borderRadius: 8, marginBottom: 16,
        }}>TAP</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
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
