import { useEffect, useRef } from 'react'
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

  useWakeLock(viewMode === 'stage')

  useEffect(() => {
    async function init() {
      await migrateFromLocalStorage()
      await hydrate()
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
      <div ref={sheetRef} style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <SongSheet />
      </div>
      {diagramsVisible && <DiagramsBar />}
      <BottomBar />
    </>
  )
}
