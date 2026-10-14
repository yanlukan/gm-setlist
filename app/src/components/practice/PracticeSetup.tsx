import { useState } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { guitarFor } from '../../music/chart-view'
import { positionLabel } from '../../hooks/use-band-positions'
import type { SongChart } from '../../hooks/use-song-chart'
import { CapoPicker } from '../song/CapoPicker'
import { MoveChordsSheet } from '../song/MoveChordsSheet'
import { SaveStatus } from '../edit/SaveStatus'

/**
 * The song's own settings, next to the song: key, capo, guitar, Move chords
 * and Edit. While editing, Edit is Done, with Reset and the save status beside it.
 */
export function PracticeSetup({ chart }: { chart: SongChart }) {
  const { song, songEdits, keyboard, semitones, capo, span } = chart
  const view = useChartView()
  const editMode = useStore(s => s.editMode)
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const resetEdits = useStore(s => s.resetEdits)
  const setTranspose = useStore(s => s.setTranspose)
  const clearTranspose = useStore(s => s.clearTranspose)
  const setCapo = useStore(s => s.setCapo)
  const setSongGuitar = useStore(s => s.setSongGuitar)
  const [showCapo, setShowCapo] = useState(false)
  const [moving, setMoving] = useState(false)

  // Transposing only changes an offset. The stored chart stays at source
  // pitch, so any amount of transposing is reversible and nothing is lost.
  // The key itself: from your own transpose back to the band key; from the
  // band key to the original recording key and back again (for playing along).
  const bandKey = song.transpose ?? 0
  const ownTranspose = songEdits?.transpose
  const keyAction = ownTranspose !== undefined
    ? (bandKey !== 0 ? 'Back to band key' : 'Clear transpose')
    : (bandKey !== 0 ? 'Show original key' : 'Transpose')
  const onKey = () => {
    if (ownTranspose !== undefined && !(ownTranspose === 0 && bandKey === 0)) clearTranspose(song.title)
    else if (bandKey !== 0) setTranspose(song.title, 0)
  }

  const played = guitarFor(song, songEdits, view)
  const other = played === 'electric' ? 'acoustic' : 'electric'
  const moved = songEdits?.neck !== undefined
  const where = span ? `${moved ? 'Your' : 'Recommended'} position: ${positionLabel(span).toLowerCase().replace('–', ' to ')}` : ''

  return (
    <div className="ph-setup" role="group" aria-label="Song setup">
      <span className="setup-key">
        <button className="setup-btn" aria-label="Transpose down" onClick={() => setTranspose(song.title, semitones - 1)}>&minus;</button>
        <button
          className={semitones !== 0 ? 'setup-btn is-moved' : 'setup-btn'}
          aria-label={`Key ${chart.playedKey}. ${keyAction}`}
          onClick={onKey}
        >
          Key {chart.playedKey}
        </button>
        <button className="setup-btn" aria-label="Transpose up" onClick={() => setTranspose(song.title, semitones + 1)}>+</button>
      </span>

      {keyboard ? (
        // The keyboard has no capo, no guitar and no shapes to move
        <span className="ph-badge">Keyboard</span>
      ) : (
        <>
          <button
            className={capo > 0 ? 'setup-btn is-moved' : 'setup-btn'}
            aria-label={capo > 0 ? `Capo on fret ${capo}. Change capo` : 'Add a capo'}
            onClick={() => setShowCapo(true)}
          >
            {capo > 0 ? `Capo ${capo}` : 'No capo'} &#9662;
          </button>
          <button
            className="setup-btn"
            aria-label={`Played on ${played} guitar. Switch to ${other} for this song`}
            onClick={() => setSongGuitar(song.title, other)}
          >
            {played === 'electric' ? 'Electric' : 'Acoustic'} &#9662;
          </button>
          {span && (
            <button
              className={moved ? 'setup-btn is-moved' : 'setup-btn'}
              aria-label={`${where}. Move the chords`}
              onClick={() => setMoving(true)}
            >
              Move chords <span className="setup-sub">{positionLabel(span)}</span> &#9662;
            </button>
          )}
        </>
      )}

      <button className={editMode ? 'setup-btn is-active' : 'setup-btn'} onClick={toggleEditMode}>
        {editMode ? 'Done' : 'Edit'}
      </button>
      {editMode && (
        <button
          className="setup-btn is-danger"
          onClick={() => {
            if (confirm(`Reset "${song.title}" to the original chart?\n\nYour version is kept under Earlier versions, at the bottom of the chart.`)) {
              resetEdits(song.title)
            }
          }}
        >
          Reset
        </button>
      )}
      {editMode && <SaveStatus />}

      {showCapo && (
        <CapoPicker
          song={song}
          edits={songEdits}
          capo={capo}
          onPick={fret => { setCapo(song.title, fret); setShowCapo(false) }}
          onClose={() => setShowCapo(false)}
        />
      )}
      {moving && <MoveChordsSheet song={song} edits={songEdits} onClose={() => setMoving(false)} />}
    </div>
  )
}
