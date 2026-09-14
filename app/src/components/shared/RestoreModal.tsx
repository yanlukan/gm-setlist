import { useEffect, useState } from 'react'
import { listSnapshots, restoreSnapshot } from '../../store/persistence'
import type { Snapshot } from '../../types'

/**
 * Restore points. Every setlist change writes one automatically, so a wrong
 * reorder, a deleted song or an accidental wipe is always one tap from being
 * undone — including after a reload.
 */
export function RestoreModal({ onClose }: { onClose: () => void }) {
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listSnapshots().then(setSnaps)
  }, [])

  const restore = async (snap: Snapshot) => {
    if (!confirm(`Restore "${snap.reason}" from ${formatWhen(snap.at)}?\n\nYour current data is saved as a restore point first.`)) return
    setBusy(true)
    try {
      await restoreSnapshot(snap.id)
      location.reload()
    } catch (e) {
      alert('Restore failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
      setBusy(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--picker-bg, #2a2a2a)', color: 'var(--text)',
          borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--badge-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <strong style={{ fontSize: 16 }}>Restore Points</strong>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 20 }}>&times;</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 8 }}>
          {snaps === null && <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading&hellip;</div>}
          {snaps !== null && snaps.length === 0 && (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              No restore points yet. One is saved automatically every time you change a setlist.
            </div>
          )}
          {snaps?.map(snap => (
            <button
              key={snap.id}
              disabled={busy}
              onClick={() => restore(snap)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', marginBottom: 4, borderRadius: 8,
                background: 'var(--badge-bg)', color: 'var(--text)',
                border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{snap.reason}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatWhen(snap.at)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
