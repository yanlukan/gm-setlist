import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { CHORD_DB } from '../../data/chords-db'
import { ChordDiagram } from './ChordDiagram'
import { VoicingPicker } from './VoicingPicker'

export function DiagramsBar() {
  const currentSong = useStore(s => s.currentSong)
  const getEditedSections = useStore(s => s.getEditedSections)
  const [pickerChord, setPickerChord] = useState<string | null>(null)

  const song = currentSong()

  const uniqueChords = useMemo(() => {
    if (!song) return []
    const sections = getEditedSections(song.title)
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
  }, [song, getEditedSections])

  if (!song || uniqueChords.length === 0) return null

  return (
    <>
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          padding: '8px 0',
          WebkitOverflowScrolling: 'touch',
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
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                {name}
              </span>
              <ChordDiagram voicing={voicing} size={80} />
              <span style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
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
