import { useState } from 'react'
import { getDiatonicChords, getDiatonic7ths, getMinorDominants, getRoots, keyUsesFlats } from '../../music/theory'

const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', '6', '9', 'add9', 'm7b5', 'dim', 'aug']
/** Not chords, but the songbook charts are full of them. */
const MARKS = ['N.C.', '(x2)', '(x3)', '(x4)']

export interface ChordKeyboardProps {
  /** The key as shown on screen, used to offer the chords that belong to it. */
  songKey: string
  /** The chords the chart already has, in the order they first appear. */
  songChords?: string[]
  /** False until the cursor is somewhere: until then there is nowhere to put a chord. */
  ready: boolean
  /** What the next tap will do, in words. */
  hint: string
  canUndo: boolean
  canRedo: boolean
  onChord: (chord: string) => void
  onBackspace: () => void
  onNewLine: () => void
  onUndo: () => void
  onRedo: () => void
}

/**
 * Chords to tap, docked at the bottom of the screen while a chart is edited.
 * Nothing here needs the phone's own keyboard, so nothing covers the chart.
 * Each tap puts its chord where the cursor is, or in place of the chord that
 * is selected.
 */
export function ChordKeyboard({
  songKey, songChords = [], ready, hint, canUndo, canRedo, onChord, onBackspace, onNewLine, onUndo, onRedo,
}: ChordKeyboardProps) {
  const [root, setRoot] = useState<string | null>(null)

  // In a minor key the major V sits beside the scale's own chords: E and E7 in A minor
  const dominants = songKey ? getMinorDominants(songKey) : []
  // A chord the song already has is in its own row: it is not offered twice
  const notInSong = (chord: string) => !songChords.includes(chord)
  const inKey = songKey ? [...getDiatonicChords(songKey), ...dominants.slice(0, 1)].filter(notInSong) : []
  const sevenths = songKey ? [...getDiatonic7ths(songKey), ...dominants.slice(1)].filter(notInSong) : []
  const roots = getRoots(songKey ? keyUsesFlats(songKey) : false)

  const put = (chord: string) => {
    onChord(chord)
    setRoot(null)
  }

  const chip = (chord: string) => (
    <button key={chord} className="ck-chip" disabled={!ready} onClick={() => put(chord)}>{chord}</button>
  )

  return (
    <div className="ck" role="group" aria-label="Chord keyboard">
      <div className="ck-hint">{hint}</div>
      <div className="ck-tools">
        <button className="ck-tool" onClick={onUndo} disabled={!canUndo} aria-label="Undo">&#8630; Undo</button>
        <button className="ck-tool" onClick={onRedo} disabled={!canRedo} aria-label="Redo">&#8631; Redo</button>
        <button className="ck-tool" onClick={onBackspace} disabled={!ready} aria-label="Delete">&#9003;</button>
        <button className="ck-tool ck-newline" onClick={onNewLine} disabled={!ready} aria-label="New line">&#8629; New line</button>
      </div>

      {songChords.length > 0 && (
        <div className="ck-row">
          <span className="ck-label">Song</span>
          <div className="ck-chips">{songChords.map(chip)}</div>
        </div>
      )}

      {inKey.length > 0 && (
        <div className="ck-row">
          <span className="ck-label">In {songKey}</span>
          <div className="ck-chips">{inKey.map(chip)}</div>
        </div>
      )}
      {sevenths.length > 0 && (
        <div className="ck-row">
          <span className="ck-label">7ths</span>
          <div className="ck-chips">{sevenths.map(chip)}</div>
        </div>
      )}

      <div className="ck-row">
        <span className="ck-label">Any</span>
        <div className="ck-chips">
          {roots.map(r => (
            <button
              key={r}
              // Outlined, so a root is never mistaken for the same-named chord above it
              className={r === root ? 'ck-chip ck-root is-selected' : 'ck-chip ck-root'}
              disabled={!ready}
              aria-pressed={r === root}
              aria-label={`Chords built on ${r}`}
              onClick={() => setRoot(r === root ? null : r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {root && (
        <div className="ck-row">
          <span className="ck-label">on {root}</span>
          <div className="ck-chips">{QUALITIES.map(q => chip(root + q))}</div>
        </div>
      )}

      <div className="ck-row">
        <span className="ck-label">Marks</span>
        <div className="ck-chips">{MARKS.map(chip)}</div>
      </div>
    </div>
  )
}
