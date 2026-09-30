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
