import { useStore } from '../../store/use-store'
import { songbookOf } from '../../music/songbook'
import type { SongChart } from '../../hooks/use-song-chart'
import { FormStrip } from '../song/FormStrip'
import { PracticeSetup } from './PracticeSetup'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
}

/**
 * Practice's header. Upright, four rows: the title, the setup, the facts, the
 * song order. On its side two (practice.css): title and setup, then facts and order.
 */
export function PracticeHeader({ chart, extraFrom }: Props) {
  const { song, keyboard } = chart
  const editMode = useStore(s => s.editMode)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const book = songbookOf(song)

  const goBackToOriginal = () => {
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  return (
    <header className="practice-head">
      <div className="ph-line">
        <div className="ph-row">
          <h1 className="ph-title">{song.title}</h1>
          <span className="ph-artist">{song.artist}</span>
          {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
          {book !== undefined && <span className="ph-badge">Songbook no. {book}</span>}
          {/* While editing, Reset and the earlier versions are where to go back from */}
          {chart.edited && !editMode && (
            <button
              type="button"
              className="chart-edited"
              aria-label="This chart has your own edits. Go back to the original chart"
              onClick={goBackToOriginal}
            >
              EDITED &middot; back to original
            </button>
          )}
        </div>
        <PracticeSetup chart={chart} />
      </div>
      <div className="ph-line">
        <div className="ph-row">
          <span className="fact">{chart.bpm} BPM</span>
          <span className="fact">{song.timeSignature}</span>
          {song.preset && !keyboard && (
            <span
              className="fact"
              aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
            >
              {song.preset.slot} {song.preset.name}
              {song.preset.solo && ` → ${song.preset.solo} solo`}
            </span>
          )}
          {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
        </div>
        {/* While editing, the editor has the song order: two would read as a mistake */}
        {chart.showForm && !editMode && <FormStrip form={chart.form} letters={chart.letters} />}
      </div>
    </header>
  )
}
