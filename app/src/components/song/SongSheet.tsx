import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { sectionColor } from '../../music/theory'
import { SongView } from './SongView'

export function SongSheet() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)

  const [showFullView, setShowFullView] = useState(false)

  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const setlistSongs = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return allSongs
    const mapped = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return mapped.length > 0 ? mapped : allSongs
  }, [allSongs, setlistData])

  const song = setlistSongs[currentIndex]

  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const notes = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.notes !== undefined) return edits[song.title].notes!
    return song.notes ?? ''
  }, [song, edits])

  if (!song) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
        No songs in setlist. Use Search to find songs.
      </div>
    )
  }

  const fontSize = sections.length > 10 ? 18 : sections.length > 6 ? 22 : 26

  // Full-screen song view with editing
  if (showFullView) {
    return (
      <SongView
        title={song.title}
        artist={song.artist}
        sections={sections}
        notes={notes}
        onClose={() => setShowFullView(false)}
        editable
        onSectionsChange={s => saveSections(song.title, s)}
        onNotesChange={n => saveNotes(song.title, n)}
      />
    )
  }

  // Compact setlist view — tap to open full view
  return (
    <div
      onClick={() => setShowFullView(true)}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        maxWidth: 700, margin: '0 auto', padding: '0 12px',
        overflow: 'auto', height: '100%',
        WebkitOverflowScrolling: 'touch', cursor: 'pointer',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0 4px', flexShrink: 0 }}>
        {song.title}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sections.map((section, i) => (
          <div key={`${song.title}-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{
              minWidth: 72, maxWidth: 90, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', color: sectionColor(section.name), flexShrink: 0,
            }}>{section.name}</div>
            <div style={{
              fontSize, fontWeight: 'bold', letterSpacing: 1, wordSpacing: 14, whiteSpace: 'pre-wrap',
            }}>{section.chords}</div>
          </div>
        ))}
      </div>

      {notes && (
        <div style={{
          fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)',
          borderTop: '1px solid var(--badge-bg)', paddingTop: 6, marginTop: 6,
        }}>{notes}</div>
      )}
    </div>
  )
}
