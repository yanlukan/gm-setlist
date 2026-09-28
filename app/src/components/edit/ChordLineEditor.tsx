import { useMemo, useState } from 'react'
import { getDiatonicChords, getDiatonic7ths, getRoots, shouldUseFlats } from '../../music/theory'

const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', '6', '9', 'add9', 'm7b5', 'dim', 'aug']

interface ChordLineEditorProps {
  sectionName: string
  /** The line as shown on screen — transposed, if the song is. */
  chords: string
  /** The key as shown on screen, used to offer the chords that belong to it. */
  songKey: string
  onChange: (chords: string) => void
  onClose: () => void
}

/**
 * Build a chord line by tapping, with no on-screen keyboard. It sits at the
 * top of the screen so nothing covers it. Tap chords to add them; tap a chord
 * in the line to select it, and the next chord you tap replaces it.
 */
export function ChordLineEditor({ sectionName, chords, songKey, onChange, onClose }: ChordLineEditorProps) {
  const tokens = useMemo(() => chords.split(/\s+/).filter(Boolean), [chords])
  const [selected, setSelected] = useState<number | null>(null)
  const [root, setRoot] = useState<string | null>(null)

  const inKey = songKey ? getDiatonicChords(songKey) : []
  const sevenths = songKey ? getDiatonic7ths(songKey) : []
  const roots = getRoots(songKey ? shouldUseFlats(songKey, 0) : false)

  // Two spaces between chords, like the rest of the charts.
  const commit = (next: string[]) => onChange(next.join('  '))

  const put = (chord: string) => {
    if (selected !== null && selected < tokens.length) {
      commit(tokens.map((t, i) => (i === selected ? chord : t)))
      setSelected(null)
    } else {
      commit([...tokens, chord])
    }
    setRoot(null)
  }

  const removeOne = () => {
    if (tokens.length === 0) return
    const index = selected ?? tokens.length - 1
    commit(tokens.filter((_, i) => i !== index))
    setSelected(null)
  }

  const chip = (chord: string) => (
    <button key={chord} className="cle-chip" onClick={() => put(chord)}>{chord}</button>
  )

  return (
    <div className="cle-backdrop" onClick={onClose}>
      <div
        className="cle-sheet"
        role="dialog"
        aria-label={`Chords for ${sectionName}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="cle-header">
          <strong className="cle-title">{sectionName}</strong>
          <span className="cle-hint">
            {selected !== null ? 'Tap a chord to replace the selected one' : 'Tap chords to add them'}
          </span>
          <button className="songgrid-close" onClick={onClose}>Done</button>
        </div>

        <div className="cle-line">
          {tokens.length === 0 && <span className="cle-empty">No chords yet</span>}
          {tokens.map((token, i) => (
            <button
              key={`${i}-${token}`}
              className={i === selected ? 'cle-token is-selected' : 'cle-token'}
              aria-pressed={i === selected}
              onClick={() => setSelected(i === selected ? null : i)}
            >
              {token}
            </button>
          ))}
          <button
            className="cle-token cle-delete"
            onClick={removeOne}
            disabled={tokens.length === 0}
            aria-label={selected !== null ? 'Delete selected chord' : 'Delete last chord'}
          >
            &#9003;
          </button>
        </div>

        {inKey.length > 0 && (
          <>
            <div className="cle-label">In {songKey}</div>
            <div className="cle-chips">{inKey.map(chip)}</div>
            <div className="cle-label">Sevenths</div>
            <div className="cle-chips">{sevenths.map(chip)}</div>
          </>
        )}

        <div className="cle-label">Any chord{root ? ` on ${root}` : ''}</div>
        <div className="cle-chips">
          {roots.map(r => (
            <button
              key={r}
              // Outlined, so a root is never mistaken for the same-named chord above it
              className={r === root ? 'cle-chip cle-root is-selected' : 'cle-chip cle-root'}
              aria-pressed={r === root}
              aria-label={`Chords built on ${r}`}
              onClick={() => setRoot(r === root ? null : r)}
            >
              {r}
            </button>
          ))}
        </div>
        {root && <div className="cle-chips">{QUALITIES.map(q => chip(root + q))}</div>}
      </div>
    </div>
  )
}
