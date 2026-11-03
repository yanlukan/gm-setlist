import { useStore } from '../../store/use-store'
import { strum } from '../../music/sound'
import { isPlayersShape, ownShapesFor, shapeText, voicingsFor } from '../../music/voicings'
import { shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import { clearSongShape, pickSongShape } from '../../store/song-shapes'
import type { SongChart } from '../../hooks/use-song-chart'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { Sheet } from '../sheets/Sheet'

interface Props {
  chart: SongChart
  /** The chord tapped on the chart. */
  chord: string
  onClose: () => void
}

/**
 * Every shape of the tapped chord, over the chart. The one used in this song
 * is marked; a tap makes another one this song's shape and closes the sheet.
 */
export function ChordShapesSheet({ chart, chord, onClose }: Props) {
  const { song, songEdits, capo } = chart
  const selectedVoicings = useStore(s => s.selectedVoicings)
  // Read so the tiles follow a shape the player writes or removes
  useStore(s => s.ownShapes)
  const clearVoicing = useStore(s => s.clearVoicing)
  const { picks: band } = useBandPositions(song, songEdits)
  // A shape picked by hand wins; otherwise the song's band shape
  const chosen = shapeChoice(chord, songEdits, selectedVoicings, band[chord])

  const voicings = voicingsFor(chord)
  const own = ownShapesFor(chord)
  const listed = voicings.map((voicing, index) => ({ voicing, index })).filter(({ voicing }) => !voicing.wrong)

  const useRecommended = () => {
    if (songEdits?.shapes?.[chord] !== undefined) clearSongShape(song.title, chord)
    else clearVoicing(chord)
    onClose()
  }
  // Picking a shape settles it: back to the chart
  const chooseShape = (shape: number | string) => {
    pickSongShape(song.title, chord, shape)
    onClose()
  }

  return (
    <Sheet label={`Shapes for ${chord}`} onClose={onClose} className="shapes-sheet">
      <div className="tiles-head">
        <h2 className="tiles-title">Shapes for {chord} &middot; {listed.length} of them</h2>
      </div>
      <p className="tiles-hint">
        The recommended shape suits this song's sound and sits with its other chords. A shape you tap is used for {chord} in this song only.
      </p>
      {chosen.mine && (
        <button className="sheet-action" onClick={useRecommended}>Use the recommended shape</button>
      )}
      <div className="tiles" role="group" aria-label={`Shapes for ${chord}`}>
        {listed.map(({ voicing, index }) => {
          const text = shapeText(voicing)
          const yours = isPlayersShape(chord, text)
          const inSong = index === chosen.index
          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className={inSong ? 'tile is-chosen' : 'tile'}
              aria-label={`${chord} at ${voicing.l}${yours ? ', yours' : ''}${index === band[chord] ? ', recommended' : ''}${inSong ? ', selected' : ''}`}
              // A shape the player wrote is picked by its text: it keeps meaning the same shape as the list changes
              onClick={() => chooseShape(own.includes(text) ? text : index)}
            >
              <ChordDiagram voicing={voicing} size={112} />
              <span className="tile-where">{voicing.l}</span>
              <span className="tile-frets">{text}</span>
              {inSong && <span className="diagram-mark is-recommended">In this song</span>}
              {yours && <span className="diagram-mark is-own">Yours</span>}
              <button
                type="button"
                className="diagram-play"
                aria-label={`Play ${chord} at ${voicing.l}`}
                onClick={e => {
                  e.stopPropagation()
                  strum(voicing, capo)
                }}
              >
                &#9654;
              </button>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
