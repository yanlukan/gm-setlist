import { useMemo } from 'react'
import { Modal } from '../shared/Modal'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { useChartView, useStore } from '../../store/use-store'
import { shownSections } from '../../music/chart-view'
import { hasShapes, voicingsFor } from '../../music/voicings'
import { neckFor, positionLabel, shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import { backToSongShapes, moveChords } from '../../store/song-shapes'
import type { Song, SongEdits } from '../../types'

/** How far Lower and Higher move the chords, and how far they go. */
const NECK_STEP = 2
const MIN_NECK = 3
const MAX_NECK = 12

interface MoveChordsSheetProps {
  song: Song
  edits: SongEdits | undefined
  onClose: () => void
}

/**
 * Every chord of a song up or down the neck at once, opened from the
 * position on the chart's title line. The shapes that gives are shown as
 * they change, so the player sees what they would play before closing.
 */
export function MoveChordsSheet({ song, edits, onClose }: MoveChordsSheetProps) {
  const view = useChartView()
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const { picks, span } = useBandPositions(song, edits)
  const neck = edits?.neck
  const source = song.shapesFrom ?? 'Recommended'

  // The chords played, each once, in the order they first appear
  const chords = useMemo(() => {
    const seen = new Set<string>()
    for (const section of shownSections(song, edits, view)) {
      for (const name of section.chords.split(/[\s|,]+/)) {
        if (name && hasShapes(name)) seen.add(name)
      }
    }
    return [...seen]
  }, [song, edits, view])

  return (
    <Modal open onClose={onClose}>
      <div className="move-chords" role="dialog" aria-label="Move chords">
        <div className="capo-head">
          <h3>Move chords</h3>
          <button className="capo-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <p className="capo-help">
          {neck === undefined
            ? `Every chord of ${song.title} goes up or down the neck at once. The ${source.toLowerCase()} shapes come back with one tap.`
            : 'Lower and Higher move every chord two frets, including any you picked by hand for this song.'}
        </p>
        <div className="move-chords-area">
          <span className="move-chords-label">{positionLabel(span)}</span>
          <span className={neck === undefined ? 'move-chords-from' : 'move-chords-from is-own'}>
            {neck === undefined ? source : 'Moved by you'}
          </span>
        </div>
        {neck === undefined ? (
          <button
            type="button"
            className="move-chords-btn is-primary"
            onClick={() => moveChords(song.title, neckFor(song, edits, view))}
          >
            Move the chords
          </button>
        ) : (
          <div className="move-chords-steps">
            <button
              type="button"
              className="move-chords-btn"
              aria-label="Move the chords lower on the neck"
              disabled={neck <= MIN_NECK}
              onClick={() => moveChords(song.title, Math.max(MIN_NECK, neck - NECK_STEP))}
            >
              &#9660; Lower
            </button>
            <button
              type="button"
              className="move-chords-btn"
              aria-label="Move the chords higher on the neck"
              disabled={neck >= MAX_NECK}
              onClick={() => moveChords(song.title, Math.min(MAX_NECK, neck + NECK_STEP))}
            >
              &#9650; Higher
            </button>
            <button type="button" className="move-chords-btn" onClick={() => backToSongShapes(song.title)}>
              {song.shapesFrom ? `Back to ${song.shapesFrom.toLowerCase()}` : 'Put back'}
            </button>
          </div>
        )}
        <div className="move-chords-shapes" aria-label="The shapes to play">
          {chords.map(name => {
            const voicing = voicingsFor(name)[shapeChoice(name, edits, selectedVoicings, picks[name]).index]
            if (!voicing) return null
            return (
              <div key={name} className="move-chords-shape">
                <span>{name}</span>
                <ChordDiagram voicing={voicing} size={72} />
                <small>{voicing.l}</small>
              </div>
            )
          })}
        </div>
        <button type="button" className="move-chords-btn move-chords-done" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
