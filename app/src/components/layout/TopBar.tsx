import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { transposeFor } from '../../music/setlist-text'
import { shouldUseFlats, transposeChord } from '../../music/theory'
import { exportAllData, importAllData, takeSnapshot } from '../../store/persistence'
import { APP_VERSION, BUILD_TIME } from '../../version'
import { RestoreModal } from '../shared/RestoreModal'
import { SaveStatus } from '../edit/SaveStatus'
import { shareFile } from '../../utils/share'
import { SetlistScreen } from '../setlist/SetlistScreen'
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
  const clearTranspose = useStore(s => s.clearTranspose)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const hydrate = useStore(s => s.hydrate)
  const showToast = useStore(s => s.showToast)

  // Primitive selectors — no method calls in selectors
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)

  const [showSetlist, setShowSetlist] = useState(false)
  const [showTapTempo, setShowTapTempo] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // iOS only opens the share sheet straight from a tap, so the backup is
  // prepared when the menu opens and is ready the moment Export is tapped.
  const backupJson = useRef<string | null>(null)
  useEffect(() => {
    if (!showMenu) return
    backupJson.current = null
    exportAllData().then(json => { backupJson.current = json }).catch(() => {})
  }, [showMenu])

  const handleExport = async () => {
    setShowMenu(false)
    try {
      const json = backupJson.current ?? (await exportAllData())
      const name = `playbook-backup-${new Date().toISOString().slice(0, 10)}.json`
      const outcome = await shareFile(new File([json], name, { type: 'application/json' }))
      if (outcome === 'downloaded') showToast('Backup downloaded')
    } catch {
      showToast('Could not create the backup')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = await file.text()
      // Importing replaces everything, so keep a way back first.
      await takeSnapshot('before import')
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

  const semitones = song ? transposeFor(song, edits[song.title]) : 0
  // Tap Tempo saves into edits; show that, not the tempo in the song data.
  const bpm = song ? (edits[song.title]?.bpm ?? song.bpm) : 0

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

  // The middle button: from your own transpose back to the band key; from the
  // band key to the original recording key and back again (for playing along).
  const bandKey = song?.transpose ?? 0
  const ownTranspose = song ? edits[song.title]?.transpose : undefined
  const transposeButtonLabel = ownTranspose !== undefined
    ? (bandKey !== 0 ? 'Back to band key' : 'Clear transpose')
    : (bandKey !== 0 ? 'Show original key' : 'Transpose')

  const onTransposeButton = useCallback(() => {
    if (!song) return
    if (ownTranspose !== undefined && !(ownTranspose === 0 && bandKey === 0)) {
      clearTranspose(song.title)
    } else if (bandKey !== 0) {
      setTranspose(song.title, 0)
    }
  }, [song, ownTranspose, bandKey, clearTranspose, setTranspose])

  const menuAction = (fn: () => void) => () => {
    fn()
    setShowMenu(false)
  }

  return (
    <>
      <div className="topbar">
        <div className="tb-group">
          {viewMode === 'stage' ? (
            // Stage Mode: the chart is locked — no Edit, no setlist changes.
            <button className="tb-btn is-active" onClick={toggleViewMode} aria-label="Exit Stage Mode">
              &#9679; Stage
            </button>
          ) : (
            <>
              <button className={editMode ? 'tb-btn is-active' : 'tb-btn'} onClick={toggleEditMode}>
                {editMode ? 'Done' : 'Edit'}
              </button>
              {editMode && song && (
                <button
                  className="tb-btn is-danger"
                  onClick={() => {
                    if (confirm(`Reset "${song.title}" to the original chart?\n\nYour version is kept under Earlier versions, at the bottom of the chart.`)) {
                      resetEdits(song.title)
                    }
                  }}
                >
                  Reset
                </button>
              )}
              {editMode && <SaveStatus />}
              {!editMode && (
                <>
                  <button className="tb-btn" onClick={() => setShowSetlist(true)}>Setlists</button>
                  <button className="tb-btn" onClick={toggleViewMode} aria-label="Enter Stage Mode">Stage</button>
                </>
              )}
            </>
          )}
        </div>

        {/* On phones the bar breaks here: song info starts the second row */}
        <div className="tb-break" aria-hidden="true" />

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
              <button className="tb-badge" onClick={() => setShowTapTempo(true)} aria-label="Tap tempo">{bpm} BPM</button>
              <span className="tb-badge">{song.timeSignature}</span>
              {song.capo != null && <span className="tb-badge">Capo {song.capo}</span>}
            </>
          )}
        </div>

        <div className="tb-group tb-transpose">
          <button className="tb-btn" onClick={() => transpose(-1)} aria-label="Transpose down">&minus;</button>
          <button
            className={semitones !== 0 ? 'tb-btn tb-num is-warn' : 'tb-btn tb-num'}
            onClick={onTransposeButton}
            aria-label={transposeButtonLabel}
          >
            {semitones > 0 ? `+${semitones}` : semitones}
          </button>
          <button className="tb-btn" onClick={() => transpose(1)} aria-label="Transpose up">+</button>
        </div>

        <div className="tb-group tb-menu">
          <div style={{ position: 'relative' }}>
            <button className="tb-btn" onClick={() => setShowMenu(!showMenu)} aria-label="Menu">&#8942;</button>
            {showMenu && (
              <div className="menu">
                <button className="menu-item" onClick={menuAction(toggleDiagrams)}>
                  {diagramsVisible ? 'Hide Chord Diagrams' : 'Show Chord Diagrams'}
                </button>
                <button className="menu-item" onClick={menuAction(toggleTheme)}>
                  {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </button>
                <button className="menu-item" onClick={handleExport}>Export Backup</button>
                {viewMode !== 'stage' && (
                  <>
                    <button className="menu-item" onClick={menuAction(() => fileInputRef.current?.click())}>Import Backup</button>
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
                  </>
                )}
                <div className="menu-foot">
                  PlayBook v{APP_VERSION} &middot; built {BUILD_TIME.slice(0, 16).replace('T', ' ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lives outside the menu so it still receives the file if the menu closes */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowMenu(false)} />
      )}
      {showSetlist && <SetlistScreen onClose={() => setShowSetlist(false)} />}
      <TapTempo open={showTapTempo} onClose={() => setShowTapTempo(false)} />
      {showRestore && <RestoreModal onClose={() => setShowRestore(false)} />}
    </>
  )
}
