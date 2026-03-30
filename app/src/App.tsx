import { useEffect, useRef, useState } from 'react'

declare const __BUILD_TIME__: string
const APP_VERSION = '2.1.0'
import { useStore } from './store/use-store'
import { migrateFromLocalStorage } from './store/migrate'
import { TopBar } from './components/layout/TopBar'
import { BottomBar } from './components/layout/BottomBar'
import { SongSheet } from './components/song/SongSheet'
import { DiagramsBar } from './components/diagrams/DiagramsBar'
import { useSwipe } from './hooks/use-swipe'
import { useWakeLock } from './hooks/use-wake-lock'

export function App() {
  const hydrate = useStore(s => s.hydrate)
  const theme = useStore(s => s.theme)
  const viewMode = useStore(s => s.viewMode)
  const editMode = useStore(s => s.editMode)
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const sheetRef = useRef<HTMLDivElement>(null)

  const [showVersion, setShowVersion] = useState(false)

  useWakeLock(viewMode === 'stage')

  useEffect(() => {
    console.log(`PlayBook v${APP_VERSION} built ${__BUILD_TIME__}`)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        await migrateFromLocalStorage()
      } catch (e) {
        console.warn('Migration failed:', e)
      }
      try {
        await hydrate()
      } catch (e) {
        console.warn('Hydration failed:', e)
      }
    }
    init()
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
  }, [hydrate])

  useEffect(() => {
    document.body.className = [
      theme === 'light' ? 'light' : '',
      viewMode === 'stage' ? 'stage' : '',
    ].filter(Boolean).join(' ')
  }, [theme, viewMode])

  useSwipe(sheetRef, {
    onSwipeLeft: nextSong,
    onSwipeRight: prevSong,
  }, !editMode)

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
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
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
        style={{
          position: 'fixed',
          bottom: 2,
          right: 8,
          fontSize: 10,
          color: '#555',
          zIndex: 50,
        }}
      >
        v{APP_VERSION}
      </div>
      <BottomBar />
    </>
  )
}
