import { isChartMark } from './theory'
import { chordNotes } from './voicings'

/**
 * A section's chords as lines of chords. A token is a chord or a chart mark
 * such as N.C. or (x2). The stored text is these lines written out: two
 * spaces between chords, one line break between lines.
 */
export type ChordLines = string[][]

/** Characters with no width: a paste can carry them, and they must never glue or split chords. */
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g
/** Every kind of line ending a keyboard, a paste or a phone can produce. */
const LINE_ENDINGS = /\r\n|[\r\u2028\u2029\u0085]/g

/** Text to lines of chords. Blank lines are kept here; `formatChordText` decides how many stay. */
export function parseChordText(text: string): ChordLines {
  const clean = text
    .replace(INVISIBLE, '')
    .replace(/\u266d/g, 'b')
    .replace(/\u266f/g, '#')
    .replace(LINE_ENDINGS, '\n')
  if (!clean.trim()) return []
  return clean.split('\n').map(line => line.split(/\s+/).filter(Boolean))
}

/**
 * Lines of chords to the stored text. Nothing blank at either end and never
 * more than one blank line in a row, so a line break typed by accident cannot
 * open a gap in the chart.
 */
export function formatChordText(lines: ChordLines): string {
  const kept: ChordLines = []
  for (const line of lines) {
    const previous = kept[kept.length - 1]
    if (line.length === 0 && (previous === undefined || previous.length === 0)) continue
    kept.push(line)
  }
  while (kept.length > 0 && kept[kept.length - 1].length === 0) kept.pop()
  return kept.map(line => line.join('  ')).join('\n')
}

/** Whatever was typed or pasted, tidied into the chart's own form. */
export function normalizeChordText(text: string): string {
  return formatChordText(parseChordText(text))
}

/** A chord the app understands, a chart mark, or a bar line. */
export function isChordToken(token: string): boolean {
  if (isChartMark(token) || token === '|') return true
  return chordNotes(token) !== null
}

/**
 * The tokens that are not chords, each once, in order. Two chords fused by a
 * slip ("D" and "E" become "DE") show up here instead of being saved quietly.
 */
export function unknownChords(text: string): string[] {
  const found: string[] = []
  for (const line of parseChordText(text)) {
    for (const token of line) {
      if (!isChordToken(token) && !found.includes(token)) found.push(token)
    }
  }
  return found
}

// ---------- Editing on the chart ----------
// The editor keeps a cursor between chords (a caret) or on one chord (a
// selection). These functions never change what they are given.

/** A cursor between chords: `pos` chords of `line` lie before it. */
export interface Caret {
  line: number
  pos: number
}

export interface Edited {
  lines: ChordLines
  caret: Caret
}

const copy = (lines: ChordLines): ChordLines => lines.map(line => [...line])

/** A cursor that cannot point outside the lines: past the end means the end. */
function place(lines: ChordLines, caret: Caret): { lines: ChordLines; line: number; pos: number } {
  const all = lines.length > 0 ? copy(lines) : [[]]
  const line = Math.max(0, Math.min(caret.line, all.length - 1))
  const pos = Math.max(0, Math.min(caret.pos, all[line].length))
  return { lines: all, line, pos }
}

/** Put a chord at the cursor. The cursor moves after it, ready for the next. */
export function insertChord(lines: ChordLines, caret: Caret, chord: string): Edited {
  const at = place(lines, caret)
  at.lines[at.line].splice(at.pos, 0, chord)
  return { lines: at.lines, caret: { line: at.line, pos: at.pos + 1 } }
}

/** Swap one chord for another; the cursor goes after it. */
export function replaceChord(lines: ChordLines, at: { line: number; index: number }, chord: string): Edited {
  const next = copy(lines)
  if (next[at.line]?.[at.index] === undefined) return { lines: next, caret: { line: at.line, pos: at.index } }
  next[at.line][at.index] = chord
  return { lines: next, caret: { line: at.line, pos: at.index + 1 } }
}

/** Remove one chord; the cursor stays where it was. */
export function deleteChord(lines: ChordLines, at: { line: number; index: number }): Edited {
  const next = copy(lines)
  next[at.line]?.splice(at.index, 1)
  return { lines: next, caret: { line: at.line, pos: at.index } }
}

/**
 * Backspace: the chord before the cursor, or at the start of a line the line
 * break itself, which joins the line to the one above.
 */
export function backspace(lines: ChordLines, caret: Caret): Edited {
  const at = place(lines, caret)
  if (at.pos > 0) {
    at.lines[at.line].splice(at.pos - 1, 1)
    return { lines: at.lines, caret: { line: at.line, pos: at.pos - 1 } }
  }
  if (at.line === 0) return { lines: at.lines, caret: { line: 0, pos: 0 } }
  const above = at.lines[at.line - 1]
  const joinedAt = above.length
  at.lines.splice(at.line - 1, 2, [...above, ...at.lines[at.line]])
  return { lines: at.lines, caret: { line: at.line - 1, pos: joinedAt } }
}

/** A line break at the cursor; the cursor starts the new line. */
export function breakLine(lines: ChordLines, caret: Caret): Edited {
  const at = place(lines, caret)
  const line = at.lines[at.line]
  at.lines.splice(at.line, 1, line.slice(0, at.pos), line.slice(at.pos))
  return { lines: at.lines, caret: { line: at.line + 1, pos: 0 } }
}
