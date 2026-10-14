import { useChartView } from '../../store/use-store'
import { guitarFor } from '../../music/chart-view'
import { songbookOf } from '../../music/songbook'
import type { SongChart } from '../../hooks/use-song-chart'

/** What the songbook and the song's notes say, under the shapes. */
export function BookFacts({ chart }: { chart: SongChart }) {
  const { song, songEdits, keyboard, capo } = chart
  const view = useChartView()
  const book = songbookOf(song)
  const guitar = guitarFor(song, songEdits, view)

  return (
    <section className="book-facts" aria-label="From the book and the notes">
      <h2 className="tiles-title">From the book and the notes</h2>
      <dl>
        <dt>Songbook</dt>
        <dd>{book !== undefined ? `George Michael Complete, no. ${book}` : 'Not in the songbook'}</dd>
        {!keyboard && (
          <>
            <dt>Shapes</dt>
            <dd>{song.shapesFrom ?? `Recommended for ${guitar} guitar`}</dd>
          </>
        )}
        <dt>Key</dt>
        <dd>
          {chart.playedKey}
          {song.lowerKey && (chart.lowerKey ? ' · LOWER KEY: the band plays it lower, set the key with − and +' : ' · the band plays it lower')}
          {capo > 0 && !keyboard && (
            <div className="facts-capo">Capo {capo}: play {chart.shapesKey} shapes, sounds in {chart.playedKey}</div>
          )}
        </dd>
        {song.cue && (
          <>
            <dt>Cue</dt>
            <dd>{song.cue}</dd>
          </>
        )}
      </dl>
      {chart.notes && <p className="chart-notes">{chart.notes}</p>}
    </section>
  )
}
