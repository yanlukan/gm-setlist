import type { SongChart } from '../../hooks/use-song-chart'
import { FormStrip } from '../song/FormStrip'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
}

/**
 * Only what is needed while playing. Upright: the title and the facts, then
 * the song order in letters, then the cue. On its side the same on one row
 * (stage.css). Nothing here is a button.
 */
export function StageHeader({ chart, extraFrom }: Props) {
  const { song, keyboard } = chart
  return (
    <header className="stage-head">
      <div className="stage-row">
        <h1 className="stage-title">{song.title}</h1>
        {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
        <span className="stage-facts">
          <span className="fact">Key {chart.playedKey}</span>
          <span className="fact">{chart.bpm} BPM</span>
          <span className="fact">{song.timeSignature}</span>
          {/* The GX-10 sound and the capo are the guitarist's: the keyboard has neither */}
          {song.preset && !keyboard && (
            <span
              className="fact"
              aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
            >
              {song.preset.slot} {song.preset.name}
              {song.preset.solo && ` → ${song.preset.solo} solo`}
            </span>
          )}
          {chart.capo > 0 && !keyboard && <span className="fact is-warn">Capo {chart.capo}</span>}
          {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
        </span>
      </div>
      {chart.showForm && (
        <div className="stage-row">
          <FormStrip form={chart.form} letters={chart.letters} short />
        </div>
      )}
      {song.cue && <div className="stage-cue">{song.cue}</div>}
    </header>
  )
}
