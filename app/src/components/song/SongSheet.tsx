import type { CSSProperties } from 'react'
import { useStore } from '../../store/use-store'
import { useAutoScale } from '../../hooks/use-auto-scale'
import { SectionRow } from './SectionRow'
import { Badge } from '../shared/Badge'

export function SongSheet() {
  const currentSong = useStore(s => s.currentSong)
  const getEditedSections = useStore(s => s.getEditedSections)
  const getEditedNotes = useStore(s => s.getEditedNotes)
  const getCurrentKey = useStore(s => s.getCurrentKey)
  const currentIndex = useStore(s => s.currentIndex)
  const setlistSongs = useStore(s => s.setlistSongs)
  const editMode = useStore(s => s.editMode)

  const song = currentSong()
  if (!song) return null

  const sections = getEditedSections(song.title)
  const notes = getEditedNotes(song.title)
  const currentKey = getCurrentKey(song.title)
  const total = setlistSongs().length
  const isTransposed = currentKey !== song.key

  const [chordRef, fontSize] = useAutoScale(
    [sections, currentKey],
  )

  const titleStyle: CSSProperties = {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 0,
  }

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  }

  const chordAreaStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: editMode ? 'flex-start' : 'center',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
    marginTop: 12,
  }

  const notesStyle: CSSProperties = {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border)',
    paddingTop: 8,
    marginTop: 12,
  }

  const positionBadgeStyle: CSSProperties = {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={titleStyle}>{song.title}</h1>

      <div style={metaRowStyle}>
        <Badge>
          Key: {currentKey}
          {isTransposed ? ` (orig ${song.key})` : ''}
        </Badge>
        <Badge>{song.bpm} BPM</Badge>
        <Badge>{song.timeSignature}</Badge>
        {song.capo != null && <Badge>Capo {song.capo}</Badge>}
        <Badge style={positionBadgeStyle}>
          {currentIndex + 1} / {total}
        </Badge>
      </div>

      <div ref={chordRef} style={chordAreaStyle}>
        {sections.map((section, i) => (
          <SectionRow
            key={`${section.name}-${i}`}
            name={section.name}
            chords={section.chords}
            fontSize={fontSize}
          />
        ))}
      </div>

      {notes ? <div style={notesStyle}>{notes}</div> : null}
    </div>
  )
}
