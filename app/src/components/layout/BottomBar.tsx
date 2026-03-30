import { useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../store/use-store'

export function BottomBar() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const currentIndex = useStore(s => s.currentIndex)
  const goToSong = useStore(s => s.goToSong)
  const activeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const setlistSongs = useMemo(() => {
    const all = [...songs, ...customSongs]
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return all
    const mapped = active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return mapped.length > 0 ? mapped : all
  }, [songs, customSongs, setlistData])

  useEffect(() => {
    if (!activeRef.current || !scrollRef.current) return
    const btn = activeRef.current
    const container = scrollRef.current
    requestAnimationFrame(() => {
      const left = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2
      container.scrollTo({ left, behavior: 'smooth' })
    })
  }, [currentIndex])

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
        overflowX: 'auto',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {setlistSongs.map((song, i) => {
        const isActive = i === currentIndex
        return (
          <button
            key={song.title}
            ref={isActive ? activeRef : undefined}
            onClick={() => goToSong(i)}
            style={{
              flex: '0 0 auto',
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? '#4a9eff' : 'var(--badge-bg)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {song.shortTitle ?? song.title}
          </button>
        )
      })}
    </div>
  )
}
