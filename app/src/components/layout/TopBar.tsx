import { useState, useCallback } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { TapTempo } from '../shared/TapTempo'

export function TopBar() {
  const editMode = useStore(s => s.editMode)
  const viewMode = useStore(s => s.viewMode)
  const theme = useStore(s => s.theme)
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const toggleTheme = useStore(s => s.toggleTheme)
  const toggleDiagrams = useStore(s => s.toggleDiagrams)
  const currentSong = useStore(s => s.currentSong)
  const getCurrentKey = useStore(s => s.getCurrentKey)
  const getEditedSections = useStore(s => s.getEditedSections)
  const saveSections = useStore(s => s.saveSections)
  const saveKey = useStore(s => s.saveKey)
  const resetEdits = useStore(s => s.resetEdits)

  const [showSetlist, setShowSetlist] = useState(false)
  const [showTapTempo, setShowTapTempo] = useState(false)

  const transpose = useCallback(
    (semitones: number) => {
      const song = currentSong()
      if (!song || editMode) return
      const key = getCurrentKey(song.title)
      const useFlats = shouldUseFlats(key, semitones)
      const sections = getEditedSections(song.title).map(section => ({
        name: section.name,
        chords: section.chords
          .split(/(\s+)/)
          .map(token =>
            token.trim() === '' ? token : transposeChord(token, semitones, useFlats),
          )
          .join(''),
      }))
      const newKey = transposeChord(key, semitones, useFlats)
      saveSections(song.title, sections)
      saveKey(song.title, newKey)
    },
    [currentSong, getCurrentKey, getEditedSections, saveSections, saveKey, editMode],
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

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Edit / Done */}
        <button
          style={editMode ? activeBtnStyle : btnStyle}
          onClick={toggleEditMode}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>

        {/* Stage / Exit Stage */}
        <button
          style={viewMode === 'stage' ? activeBtnStyle : btnStyle}
          onClick={toggleViewMode}
        >
          {viewMode === 'stage' ? 'Exit Stage' : 'Stage'}
        </button>

        {/* Theme toggle */}
        <button style={btnStyle} onClick={toggleTheme}>
          {theme === 'dark' ? '\u2600' : '\u263D'}
        </button>

        {/* Reset (edit mode only) */}
        {editMode && currentSong() && (
          <button
            style={dangerBtnStyle}
            onClick={() => {
              const song = currentSong()
              if (song) resetEdits(song.title)
            }}
          >
            Reset
          </button>
        )}

        {/* Setlist */}
        <button style={btnStyle} onClick={() => setShowSetlist(true)}>
          Setlist
        </button>

        {/* Chords (diagrams toggle) */}
        <button
          style={diagramsVisible ? activeBtnStyle : btnStyle}
          onClick={toggleDiagrams}
        >
          Chords
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Transpose */}
        <button
          style={{
            ...btnStyle,
            opacity: editMode ? 0.4 : 1,
          }}
          disabled={editMode}
          onClick={() => transpose(-1)}
        >
          -
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Key</span>
        <button
          style={{
            ...btnStyle,
            opacity: editMode ? 0.4 : 1,
          }}
          disabled={editMode}
          onClick={() => transpose(1)}
        >
          +
        </button>
      </div>

      {showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
      <TapTempo open={showTapTempo} onClose={() => setShowTapTempo(false)} />
    </>
  )
}
