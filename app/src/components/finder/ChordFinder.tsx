import { useMemo, useState, type ReactNode } from 'react'
import { Modal } from '../shared/Modal'
import { ChordDiagram } from '../diagrams/ChordDiagram'
import { useStore } from '../../store/use-store'
import { chordSuggestions, normalizeChordName } from '../../music/chord-names'
import { moreShapesFor } from '../../music/more-shapes'
import { outsideNotes, parseShapeText, shapeNotes } from '../../music/own-shapes'
import {
  chordNotes, ownShapesFor, pitchAt, researchedStart, shapeText, voicingsFor, type ChordNotes,
} from '../../music/voicings'
import { lookupChord, type ChordVoicing } from '../../data/chords-db'
import { getRoots } from '../../music/theory'
import { strum } from '../../music/sound'

interface Props {
  /** The chord to start from, when the finder is opened for one. */
  chord?: string
  /** The chords of the song on screen: they come first among the suggestions. */
  songChords?: string[]
  /** The capo on for the song, so a shape is heard at the pitch it sounds. */
  capo?: number
  /**
   * Present when the finder was opened from a chart: a tapped shape goes back
   * as the song's pick (its index, or its fret text for a shape of your own).
   */
  onPick?: (chord: string, pick: number | string) => void
  onClose: () => void
}

/** Areas of the neck to narrow the found shapes to, by their lowest fretted note. */
const AREAS = [
  { label: 'All', from: 0, to: 99 },
  { label: 'Open', from: 0, to: 0 },
  { label: '1–3', from: 1, to: 3 },
  { label: '4–6', from: 4, to: 6 },
  { label: '7–9', from: 7, to: 9 },
  { label: '10–12', from: 10, to: 12 },
  { label: '13–15', from: 13, to: 15 },
]
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']
/** The strings a shape is on, lowest to highest: every run of three to six, fullest first. */
const STRING_SETS = [
  { label: 'Any', low: -1, count: 0 },
  ...[6, 5, 4, 3].flatMap(count =>
    Array.from({ length: 7 - count }, (_, low) => ({
      label: `${STRING_NAMES[low]}–${STRING_NAMES[low + count - 1]}`, low, count,
    }))),
]
/** Found shapes shown at a time: a chord can have thousands. */
const PAGE = 48

/** A found shape with what narrows and orders the list. */
interface Found {
  v: ChordVoicing
  text: string
  /** The lowest fretted note, 0 for all open. */
  min: number
  open: boolean
  /** The lowest string played and how many, so x-x-2-2-3-5 is D to e. */
  low: number
  count: number
  /** Notes the chord cannot do without that the shape leaves out. */
  missing: number
  /** Different notes sounded: a fuller chord first. */
  distinct: number
}

function describeFound(v: ChordVoicing, notes: ChordNotes): Found {
  const text = shapeText(v)
  const frets = text.split('-').map(p => (p === 'x' ? null : Number(p)))
  const played = frets.flatMap((f, s) => (f === null ? [] : [pitchAt(s, f)]))
  const fretted = frets.filter((f): f is number => f !== null && f > 0)
  return {
    v, text,
    min: fretted.length > 0 ? Math.min(...fretted) : 0,
    open: frets.includes(0),
    low: frets.findIndex(f => f !== null),
    count: played.length,
    missing: notes.essential.filter(pc => !played.includes(pc)).length,
    distinct: new Set(played).size,
  }
}

/**
 * Look a chord up by name and see every shape for it: the chart's list, then
 * every other shape the neck has for it, then a shape you write yourself.
 * A shape you keep is yours for that chord in every song, and the chart's
 * picker and the strip show it with the others.
 */
export function ChordFinder({ chord, songChords = [], capo = 0, onPick, onClose }: Props) {
  const [typed, setTyped] = useState(chord ?? '')
  const [showMore, setShowMore] = useState(false)
  const [area, setArea] = useState(AREAS[0])
  const [strings, setStrings] = useState(STRING_SETS[0])
  const [pages, setPages] = useState(1)
  const [written, setWritten] = useState('')
  // So the lists follow a shape kept or removed here
  const ownShapes = useStore(s => s.ownShapes)
  const addOwnShape = useStore(s => s.addOwnShape)
  const removeOwnShape = useStore(s => s.removeOwnShape)

  const name = normalizeChordName(typed)
  const suggestions = typed.trim() === '' ? [] : chordSuggestions(typed, songChords)
  const offer = suggestions.filter(s => !(suggestions.length === 1 && s === name))
  const notes = name ? chordNotes(name) : null
  const flats = name ? /^[A-G]b/.test(name) : false
  const noteNames = getRoots(flats)
  const own = name ? ownShapesFor(name) : []
  const library = name ? (lookupChord(name)?.length ?? 0) : 0
  const generated = name ? researchedStart(name) : 0
  const shapes = name ? voicingsFor(name) : []

  const found = useMemo(
    () => (showMore && name && notes ? moreShapesFor(name).map(v => describeFound(v, notes)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a kept shape leaves this list
    [showMore, name, ownShapes],
  )
  const narrowed = found
    .filter(f => (area.label === 'All' ? true : area.label === 'Open' ? f.open : f.min >= area.from && f.min <= area.to))
    .filter(f => strings.count === 0 || (f.low === strings.low && f.count === strings.count))
    // The fullest chord first: nothing left out, then the most different notes, then down the neck
    .sort((a, b) => a.missing - b.missing || b.distinct - a.distinct || a.min - b.min || b.count - a.count || a.text.localeCompare(b.text))
  const shown = narrowed.slice(0, pages * PAGE)

  const pick = (chordName: string, choice: number | string) => {
    if (!onPick) return
    onPick(chordName, choice)
    onClose()
  }
  const keep = (chordName: string, text: string) => addOwnShape(chordName, text)

  const lookUp = (text: string) => {
    setTyped(text)
    setShowMore(false)
    setPages(1)
    setWritten('')
  }

  // The shape being written, drawn and named as it is typed
  const writtenShape = written.trim() === '' ? null : parseShapeText(written)
  const writtenText = writtenShape ? shapeText(writtenShape) : ''
  const outside = name && writtenShape ? outsideNotes(name, writtenShape) : []
  const writtenIsOwn = own.includes(writtenText)

  const mark = (i: number, v: ChordVoicing) => {
    if (own.includes(shapeText(v))) return <span className="diagram-mark is-own">Yours</span>
    if (i < library) return <span className="diagram-mark">Library</span>
    if (i < generated) return <span className="diagram-mark">Generated</span>
    return <span className="diagram-mark is-researched">Researched</span>
  }

  // Several shapes can sit at the same fret: the later ones are told apart by their frets
  const seen = new Set<string>()
  const where = (v: ChordVoicing, mine: boolean) => {
    const yours = mine ? ', yours' : ''
    const at = `${name} at ${v.l}${yours}`
    const label = seen.has(at) ? `${name} at ${v.l}, ${shapeText(v)}${yours}` : at
    seen.add(at)
    return label
  }

  const tile = (v: ChordVoicing, label: string, play: string, onTap: (() => void) | undefined, children: ReactNode) => (
    <div
      key={label}
      role="button"
      aria-label={label}
      className={onTap ? 'cf-tile is-pick' : 'cf-tile'}
      onClick={onTap}
    >
      <ChordDiagram voicing={v} size={112} />
      <span className="cf-frets">{shapeText(v)}</span>
      <span className="cf-where">{v.l}</span>
      <button
        type="button"
        className="diagram-play"
        aria-label={`Play ${play}`}
        onClick={e => { e.stopPropagation(); strum(v, capo) }}
      >
        &#9654;
      </button>
      {children}
    </div>
  )

  return (
    <Modal open onClose={onClose}>
      <div role="dialog" aria-label="Chord Finder" className="chord-finder">
        <div className="cf-head">
          <input
            className="cf-name"
            type="text"
            value={typed}
            onChange={e => lookUp(e.target.value)}
            placeholder="Chord, like Em11 or F#m7b5"
            aria-label="Chord name"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!chord}
          />
          <button type="button" className="cf-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {offer.length > 0 && (
          <div className="cf-suggest" role="group" aria-label="Suggestions">
            {offer.map(s => (
              <button
                key={s}
                type="button"
                className={songChords.includes(s) ? 'cf-chip is-song' : 'cf-chip'}
                onClick={() => lookUp(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {typed.trim() !== '' && !name && offer.length === 0 && (
          <div className="cf-status" role="status">Not a chord: {typed.trim()}</div>
        )}

        {name && notes && (
          <>
            <div className="cf-title">
              <h3>{name}</h3>
              <span className="cf-notes">{notes.tones.map(pc => noteNames[pc]).join(' ')}</span>
            </div>
            {onPick && <p className="cf-hint">Tap a shape to use it for {name} in this song.</p>}

            <div className="cf-tiles" role="group" aria-label={`Shapes for ${name}`}>
              {shapes.map((v, i) => {
                if (v.wrong) return null
                const text = shapeText(v)
                const mine = own.includes(text)
                const at = where(v, mine)
                return tile(
                  v,
                  at,
                  at,
                  onPick ? () => pick(name, mine ? text : i) : undefined,
                  <>
                    {mark(i, v)}
                    {mine && (
                      <button
                        type="button"
                        className="cf-remove"
                        aria-label={`Remove ${text}`}
                        onClick={e => { e.stopPropagation(); removeOwnShape(name, text) }}
                      >
                        Remove
                      </button>
                    )}
                  </>,
                )
              })}
            </div>

            <button
              type="button"
              className={showMore ? 'cf-more-btn is-on' : 'cf-more-btn'}
              aria-pressed={showMore}
              onClick={() => { setShowMore(!showMore); setPages(1) }}
            >
              More shapes
            </button>

            {showMore && (
              <>
                <p className="cf-hint">
                  Every other way to hold {name}, on three to six strings. Narrow it down by where on the neck
                  and which strings, then keep a shape to have it with the ones above.
                </p>
                <div className="cf-ranges" role="group" aria-label="Where on the neck">
                  {AREAS.map(a => (
                    <button
                      key={a.label}
                      type="button"
                      className="cf-chip"
                      aria-pressed={a.label === area.label}
                      onClick={() => { setArea(a); setPages(1) }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <div className="cf-ranges" role="group" aria-label="Strings">
                  {STRING_SETS.map(s => (
                    <button
                      key={s.label}
                      type="button"
                      className="cf-chip"
                      aria-pressed={s.label === strings.label}
                      onClick={() => { setStrings(s); setPages(1) }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="cf-tiles" role="group" aria-label={`More shapes for ${name}`}>
                  {narrowed.length === 0 && <span className="cf-hint">No other shapes here.</span>}
                  {shown.map(f => tile(
                    f.v,
                    `${name} at ${f.v.l}, ${f.text}`,
                    `${name} at ${f.v.l}, ${f.text}`,
                    () => { keep(name, f.text); pick(name, f.text) },
                    <>
                      <span className="diagram-mark">Generated</span>
                      <button
                        type="button"
                        className="cf-keep"
                        aria-label={`Keep ${f.text}`}
                        onClick={e => { e.stopPropagation(); keep(name, f.text) }}
                      >
                        Keep
                      </button>
                    </>,
                  ))}
                </div>
                {shown.length < narrowed.length && (
                  <button type="button" className="cf-more-btn" onClick={() => setPages(pages + 1)}>
                    Show more ({narrowed.length - shown.length} left)
                  </button>
                )}
              </>
            )}

            <div className="cf-own">
              <div className="cf-own-row">
                <input
                  className="cf-shape-input"
                  type="text"
                  value={written}
                  onChange={e => setWritten(e.target.value)}
                  placeholder="x-x-2-2-3-5"
                  aria-label="Your shape"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />
                {writtenShape && !writtenIsOwn && (
                  <button
                    type="button"
                    className="cf-save"
                    onClick={() => { keep(name, writtenText); setWritten('') }}
                  >
                    Save shape
                  </button>
                )}
                {writtenShape && writtenIsOwn && (
                  <button
                    type="button"
                    className="cf-remove"
                    onClick={() => { removeOwnShape(name, writtenText); setWritten('') }}
                  >
                    Remove shape
                  </button>
                )}
              </div>
              {written.trim() !== '' && !writtenShape && (
                <div className="cf-hint">Six strings: x or a fret each, like x-x-2-2-3-5</div>
              )}
              {writtenShape && (
                <div className="cf-written">
                  <ChordDiagram voicing={writtenShape} size={112} />
                  <div>
                    <div className="cf-notes">{shapeNotes(writtenShape, flats).join(' ')}</div>
                    {outside.length > 0 && (
                      <div className="cf-outside">
                        {outside.join(', ')} {outside.length === 1 ? 'is' : 'are'} not in {name}
                      </div>
                    )}
                    {writtenIsOwn && <div className="cf-hint">This shape is already yours.</div>}
                  </div>
                </div>
              )}
              {written.trim() === '' && (
                <div className="cf-hint">Or write a shape of your own, low E to high e.</div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
