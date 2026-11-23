import { useMemo } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { shownSections } from '../../music/chart-view'
import { parseChordText } from '../../music/chord-text'
import { isChartMark } from '../../music/theory'
import { hasShapes, voicingsFor } from '../../music/voicings'
import { shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import type { SongChart } from '../../hooks/use-song-chart'
import { ChordDiagram } from '../diagrams/ChordDiagram'

interface Props {
  chart: SongChart
  /** The chord whose shapes are open over the chart, drawn as picked. */
  picked: string | null
  onPick: (chord: string) => void
}

/**
 * The song's chord shapes, in one row under Practice's chart: every chord
 * once, in the order it first comes, drawn in the shape used in this song
 * (the player's pick, or the recommended one). A tap opens all the shapes of
 * that chord. The bar above the row puts it away and brings it back; the
 * choice is saved. The rework had left the shapes behind a tap on a chord,
 * and the player asked where they had gone (2026-11-23).
 */
export function ShapesRow({ chart, picked, onPick }: Props) {
  const { song, songEdits } = chart
  const view = useChartView()
  const shown = useStore(s => s.shapesRow)
  const toggle = useStore(s => s.toggleShapesRow)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  // Read so the row follows a shape the player writes or removes
  useStore(s => s.ownShapes)
  const { picks: band } = useBandPositions(song, songEdits)

  // The chords as the chart names them: band key, less any capo, plain if asked for
  const chords = useMemo(() => {
    const names = shownSections(song, songEdits, view).flatMap(section => parseChordText(section.chords).flat())
    return [...new Set(names)].filter(name => !isChartMark(name) && hasShapes(name))
  }, [song, songEdits, view])

  if (chords.length === 0) return null

  return (
    <section className={shown ? 'shapes-row-wrap' : 'shapes-row-wrap is-away'}>
      <button
        type="button"
        className="shapes-row-handle"
        aria-expanded={shown}
        aria-label={shown ? 'Hide the chord shapes' : 'Show the chord shapes'}
        onClick={toggle}
      >
        <span className="shapes-row-grip" aria-hidden="true" />
        <span className="shapes-row-word" aria-hidden="true">{shown ? 'Hide shapes' : 'Show shapes'}</span>
      </button>
      {shown && (
        <div className="shapes-row" role="list" aria-label="Chord shapes">
          {chords.map(name => {
            // A shape picked by hand wins; otherwise the song's recommended shape
            const voicing = voicingsFor(name)[shapeChoice(name, songEdits, selectedVoicings, band[name]).index]
            if (!voicing) return null
            return (
              <div
                key={name}
                role="listitem"
                tabIndex={0}
                aria-label={`${name}, ${voicing.l}`}
                className={name === picked ? 'shape is-picked' : 'shape'}
                onClick={() => onPick(name)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') onPick(name)
                }}
              >
                <span className="shape-name">{name}</span>
                <ChordDiagram voicing={voicing} size={78} />
                <span className="shape-where">{voicing.l}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
