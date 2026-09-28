import { useEffect, useState, Component, type ReactNode } from 'react'
import { APP_VERSION, BUILD_TIME } from './version'
import { useStore } from './store/use-store'
import { exportAllData } from './store/persistence'
import { migrateFromLocalStorage } from './store/migrate'
import { TopBar } from './components/layout/TopBar'
import { BottomBar } from './components/layout/BottomBar'
import { SongSheet } from './components/song/SongSheet'
import { DiagramsBar } from './components/diagrams/DiagramsBar'
import { usePedalKeys } from './hooks/use-pedal-keys'
import { useWakeLock } from './hooks/use-wake-lock'

// Error boundary. It must never be able to destroy the user's data: a crash on
// stage is recoverable, a wiped setlist is not. Saving a backup comes first,
// reloading second, and erasing everything is behind two confirmations.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }

  saveBackup = async () => {
    try {
      const json = await exportAllData()
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `playbook-rescue-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not read the saved data to back it up.')
    }
  }

  eraseEverything = () => {
    if (!confirm('This deletes every setlist and edit on this device. Save a backup first if you have not.\n\nContinue?')) return
    if (!confirm('Last chance — really erase all PlayBook data?')) return
    localStorage.clear()
    indexedDB.deleteDatabase('playbook')
    location.reload()
  }

  render() {
    if (this.state.error) {
      const btn: React.CSSProperties = {
        padding: '10px 16px', border: 'none', borderRadius: 8,
        fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer',
      }
      return (
        <div style={{ padding: 24, color: '#fff', background: '#1a1a1a', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>PlayBook v{APP_VERSION}</h1>
          <p style={{ color: '#ef4444', marginBottom: 8 }}>Something went wrong:</p>
          <pre style={{ fontSize: 12, color: '#888', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <p style={{ fontSize: 14, color: '#bbb', marginTop: 16 }}>
            Your setlists are still saved. Reload first.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            <button onClick={() => location.reload()} style={{ ...btn, background: '#4a9eff' }}>
              Reload
            </button>
            <button onClick={this.saveBackup} style={{ ...btn, background: '#3f3f46' }}>
              Save Backup File
            </button>
          </div>
          <button
            onClick={this.eraseEverything}
            style={{
              marginTop: 28, padding: '6px 10px', fontSize: 12,
              background: 'transparent', border: '1px solid #7f1d1d',
              borderRadius: 6, color: '#b91c1c', cursor: 'pointer',
            }}
          >
            Erase all data
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppInner() {
  const hydrate = useStore(s => s.hydrate)
  const theme = useStore(s => s.theme)
  const viewMode = useStore(s => s.viewMode)
  const editMode = useStore(s => s.editMode)
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const loadFailed = useStore(s => s.loadFailed)
  const [ready, setReady] = useState(false)

  // Screen stays on whenever PlayBook is open — not only in Stage Mode.
  useWakeLock(true)

  useEffect(() => {
    console.log(`PlayBook v${APP_VERSION} built ${BUILD_TIME}`)
    async function init() {
      try { await migrateFromLocalStorage() } catch (e) { console.warn('Migration:', e) }
      try { await hydrate() } catch (e) { console.warn('Hydrate:', e) }
      setReady(true)
    }
    init()

    // Without this the app cannot open offline at all — it was never
    // registered in the version taken to the last gig.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(e => console.warn('SW registration failed:', e))
    }
  }, [hydrate])

  useEffect(() => {
    document.body.className = [
      theme === 'light' ? 'light' : '',
      viewMode === 'stage' ? 'stage' : '',
    ].filter(Boolean).join(' ')
  }, [theme, viewMode])

  // Page-turner pedal / keyboard. Swipe lives on the chart itself (SongSheet).
  usePedalKeys({ onNext: nextSong, onPrev: prevSong }, !editMode)

  // Show loading briefly while IndexedDB hydrates
  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-muted)', fontSize: 18,
      }}>
        Loading...
      </div>
    )
  }

  return (
    <>
      <TopBar />
      {loadFailed && (
        <div style={{
          padding: '8px 12px', background: '#7f1d1d', color: '#fff',
          fontSize: 14, fontWeight: 600, textAlign: 'center', flexShrink: 0,
        }}>
          Could not read saved data. Running read-only so nothing is overwritten — reload before editing.
        </div>
      )}
      <SongSheet />
      {diagramsVisible && <DiagramsBar />}
      <BottomBar />
    </>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  )
}
