import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { AutoSaveText } from '../shared/AutoSaveText'
import { ChordKeyboard } from './ChordKeyboard'
import { SongHistoryModal } from './SongHistoryModal'
import { isChartMark, sectionColor } from '../../music/theory'
import {
  backspace, breakLine, deleteChord, formatChordText, insertChord, isChordToken,
  normalizeChordText, parseChordText, replaceChord, unknownChords,
  type Caret, type ChordLines, type Edited,
} from '../../music/chord-text'
import type { Section } from '../../types'

const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Instrumental', 'Outro']
/** Steps of undo kept for one editing session. */
const MAX_UNDO = 200

/** Where the next tap on the chord keyboard goes: between two chords, or onto one. */
type Cursor =
  | { kind: 'caret'; section: number; line: number; pos: number }
  | { kind: 'chord'; section: number; line: number; index: number }

interface Props {
  title: string
  heading: ReactNode
  banners: ReactNode
  /** The chart as stored, at the song's own pitch. */
  sections: Section[]
  /** The same chart as shown on screen, in the key the band plays. */
  displaySections: Section[]
  /** The key as shown, for the chords that belong to it. */
  songKey: string
  notes: string
  /** One section's chords, as shown on screen. */
  onChords: (index: number, text: string) => void
  /** The whole chart at the song's own pitch: moves, renames, copies, adds and deletes. */
  onSections: (next: Section[]) => void
  onNotes: (text: string) => void
}

/** "Verse" is copied as "Verse 2", "Bridge 2" as "Bridge 3". */
function copyName(name: string): string {
  const numbered = name.match(/^(.*?)(\d+)$/)
  return numbered ? `${numbered[1]}${Number(numbered[2]) + 1}` : `${name} 2`
}

/**
 * The chart, edited where it is read. Tap a chord to select it (the next
 * chord you tap replaces it, Delete removes it). Tap between chords, or in
 * the empty space at the end of a line, to put the cursor there: the next
 * chords go in at the cursor, one after another. New line breaks the line at
 * the cursor. Every change is saved at once and can be undone.
 */
export function ChartEditor({
  title, heading, banners, sections, displaySections, songKey, notes, onChords, onSections, onNotes,
}: Props) {
  const [cursor, setCursor] = useState<Cursor | null>(null)
  /** Lines as typed, kept while editing so a new empty line at the end survives. */
  const [drafts, setDrafts] = useState<Record<number, ChordLines>>({})
  /** The section being typed into as text instead of tapped, if any. */
  const [typing, setTyping] = useState<number | null>(null)
  /** The section last touched: on a phone only its buttons (move, copy, delete) are shown. */
  const [touched, setTouched] = useState<number | null>(null)
  const [history, setHistory] = useState<{ past: Section[][]; future: Section[][] }>({ past: [], future: [] })
  const [showAdd, setShowAdd] = useState(false)
  const [customName, setCustomName] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const at = cursor && displaySections[cursor.section] ? cursor : null

  /** A section's lines: the draft while it still says what is saved, else what is saved. */
  const linesOf = (i: number): ChordLines => {
    const text = displaySections[i]?.chords ?? ''
    const draft = drafts[i]
    const lines = draft && formatChordText(draft) === normalizeChordText(text) ? draft : parseChordText(text)
    return lines.length > 0 ? lines : [[]]
  }

  /** Keep the chart as it is now, so Undo can bring it back. */
  const remember = () =>
    setHistory(h => ({ past: [...h.past.slice(-(MAX_UNDO - 1)), sections], future: [] }))

  const changeChords = (i: number, produce: (lines: ChordLines) => Edited) => {
    const { lines, caret } = produce(linesOf(i))
    const text = formatChordText(lines)
    if (text !== normalizeChordText(displaySections[i].chords)) remember()
    setDrafts(d => ({ ...d, [i]: lines }))
    setCursor({ kind: 'caret', section: i, ...caret })
    onChords(i, text)
  }

  const putChord = (chord: string) => {
    if (!at) return
    changeChords(at.section, lines =>
      at.kind === 'chord' ? replaceChord(lines, at, chord) : insertChord(lines, at, chord))
  }
  const remove = () => {
    if (!at) return
    changeChords(at.section, lines => (at.kind === 'chord' ? deleteChord(lines, at) : backspace(lines, at)))
  }
  const newLine = () => {
    if (!at) return
    const here: Caret = at.kind === 'chord' ? { line: at.line, pos: at.index + 1 } : at
    changeChords(at.section, lines => breakLine(lines, here))
  }

  const tapChord = (section: number, line: number, index: number) =>
    setCursor(c =>
      c?.kind === 'chord' && c.section === section && c.line === line && c.index === index
        ? { kind: 'caret', section, line, pos: index + 1 } // tap it again: put the cursor after it
        : { kind: 'chord', section, line, index })
  const tapGap = (section: number, line: number, pos: number) =>
    setCursor({ kind: 'caret', section, line, pos })

  // Changes to the chart as a whole
  const restructure = (next: Section[]) => {
    remember()
    setDrafts({})
    setCursor(null)
    setTouched(null)
    onSections(next)
  }
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[i], next[target]] = [next[target], next[i]]
    restructure(next)
  }
  const copy = (i: number) =>
    restructure([...sections.slice(0, i + 1), { ...sections[i], name: copyName(sections[i].name) }, ...sections.slice(i + 1)])
  const drop = (i: number) => {
    if (sections.length <= 1 || !confirm(`Delete the ${sections[i].name} section?`)) return
    restructure(sections.filter((_, k) => k !== i))
  }
  const rename = (i: number, name: string) =>
    restructure(sections.map((s, k) => (k === i ? { ...s, name } : s)))
  const add = (name: string) => {
    restructure([...sections, { name, chords: '' }])
    setShowAdd(false)
    setCustomName('')
  }

  const undo = () => {
    const previous = history.past[history.past.length - 1]
    if (!previous) return
    setHistory({ past: history.past.slice(0, -1), future: [sections, ...history.future] })
    setDrafts({})
    setCursor(null)
    setTouched(null)
    onSections(previous)
  }
  const redo = () => {
    const next = history.future[0]
    if (!next) return
    setHistory({ past: [...history.past, sections], future: history.future.slice(1) })
    setDrafts({})
    setCursor(null)
    setTouched(null)
    onSections(next)
  }

  const typeInto = (i: number | null) => {
    setTyping(i)
    setCursor(null)
    setDrafts({})
  }

  // Keep the cursor in view above the keyboard
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-cursor="true"]') as HTMLElement | null
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [cursor, drafts])

  const selectedChord = at?.kind === 'chord' ? linesOf(at.section)[at.line]?.[at.index] : undefined
  const hint = !at
    ? 'Tap a chord to change it, or between chords to add'
    : at.kind === 'chord'
      ? `Changing ${selectedChord}: tap the chord to put there`
      : `Adding to ${displaySections[at.section].name}, line ${at.line + 1}`

  const renderLine = (si: number, li: number, tokens: string[], lineCount: number) => {
    const caretAt = at?.kind === 'caret' && at.section === si && at.line === li ? at.pos : -1
    const picked = at?.kind === 'chord' && at.section === si && at.line === li ? at.index : -1
    const gap = (pos: number, end: boolean) => (
      <button
        key={end ? 'end' : `gap-${pos}`}
        type="button"
        className={['ce-gap', end ? 'ce-gap-end' : '', caretAt === pos ? 'is-caret' : ''].filter(Boolean).join(' ')}
        data-cursor={caretAt === pos}
        aria-label={end ? `Cursor at the end of line ${li + 1}` : `Cursor before chord ${pos + 1}`}
        onClick={() => tapGap(si, li, pos)}
      >
        {end && li < lineCount - 1 && <span className="ce-eol" aria-hidden="true">&#8629;</span>}
      </button>
    )
    return (
      <div key={li} className="ce-line">
        {tokens.map((token, ti) => (
          <Fragment key={ti}>
            {gap(ti, false)}
            <button
              type="button"
              className={[
                'ce-chord',
                picked === ti ? 'is-selected' : '',
                isChartMark(token) ? 'is-mark' : '',
                isChordToken(token) ? '' : 'is-bad',
              ].filter(Boolean).join(' ')}
              aria-pressed={picked === ti}
              data-cursor={picked === ti}
              onClick={() => tapChord(si, li, ti)}
            >
              {token}
            </button>
          </Fragment>
        ))}
        {gap(tokens.length, true)}
      </div>
    )
  }

  return (
    <>
      <div ref={scrollRef} className="chart-scroll">
        <div className="chart ce">
          {heading}
          {banners}

          <div className="ce-sections">
            {displaySections.map((section, si) => {
              const lines = linesOf(si)
              const notChords = unknownChords(section.chords)
              return (
                <section
                  key={si}
                  className={touched === si ? 'ce-section is-active' : 'ce-section'}
                  role="group"
                  aria-label={section.name}
                  // On the click, not on focus: a press that moved the chord from
                  // under the finger would lose the tap
                  onClickCapture={() => setTouched(si)}
                >
                  <div className="ce-head">
                    <AutoSaveText
                      className="ce-name"
                      style={{ color: sectionColor(section.name) }}
                      value={section.name}
                      onChange={name => rename(si, name)}
                      aria-label={`Name of section ${si + 1}`}
                    />
                    <div className="ce-actions">
                      <button className="ce-act" onClick={() => move(si, -1)} disabled={si === 0}
                        aria-label={`Move ${section.name} up`}>&#9650;</button>
                      <button className="ce-act" onClick={() => move(si, 1)} disabled={si === sections.length - 1}
                        aria-label={`Move ${section.name} down`}>&#9660;</button>
                      <button className="ce-act ce-text" onClick={() => copy(si)}
                        aria-label={`Copy ${section.name}`}>Copy</button>
                      <button className="ce-act ce-text" onClick={() => typeInto(typing === si ? null : si)}
                        aria-label={typing === si ? `Tap chords for ${section.name}` : `Type chords for ${section.name}`}>
                        {typing === si ? 'Tap' : 'Type'}
                      </button>
                      <button className="ce-act ce-drop" onClick={() => drop(si)} disabled={sections.length <= 1}
                        aria-label={`Delete ${section.name}`}>&times;</button>
                    </div>
                  </div>

                  {typing === si ? (
                    <AutoSaveText
                      multiline
                      className="edit-chords"
                      value={section.chords}
                      onChange={text => {
                        if (normalizeChordText(text) !== normalizeChordText(section.chords)) remember()
                        onChords(si, text)
                      }}
                      aria-label={`Chords for ${section.name}`}
                      placeholder="Chords. Return starts a new line"
                    />
                  ) : (
                    <div className="ce-lines">{lines.map((tokens, li) => renderLine(si, li, tokens, lines.length))}</div>
                  )}

                  {notChords.length > 0 && (
                    <div className="edit-warning" role="status">Not a chord: {notChords.join(', ')}</div>
                  )}
                </section>
              )
            })}
          </div>

          {showAdd ? (
            <div className="ce-add">
              {SECTION_TYPES.map(name => (
                <button key={name} className="ce-add-type" onClick={() => add(name)}>{name}</button>
              ))}
              <div className="ce-add-custom">
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customName.trim()) add(customName.trim()) }}
                  placeholder="Custom name..."
                  aria-label="Custom section name"
                />
                <button className="ce-add-type" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="ce-add-btn" onClick={() => setShowAdd(true)}>+ Add Section</button>
          )}

          <div className="ce-notes">
            <div className="ce-notes-label">NOTES</div>
            <AutoSaveText multiline className="edit-notes" value={notes} onChange={onNotes} aria-label="Notes" />
          </div>

          <button className="ce-history-btn" onClick={() => setShowHistory(true)}>Earlier versions of this song</button>
        </div>
      </div>

      {showHistory && <SongHistoryModal title={title} onClose={() => setShowHistory(false)} />}

      {/* Typing brings up the phone's own keyboard, and two keyboards would fill a phone */}
      {typing === null && (
        <ChordKeyboard
          songKey={songKey}
          ready={at !== null}
          hint={hint}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onChord={putChord}
          onBackspace={remove}
          onNewLine={newLine}
          onUndo={undo}
          onRedo={redo}
        />
      )}
    </>
  )
}
