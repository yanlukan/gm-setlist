import type { SongChart } from '../../hooks/use-song-chart'
import { useStore } from '../../store/use-store'
import { EditBar } from '../edit/EditBar'
import { FormStrip } from './FormStrip'
import { SoundFact } from './SoundFact'

interface Props {
  chart: SongChart
  /** The list an extra song comes from, or null. */
  extraFrom: string | null
  screen: 'stage' | 'practice'
}

/**
 * One title line for both screens: the title and what changes the hands, then
 * the song order in letters, then the cue. On its side the same on one row
 * (stage.css). Nothing here is a button, except Done and Reset while editing.
 */
export function SongHeader({ chart, extraFrom, screen }: Props) {
  const { song, keyboard } = chart
  const editing = useStore(s => s.editMode) && screen === 'practice'
  return (
    <header className="song-head">
      <div className="song-row">
        <h1 className="song-title">{song.title}</h1>
        {extraFrom && <span className="tag-extra">Extra &middot; from {extraFrom}</span>}
        <span className="song-facts">
          <span className="fact">Key {chart.playedKey}</span>
          <span className="fact">{chart.bpm} BPM</span>
          <span className="fact">{song.timeSignature}</span>
          {/* On stage the sound is read at a glance; Practice has it in More */}
          {screen === 'stage' && !keyboard && <SoundFact title={song.title} />}
          {/* The capo is the guitarist's: the keyboard has none */}
          {chart.capo > 0 && !keyboard && <span className="fact is-warn">Capo {chart.capo}</span>}
          {chart.lowerKey && <span className="fact is-danger">LOWER KEY</span>}
          {screen === 'practice' && chart.edited && <span className="fact">EDITED</span>}
        </span>
        {editing && <EditBar song={song.title} />}
      </div>
      {chart.showForm && !editing && (
        <div className="song-row">
          <FormStrip form={chart.form} letters={chart.letters} short />
        </div>
      )}
      {song.cue && <div className="song-cue">{song.cue}</div>}
    </header>
  )
}
