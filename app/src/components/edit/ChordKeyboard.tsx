import { useState } from 'react'
import { getDiatonicChords, getDiatonic7ths, getMinorDominants, getRoots, keyUsesFlats, isChartMark } from '../../music/theory'
import { shapeToShow, voicingsFor } from '../../music/voicings'
import { strum } from '../../music/sound'

const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', '6', '9', 'add9', 'm7b5', 'dim', 'aug']
/** Not chords, but the songbook charts are full of them. */
const MARKS = ['N.C.', '(x2)', '(x3)', '(x4)']

export interface ChordKeyboardProps {
  /** The key as shown on screen, used to offer the chords that belong to it. */
  songKey: string
  /** The chords the chart already has, in the order they first appear. */
  songChords?: string[]
  /** The capo on for this song, so a chord is heard at the pitch it sounds. */
  capo?: number
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

type Tab = 'song' | 'key' | 'sevenths' | 'any' | 'marks'

/**
 * Chords to tap, docked at the bottom of the screen while a chart is edited.
 * Nothing here needs the phone's own keyboard, so nothing covers the chart.
 * Each tap puts its chord where the cursor is, or in place of the chord that
 * is selected. One set of chords shows at a time, picked by the tabs, so the
 * keyboard leaves most of a phone screen to the chart.
 */
export function ChordKeyboard({
  songKey, songChords = [], capo = 0, ready, hint, canUndo, canRedo, onChord, onBackspace, onNewLine, onUndo, onRedo,
}: ChordKeyboardProps) {
  const [root, setRoot] = useState<string | null>(null)
  /** Hear each chord as it is put in. */
  const [sound, setSound] = useState(false)

  // In a minor key the major V sits beside the scale's own chords: E and E7 in A minor
  const dominants = songKey ? getMinorDominants(songKey) : []
  // A chord the song already has is in its own set: it is not offered twice
  const notInSong = (chord: string) => !songChords.includes(chord)
  const inKey = songKey ? [...getDiatonicChords(songKey), ...dominants.slice(0, 1)].filter(notInSong) : []
  const sevenths = songKey ? [...getDiatonic7ths(songKey), ...dominants.slice(1)].filter(notInSong) : []
  const roots = getRoots(songKey ? keyUsesFlats(songKey) : false)

  const tabs: Array<{ id: Tab; label: string }> = [
    ...(songChords.length > 0 ? [{ id: 'song' as const, label: 'Song' }] : []),
    ...(inKey.length > 0 ? [{ id: 'key' as const, label: `In ${songKey}` }] : []),
    ...(sevenths.length > 0 ? [{ id: 'sevenths' as const, label: '7ths' }] : []),
    { id: 'any', label: 'Any' },
    { id: 'marks', label: 'Marks' },
  ]
  const [chosen, setChosen] = useState<Tab>(tabs[0].id)
  // A set can empty out (the song's chords all moved into Song): fall back to the first
  const tab = tabs.some(t => t.id === chosen) ? chosen : tabs[0].id

  const put = (chord: string) => {
    onChord(chord)
    setRoot(null)
    if (sound && !isChartMark(chord)) {
      const shape = voicingsFor(chord)[shapeToShow(chord)]
      if (shape) strum(shape, capo)
    }
  }

  const chip = (chord: string) => (
    <button key={chord} className="ck-chip" disabled={!ready} onClick={() => put(chord)}>{chord}</button>
  )

  return (
    <div className="ck" role="group" aria-label="Chord keyboard">
      <div className="ck-hint">{hint}</div>
      <div className="ck-tools">
        <button className="ck-tool" onClick={onUndo} disabled={!canUndo} aria-label="Undo">&#8630;</button>
        <button className="ck-tool" onClick={onRedo} disabled={!canRedo} aria-label="Redo">&#8631;</button>
        <button className="ck-tool" onClick={onBackspace} disabled={!ready} aria-label="Delete">&#9003;</button>
        <button
          className={sound ? 'ck-tool is-on' : 'ck-tool'}
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          aria-label="Hear chords as you tap them"
        >
          {sound ? '\u{1F50A}' : '\u{1F508}'}
        </button>
        <button className="ck-tool ck-newline" onClick={onNewLine} disabled={!ready} aria-label="New line">&#8629; Line</button>
      </div>

      <div className="ck-tabs" role="tablist" aria-label="Chord sets">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={t.id === tab ? 'ck-tab is-selected' : 'ck-tab'}
            onClick={() => { setChosen(t.id); setRoot(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ck-chips" role="tabpanel" aria-label={tabs.find(t => t.id === tab)?.label}>
        {tab === 'song' && songChords.map(chip)}
        {tab === 'key' && inKey.map(chip)}
        {tab === 'sevenths' && sevenths.map(chip)}
        {tab === 'marks' && MARKS.map(chip)}
        {tab === 'any' && (root
          ? (
            <>
              <button className="ck-chip ck-root is-selected" onClick={() => setRoot(null)} aria-label="Back to all roots">
                &#8592; {root}
              </button>
              {QUALITIES.map(q => chip(root + q))}
            </>
          )
          : roots.map(r => (
            <button
              key={r}
              // Outlined, so a root is never mistaken for a chord to put in
              className="ck-chip ck-root"
              disabled={!ready}
              aria-label={`Chords built on ${r}`}
              onClick={() => setRoot(r)}
            >
              {r}
            </button>
          )))}
      </div>
    </div>
  )
}
