import { useStore } from '../../store/use-store'
import { songbookOf } from '../../music/songbook'
import type { SongChart } from '../../hooks/use-song-chart'
import { SoundFact } from '../song/SoundFact'
import { PracticeSetup } from './PracticeSetup'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
}

/**
 * Practice's header, two rows: the title with the facts, then the setup.
 * On its side they share a line when they fit. The song order is in the panel.
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
      <div className="ph-row">
        <h1 className="ph-title">{song.title}</h1>
        <span className="ph-artist">{song.artist}</span>
        {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
        {book !== undefined && <span className="ph-badge" aria-label={`Songbook no. ${book}`}>Book {book}</span>}
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
        <span className="fact">{chart.bpm} BPM</span>
        <span className="fact">{song.timeSignature}</span>
        {!keyboard && <SoundFact title={song.title} />}
        {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
      </div>
      <PracticeSetup chart={chart} />
    </header>
  )
}
