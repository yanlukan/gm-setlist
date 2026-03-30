import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { CHORD_DB } from '../../data/chords-db'
import { ChordDiagram } from './ChordDiagram'
import { VoicingPicker } from './VoicingPicker'

export function DiagramsBar() {
  // Primitive selectors — no method calls
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)

  const [pickerChord, setPickerChord] = useState<string | null>(null)

  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const song = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return undefined
    const setlistArr = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean)
    return setlistArr[currentIndex]
  }, [allSongs, setlistData, currentIndex])

  const uniqueChords = useMemo(() => {
    if (!song) return []
    const songEdits = edits[song.title]
    const sections = songEdits?.sections ?? song.sections ?? []
    const seen = new Set<string>()
    const result: string[] = []
    for (const section of sections) {
      const names = section.chords.split(/[\s|,]+/).filter(Boolean)
      for (const name of names) {
        if (!seen.has(name) && CHORD_DB[name]) {
          seen.add(name)
          result.push(name)
        }
      }
    }
    return result
  }, [song, edits])

  if (!song || uniqueChords.length === 0) return null

  return (
    <>
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          padding: '8px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          borderTop: '1px solid var(--border)',
        }}
      >
        {uniqueChords.map(name => {
          const voicing = CHORD_DB[name][0]
          return (
            <div
              key={name}
              onClick={() => setPickerChord(name)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                {name}
              </span>
              <ChordDiagram voicing={voicing} size={80} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {voicing.l}
              </span>
            </div>
          )
        })}
      </div>

      {pickerChord && (
        <VoicingPicker chord={pickerChord} onClose={() => setPickerChord(null)} />
      )}
    </>
  )
}
