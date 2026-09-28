import { useState, useCallback, useMemo, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { exportAllData, importAllData } from '../../store/persistence'
import { APP_VERSION, BUILD_TIME } from '../../version'
import { RestoreModal } from '../shared/RestoreModal'
import { SetlistScreen } from '../setlist/SetlistScreen'
import { ChordSearch } from '../search/ChordSearch'
import { TapTempo } from '../shared/TapTempo'
import type { Song } from '../../types'

export function TopBar() {
  const editMode = useStore(s => s.editMode)
  const viewMode = useStore(s => s.viewMode)
  const theme = useStore(s => s.theme)
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const toggleTheme = useStore(s => s.toggleTheme)
  const toggleDiagrams = useStore(s => s.toggleDiagrams)
  const resetEdits = useStore(s => s.resetEdits)
  const setTranspose = useStore(s => s.setTranspose)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const hydrate = useStore(s => s.hydrate)

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
  const [showRestore, setShowRestore] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const setlistSongs = useMemo(() => {
    const all = [...songs, ...customSongs]
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return []
    return active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter((s): s is Song => s !== undefined)
  }, [songs, customSongs, setlistData])

  const song = setlistSongs[currentIndex]

  const currentKey = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.key !== undefined) return edits[song.title].key!
    return song.key ?? ''
  }, [song, edits])

  const semitones = song ? (edits[song.title]?.transpose ?? 0) : 0

  // Transposing only changes an offset. The stored chart stays at source
  // pitch, so any amount of transposing is reversible and nothing is lost.
  const displayKey = useMemo(() => {
    if (!semitones || !currentKey) return currentKey
    return transposeChord(currentKey, semitones, shouldUseFlats(currentKey, semitones))
  }, [currentKey, semitones])

  const transpose = useCallback(
    (delta: number) => {
      if (song) setTranspose(song.title, semitones + delta)
    },
    [song, semitones, setTranspose],
  )

  const clearTranspose = useCallback(() => {
    if (song) setTranspose(song.title, 0)
  }, [song, setTranspose])

  const menuAction = (fn: () => void) => () => {
    fn()
    setShowMenu(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="tb-group">
          <button className={editMode ? 'tb-btn is-active' : 'tb-btn'} onClick={toggleEditMode}>
            {editMode ? 'Done' : 'Edit'}
          </button>
          {editMode && song && (
            <button
              className="tb-btn is-danger"
              onClick={() => {
                if (confirm(`Reset "${song.title}" to the original chart? Your edits to it will be removed.`)) {
                  resetEdits(song.title)
                }
              }}
            >
              Reset
            </button>
          )}
          {!editMode && (
            <>
              <button className="tb-btn" onClick={() => setShowSetlist(true)}>Setlists</button>
              <button className="tb-btn" onClick={() => setShowSearch(true)}>Search</button>
            </>
          )}
        </div>

        {/* Song info: sits between the buttons on iPad, drops to its own row on phones */}
        <div className="tb-meta">
          {song && (
            <>
              <span className={semitones !== 0 ? 'tb-badge is-warn' : 'tb-badge'}>
                Key {displayKey}
                {semitones !== 0 ? ` (orig ${currentKey})` : ''}
              </span>
              {song.lowerKey && semitones === 0 && (
                <span className="tb-badge is-danger">LOWER KEY — set transpose</span>
              )}
              <button className="tb-badge" onClick={() => setShowTapTempo(true)}>{song.bpm} BPM</button>
              <span className="tb-badge">{song.timeSignature}</span>
              {song.capo != null && <span className="tb-badge">Capo {song.capo}</span>}
            </>
          )}
        </div>

        <div className="tb-group">
          <button className="tb-btn" onClick={() => transpose(-1)} aria-label="Transpose down">&minus;</button>
          <button
            className={semitones !== 0 ? 'tb-btn tb-num is-warn' : 'tb-btn tb-num'}
            onClick={clearTranspose}
            aria-label={semitones ? 'Clear transpose' : 'Transpose'}
          >
            {semitones > 0 ? `+${semitones}` : semitones}
          </button>
          <button className="tb-btn" onClick={() => transpose(1)} aria-label="Transpose up">+</button>

          <div style={{ position: 'relative' }}>
            <button className="tb-btn" onClick={() => setShowMenu(!showMenu)} aria-label="Menu">&#8942;</button>
            {showMenu && (
              <div className="menu">
                <button className="menu-item" onClick={menuAction(toggleViewMode)}>
                  {viewMode === 'stage' ? 'Exit Stage Mode' : 'Stage Mode'}
                </button>
                <button className="menu-item" onClick={menuAction(toggleDiagrams)}>
                  {diagramsVisible ? 'Hide Chord Diagrams' : 'Show Chord Diagrams'}
                </button>
                <button className="menu-item" onClick={menuAction(toggleTheme)}>
                  {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </button>
                <button className="menu-item" onClick={handleExport}>Export Backup</button>
                <button className="menu-item" onClick={() => fileInputRef.current?.click()}>Import Backup</button>
                <button className="menu-item" onClick={menuAction(() => setShowRestore(true))}>
                  Restore a Backup&hellip;
                </button>
                <button
                  className="menu-item"
                  onClick={menuAction(() => {
                    if (confirm('Rebuild this setlist as the printed GM Tribute running order? A restore point is saved first.')) {
                      restoreGigOrder()
                    }
                  })}
                >
                  Restore GM Tribute Order
                </button>
                <div className="menu-foot">
                  PlayBook v{APP_VERSION} &middot; built {BUILD_TIME.slice(0, 16).replace('T', ' ')}
                </div>
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
      </div>

      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowMenu(false)} />
      )}
      {showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
      {showSearch && <ChordSearch onClose={() => setShowSearch(false)} />}
      <TapTempo open={showTapTempo} onClose={() => setShowTapTempo(false)} />
      {showRestore && <RestoreModal onClose={() => setShowRestore(false)} />}
    </>
  )
}
