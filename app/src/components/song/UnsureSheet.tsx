import { useChartView } from '../../store/use-store'
import { simplifyRuleFor, simplifyText } from '../../music/chart-view'
import { SOURCE_LABEL, barChords, barsOfSection, type UnsureBar } from '../../music/evidence'
import { transposeInKey } from '../../music/theory'
import { settleBar } from '../../store/evidence'
import type { SongChart } from '../../hooks/use-song-chart'
import { Sheet } from '../sheets/Sheet'

interface Props {
  chart: SongChart
  unsure: UnsureBar
  onClose: () => void
}

const squash = (chords: string) => chords.split(/\s+/).filter(Boolean).join(' ')

/**
 * What each source says about a bar they disagree on, over the chart. A tap on
 * one settles the bar on those chords and closes the sheet.
 */
export function UnsureSheet({ chart, unsure, onClose }: Props) {
  const { song, songEdits, shift, sourceKey } = chart
  const view = useChartView()
  const rule = simplifyRuleFor(song, songEdits, view)
  // Stored chords are at the song's own pitch; the chart shows them shifted and, if asked, plain
  const shown = (chords: string) => {
    const moved = transposeInKey(chords, sourceKey, shift)
    return view.simple ? simplifyText(moved, rule) : moved
  }

  // What the chart reads in that bar now
  const section = (songEdits?.sections ?? song.sections)[unsure.section]
  const bar = section && barsOfSection(section.chords)[unsure.bar]
  const charted = bar ? barChords(bar) : unsure.evidence.chords
  const readings = unsure.evidence.readings ?? []
  const listed = readings.some(r => squash(r.chords) === squash(charted))

  const settle = (chords: string) => {
    settleBar(song.title, unsure.name, unsure.bar, chords)
    onClose()
  }

  return (
    <Sheet label={`Bar ${unsure.bar + 1} of ${unsure.name}`} onClose={onClose} className="unsure-sheet">
      <div className="tiles-head">
        <h2 className="tiles-title">Bar {unsure.bar + 1} of {unsure.name} &middot; the sources disagree</h2>
        <button className="sheet-action" onClick={onClose}>Close</button>
      </div>
      <p className="tiles-hint">Tap what you play. The bar changes to it and the mark goes.</p>
      <div className="unsure-readings">
        {!listed && (
          <button className="sheet-action" onClick={() => settle(charted)}>As charted: {shown(charted)}</button>
        )}
        {readings.map(reading => (
          <button key={`${reading.from}-${reading.chords}`} className="sheet-action" onClick={() => settle(reading.chords)}>
            {SOURCE_LABEL[reading.from]}: {shown(reading.chords)}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
