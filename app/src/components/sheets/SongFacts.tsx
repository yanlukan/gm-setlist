import { useChartView } from '../../store/use-store'
import { guitarFor } from '../../music/chart-view'
import { chordsFromText } from '../../music/evidence'
import { songbookOf } from '../../music/songbook'
import { recordCheckOf, recordCheckText } from '../../music/record-check'
import type { SongChart } from '../../hooks/use-song-chart'
import { soundFor } from '../../music/gx10'
import { unsettleSong } from '../../store/evidence'
import { SoundFact } from '../song/SoundFact'

/** What is known of the song: its GX-10 sound, the songbook, the key and the capo, the cue and the notes. */
export function SongFacts({ chart }: { chart: SongChart }) {
  const { song, songEdits, keyboard, capo } = chart
  const view = useChartView()
  const book = songbookOf(song)
  const guitar = guitarFor(song, songEdits, view)
  const chordsFrom = chordsFromText(song, songEdits)
  const recordCheck = recordCheckOf(song.title)

  return (
    <div className="song-facts-list">
      <dl>
        {/* The sound is the guitarist's, and only songs in the gig set have one */}
        {!keyboard && soundFor(song.title) && (
          <>
            <dt>Sound</dt>
            <dd><SoundFact title={song.title} /></dd>
          </>
        )}
        <dt>Songbook</dt>
        <dd>{book !== undefined ? `George Michael Complete, no. ${book}` : 'Not in the songbook'}</dd>
        {chordsFrom && (
          <>
            <dt>Chords</dt>
            <dd>
              {chordsFrom}
              {songEdits?.heard && Object.keys(songEdits.heard).length > 0 && (
                <div>
                  <button className="sheet-action" onClick={() => unsettleSong(song.title)}>Mark settled bars unsure again</button>
                </div>
              )}
            </dd>
          </>
        )}
        {recordCheck && (
          <>
            <dt>Record check</dt>
            <dd>{recordCheckText(recordCheck)}</dd>
          </>
        )}
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
    </div>
  )
}
