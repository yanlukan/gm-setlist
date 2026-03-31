import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from 'react'

declare const __BUILD_TIME__: string
const APP_VERSION = '2.2.0'
import { useStore } from './store/use-store'
import { migrateFromLocalStorage } from './store/migrate'
import { TopBar } from './components/layout/TopBar'
import { BottomBar } from './components/layout/BottomBar'
import { SongSheet } from './components/song/SongSheet'
import { DiagramsBar } from './components/diagrams/DiagramsBar'
import { useSwipe } from './hooks/use-swipe'
import { useWakeLock } from './hooks/use-wake-lock'

// Error boundary to prevent white screen crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#fff', background: '#1a1a1a', height: '100vh' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>PlayBook v{APP_VERSION}</h1>
          <p style={{ color: '#ef4444', marginBottom: 8 }}>Something went wrong:</p>
          <pre style={{ fontSize: 12, color: '#888', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { localStorage.clear(); indexedDB.deleteDatabase('playbook'); location.reload() }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8 }}
          >
            Reset & Reload
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
  const sheetRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [showVersion, setShowVersion] = useState(false)

  useWakeLock(viewMode === 'stage')

  useEffect(() => {
    console.log(`PlayBook v${APP_VERSION} built ${__BUILD_TIME__}`)
    async function init() {
      try { await migrateFromLocalStorage() } catch (e) { console.warn('Migration:', e) }
      try { await hydrate() } catch (e) { console.warn('Hydrate:', e) }
      setReady(true)
    }
    init()
    // SW registered via index.html inline script for earliest possible cache-busting
  }, [hydrate])

  useEffect(() => {
    document.body.className = [
      theme === 'light' ? 'light' : '',
      viewMode === 'stage' ? 'stage' : '',
    ].filter(Boolean).join(' ')
  }, [theme, viewMode])

  const swipeHandlers = useMemo(() => ({
    onSwipeLeft: nextSong,
    onSwipeRight: prevSong,
  }), [nextSong, prevSong])

  useSwipe(sheetRef, swipeHandlers, !editMode)

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
      <div ref={sheetRef} style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <SongSheet />
      </div>
      {diagramsVisible && <DiagramsBar />}
      {showVersion && (
        <div
          onClick={() => setShowVersion(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>PlayBook</div>
          <div style={{ fontSize: 16, color: '#888' }}>v{APP_VERSION}</div>
          <div style={{ fontSize: 13, color: '#666' }}>Built: {__BUILD_TIME__}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>Tap to close</div>
        </div>
      )}
      <div
        onClick={() => setShowVersion(true)}
        style={{ position: 'fixed', bottom: 2, right: 8, fontSize: 10, color: '#555', zIndex: 50 }}
      >
        v{APP_VERSION}
      </div>
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
