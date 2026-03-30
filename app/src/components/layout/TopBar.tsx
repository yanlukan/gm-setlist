import { useState, useCallback, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { TapTempo } from '../shared/TapTempo'
import { Badge } from '../shared/Badge'

export function TopBar() {
  const editMode = useStore(s => s.editMode)
  const viewMode = useStore(s => s.viewMode)
  const theme = useStore(s => s.theme)
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const toggleTheme = useStore(s => s.toggleTheme)
  const toggleDiagrams = useStore(s => s.toggleDiagrams)
  const saveSections = useStore(s => s.saveSections)
  const saveKey = useStore(s => s.saveKey)
  const resetEdits = useStore(s => s.resetEdits)

  // Primitive selectors — no method calls in selectors
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)

  const [showSetlist, setShowSetlist] = useState(false)
  const [showTapTempo, setShowTapTempo] = useState(false)

  // Derive computed values in component
  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const setlistSongs = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return []
    return active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean) as typeof songs
  }, [allSongs, setlistData])

  const song = setlistSongs[currentIndex]
  const total = setlistSongs.length

  const currentKey = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.key !== undefined) return edits[song.title].key!
    return song.key ?? ''
  }, [song, edits])

  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const isTransposed = song ? currentKey !== song.key : false

  const transpose = useCallback(
    (semitones: number) => {
      if (!song || editMode) return
      const useFlats = shouldUseFlats(currentKey, semitones)
      const transposed = sections.map(section => ({
        name: section.name,
        chords: section.chords
          .split(/(\s+)/)
          .map(token =>
            token.trim() === '' ? token : transposeChord(token, semitones, useFlats),
          )
          .join(''),
      }))
      const newKey = transposeChord(currentKey, semitones, useFlats)
      saveSections(song.title, transposed)
      saveKey(song.title, newKey)
    },
    [song, currentKey, sections, saveSections, saveKey, editMode],
  )

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--badge-bg)',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  }

  const activeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#4a9eff',
    color: '#fff',
    borderColor: '#4a9eff',
  }

  const dangerBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#e53e3e',
    color: '#fff',
    borderColor: '#e53e3e',
  }

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '6px 8px',
          paddingTop: 'max(6px, env(safe-area-inset-top))',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Row 1: Action buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* Left group: Edit, Setlist, Chords */}
          <div style={groupStyle}>
            <button
              style={editMode ? activeBtnStyle : btnStyle}
              onClick={toggleEditMode}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
            <button style={btnStyle} onClick={() => setShowSetlist(true)}>
              Setlist
            </button>
            <button
              style={diagramsVisible ? activeBtnStyle : btnStyle}
              onClick={toggleDiagrams}
            >
              Chords
            </button>
            {editMode && song && (
              <button
                style={dangerBtnStyle}
                onClick={() => resetEdits(song.title)}
              >
                Reset
              </button>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right group: Transpose, Stage, Theme */}
          <div style={groupStyle}>
            <button
              style={{ ...btnStyle, opacity: editMode ? 0.4 : 1 }}
              disabled={editMode}
              onClick={() => transpose(-1)}
            >
              -
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Key</span>
            <button
              style={{ ...btnStyle, opacity: editMode ? 0.4 : 1 }}
              disabled={editMode}
              onClick={() => transpose(1)}
            >
              +
            </button>

            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

            <button
              style={viewMode === 'stage' ? activeBtnStyle : btnStyle}
              onClick={toggleViewMode}
            >
              {viewMode === 'stage' ? 'Exit' : 'Stage'}
            </button>
            <button style={btnStyle} onClick={toggleTheme}>
              {theme === 'dark' ? '\u2600' : '\u263D'}
            </button>
          </div>
        </div>

        {/* Row 2: Meta badges */}
        {song && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <Badge>
              Key: {currentKey}
              {isTransposed ? ` (orig ${song.key})` : ''}
            </Badge>
            <Badge>{song.bpm} BPM</Badge>
            <Badge>{song.timeSignature}</Badge>
            {song.capo != null && <Badge>Capo {song.capo}</Badge>}
            <span style={{ flex: 1 }} />
            <Badge style={{ color: 'var(--text-muted)' }}>
              {currentIndex + 1} / {total}
            </Badge>
          </div>
        )}
      </div>

      {showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
      <TapTempo open={showTapTempo} onClose={() => setShowTapTempo(false)} />
    </>
  )
}
