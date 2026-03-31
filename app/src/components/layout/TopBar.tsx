import { useState, useCallback, useMemo, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { exportAllData, importAllData } from '../../store/persistence'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { ChordSearch } from '../search/ChordSearch'
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
  const [showSearch, setShowSearch] = useState(false)
  const [showTapTempo, setShowTapTempo] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hydrate = useStore(s => s.hydrate)

  const handleExport = async () => {
    const json = await exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `playbook-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowMenu(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = await file.text()
      await importAllData(json)
      await hydrate()
      setShowMenu(false)
      alert('Data imported successfully. Page will reload.')
      location.reload()
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
    e.target.value = ''
  }

  // Derive computed values in component
  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const setlistSongs = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return allSongs
    const mapped = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean) as typeof songs
    return mapped
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
        {/* Action buttons — single row, fits phone screen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={editMode ? activeBtnStyle : btnStyle} onClick={toggleEditMode}>
            {editMode ? 'Done' : 'Edit'}
          </button>
          {editMode && song && (
            <button style={dangerBtnStyle} onClick={() => resetEdits(song.title)}>Reset</button>
          )}
          {!editMode && (
            <>
              <button style={btnStyle} onClick={() => setShowSetlist(true)}>Setlist</button>
              <button style={btnStyle} onClick={() => setShowSearch(true)}>Search</button>
            </>
          )}

          <div style={{ flex: 1 }} />

          {!editMode && (
            <div style={groupStyle}>
              <button style={{ ...btnStyle, fontSize: 15 }} onClick={() => transpose(-1)}>-</button>
              <button style={{ ...btnStyle, fontSize: 15 }} onClick={() => transpose(1)}>+</button>
            </div>
          )}

          {/* Menu — contains Stage, Theme, Chords, Export/Import */}
          <div style={{ position: 'relative' }}>
            <button style={btnStyle} onClick={() => setShowMenu(!showMenu)}>&#8942;</button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--picker-bg, #2a2a2a)', borderRadius: 8,
                border: '1px solid var(--badge-bg)', zIndex: 300,
                minWidth: 180, overflow: 'hidden',
              }}>
                <button onClick={() => { toggleViewMode(); setShowMenu(false) }} style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  fontSize: 14, textAlign: 'left', color: 'var(--text)',
                  background: 'transparent', borderBottom: '1px solid var(--badge-bg)',
                }}>
                  {viewMode === 'stage' ? 'Exit Stage Mode' : 'Stage Mode'}
                </button>
                <button onClick={() => { toggleDiagrams(); setShowMenu(false) }} style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  fontSize: 14, textAlign: 'left', color: 'var(--text)',
                  background: 'transparent', borderBottom: '1px solid var(--badge-bg)',
                }}>
                  {diagramsVisible ? 'Hide Chord Diagrams' : 'Show Chord Diagrams'}
                </button>
                <button onClick={() => { toggleTheme(); setShowMenu(false) }} style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  fontSize: 14, textAlign: 'left', color: 'var(--text)',
                  background: 'transparent', borderBottom: '1px solid var(--badge-bg)',
                }}>
                  {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </button>
                <button onClick={handleExport} style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  fontSize: 14, textAlign: 'left', color: 'var(--text)',
                  background: 'transparent', borderBottom: '1px solid var(--badge-bg)',
                }}>
                  Export Backup
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  display: 'block', width: '100%', padding: '12px 14px',
                  fontSize: 14, textAlign: 'left', color: 'var(--text)',
                  background: 'transparent',
                }}>
                  Import Backup
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </div>
            )}
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
            <Badge style={{ cursor: 'pointer' }} onClick={() => setShowTapTempo(true)}>{song.bpm} BPM</Badge>
            <Badge>{song.timeSignature}</Badge>
            {song.capo != null && <Badge>Capo {song.capo}</Badge>}
            <span style={{ flex: 1 }} />
            <Badge style={{ color: 'var(--text-muted)' }}>
              {currentIndex + 1} / {total}
            </Badge>
          </div>
        )}
      </div>

      {showMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
          onClick={() => setShowMenu(false)}
        />
      )}
      {showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
      {showSearch && <ChordSearch onClose={() => setShowSearch(false)} />}
      <TapTempo open={showTapTempo} onClose={() => setShowTapTempo(false)} />
    </>
  )
}
