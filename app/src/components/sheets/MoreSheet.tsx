import { useRef, useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useBackup } from '../../hooks/use-backup'
import { hasEditedChart } from '../../music/chart-edits'
import { APP_VERSION, BUILD_TIME } from '../../version'
import { RestoreModal } from '../shared/RestoreModal'
import { SavedChartsModal } from '../edit/SavedChartsModal'
import { Sheet } from './Sheet'

/**
 * On an iPad the home-screen app and Safari are two copies of PlayBook, each
 * with its own saved charts. Saying which one this is stops them being mixed up.
 */
function copyName(): string {
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
  return installed ? 'home-screen app' : 'browser copy'
}

/** The app's settings, on Practice only. The one thing about a single song is going back to its original chart. */
export function MoreSheet({ onClose }: { onClose: () => void }) {
  const { song } = useShownSong()
  const edits = useStore(s => s.edits)
  const instrument = useStore(s => s.instrument)
  const setInstrument = useStore(s => s.setInstrument)
  const simpleChords = useStore(s => s.simpleChords)
  const toggleSimpleChords = useStore(s => s.toggleSimpleChords)
  const guitar = useStore(s => s.guitar)
  const setGuitar = useStore(s => s.setGuitar)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  // Songs that show chords saved on this device instead of the built-in chart
  const savedCharts = useStore(s => s.allSongs().filter(one => hasEditedChart(one, s.edits[one.title])).length)
  const { exportBackup, importBackup } = useBackup()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<'restore' | 'saved' | null>(null)

  const edited = !!song && hasEditedChart(song, edits[song.title])
  const backToOriginal = () => {
    if (!song) return
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  return (
    <>
      <Sheet label="More" onClose={onClose} className="more-sheet">
        <section className="more-group">
          <h3 className="more-title">This song</h3>
          <button className="more-item" disabled={!edited} onClick={backToOriginal}>Back to the original chart</button>
        </section>

        <section className="more-group">
          <h3 className="more-title">How charts look</h3>
          {/* Who is reading: the keyboard player gets chords as they sound, and nothing about guitars */}
          <button className="more-item" onClick={() => setInstrument(instrument === 'guitar' ? 'keyboard' : 'guitar')}>
            Instrument: {instrument}
          </button>
          <button className="more-item" aria-pressed={simpleChords} onClick={toggleSimpleChords}>Simplify chords</button>
          {/* Each song's own guitar, then electric for all, then acoustic for all */}
          {instrument === 'guitar' && (
            <button
              className="more-item"
              onClick={() => setGuitar(guitar === 'auto' ? 'electric' : guitar === 'electric' ? 'acoustic' : 'auto')}
            >
              {guitar === 'auto'
                ? 'Guitar: each song its own'
                : guitar === 'electric' ? 'Guitar: electric for all songs' : 'Guitar: acoustic for all songs'}
            </button>
          )}
          <button className="more-item" aria-pressed={theme === 'light'} onClick={toggleTheme}>Light theme</button>
        </section>

        <section className="more-group">
          <h3 className="more-title">Setlists and backups</h3>
          <button
            className="more-item"
            onClick={() => {
              if (confirm('Rebuild this setlist as the printed GM Tribute running order? A restore point is saved first.')) restoreGigOrder()
            }}
          >
            Restore the GM Tribute order
          </button>
          <button className="more-item" onClick={exportBackup}>Export a backup</button>
          <button className="more-item" onClick={() => fileInputRef.current?.click()}>Import a backup</button>
          <button className="more-item" onClick={() => setDialog('restore')}>Restore a backup&hellip;</button>
          <button className="more-item" onClick={() => setDialog('saved')}>
            Back to all the original charts{savedCharts > 0 ? ` (${savedCharts})` : ''}
          </button>
        </section>

        <p className="more-foot">
          PlayBook v{APP_VERSION} &middot; {copyName()} &middot; built {BUILD_TIME.slice(0, 16).replace('T', ' ')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) importBackup(file)
            e.target.value = ''
          }}
        />
      </Sheet>
      {/* Over the sheet, which stays open beneath them */}
      {dialog === 'restore' && <RestoreModal onClose={() => setDialog(null)} />}
      {dialog === 'saved' && <SavedChartsModal onClose={() => setDialog(null)} />}
    </>
  )
}
