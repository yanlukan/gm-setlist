import { useMemo } from 'react'
import { Modal } from '../shared/Modal'
import { easiestCapo, MAX_CAPO, shapeKey, shapeSections } from '../../music/chart-view'
import { playedKey } from '../../music/setlist-text'
import { parseChordText } from '../../music/chord-text'
import type { Song, SongEdits } from '../../types'

interface CapoPickerProps {
  song: Song
  edits: SongEdits | undefined
  capo: number
  onPick: (capo: number) => void
  onClose: () => void
}

/**
 * Where to put the capo for this song. Each fret says which shapes it leaves
 * to play, and the one that leaves the most open chords is marked.
 */
export function CapoPicker({ song, edits, capo, onPick, onClose }: CapoPickerProps) {
  const key = playedKey(song, edits).key
  const easiest = useMemo(() => {
    // The chords as they sound, with no capo
    const chords = shapeSections(song, { ...edits, capo: 0 }).flatMap(s => parseChordText(s.chords).flat())
    return easiestCapo(chords)
  }, [song, edits])

  return (
    <Modal open onClose={onClose}>
      <div className="capo-picker" role="dialog" aria-label="Capo">
        <div className="capo-head">
          <h3>Capo</h3>
          <button className="capo-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <p className="capo-help">
          The song still sounds in {key}. The chart and diagrams show the shapes to play with the capo on.
        </p>
        <div className="capo-frets">
          {Array.from({ length: MAX_CAPO + 1 }, (_, fret) => (
            <button
              key={fret}
              className={fret === capo ? 'capo-fret is-selected' : 'capo-fret'}
              aria-pressed={fret === capo}
              onClick={() => onPick(fret)}
            >
              <span className="capo-fret-num">{fret === 0 ? 'No capo' : `Fret ${fret}`}</span>
              <span className="capo-fret-key">{key ? `${shapeKey(key, -fret)} shapes` : ''}</span>
              {fret === easiest.capo && easiest.open > 0 && <span className="capo-fret-tip">Easiest</span>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
