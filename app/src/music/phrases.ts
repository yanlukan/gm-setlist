import { isChartMark } from './theory'
import { normalizeChordText, parseChordText, type Caret, type ChordLines } from './chord-text'

/** The shortest part, in chords, that counts as one: shorter repeats are a riff inside a line. */
const MIN_PART = 3

/**
 * A section's chords as the lines to read them in. Where the section plays
 * the same part more than once (a verse that goes round twice), each time
 * starts a line of its own, so the eye finds the same chords in the same
 * place. A line runs on until the part comes round again, unless what comes
 * between is as long as the part: that is a part of its own, on its own line.
 * What comes before the first time is a line of its own, and so is a
 * turnaround after the last, unless it is only a chord or two. A section with
 * no repeated part stays one line.
 *
 * The longest part played twice is found first, then the same is done inside
 * what is left. Repeat counts and N.C. stay with the chord before them.
 */
export function phraseLines(text: string): string[] {
  const tokens = text.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  return split(groups(tokens)).map(line => line.map(g => g.join(' ')).join('  '))
}

/**
 * A section's chords as the chart shows them. Lines the player set in the
 * editor are kept just as they are; a section written as one line is laid
 * out by its parts.
 */
export function layOutParts(text: string): string {
  return text.includes('\n') ? text : phraseLines(text).join('\n')
}

/**
 * A section's chords as they are saved after an edit. Lines that are just
 * the parts laid out again are saved as one line, so the chart goes on
 * laying them out itself and an edit undone leaves the song as it was.
 * Lines the player changed are saved as they are.
 */
export function keptLines(text: string): string {
  if (!text.includes('\n')) return text
  const oneLine = parseChordText(text).flat().join('  ')
  return normalizeChordText(text) === normalizeChordText(layOutParts(oneLine)) ? oneLine : text
}

/** A section's lines are the ones the chart lays out itself, not lines the player set. */
export function isLaidOutByParts(lines: ChordLines): boolean {
  const own = lines.map(line => line.join('  ')).join('\n')
  return own === parseChordText(layOutParts(lines.flat().join('  '))).map(line => line.join('  ')).join('\n')
}

/**
 * A chord put in, changed or taken out of a section the chart lays out by
 * its parts. The section stays laid out by its parts, so its lines follow
 * the new chords: the chords as one line to save, the lines they now make,
 * and the cursor at the same place among the chords.
 */
export function relayOut(lines: ChordLines, caret: Caret): { text: string; lines: ChordLines; caret: Caret } {
  const text = lines.flat().join('  ')
  const laidOut = parseChordText(layOutParts(text))
  if (laidOut.length === 0) return { text, lines: [[]], caret: { line: 0, pos: 0 } }
  let before = lines.slice(0, caret.line).reduce((n, line) => n + line.length, 0) + caret.pos
  for (let line = 0; line < laidOut.length; line++) {
    // At the end of a line rather than the start of the next: after the chord just put in
    if (before <= laidOut[line].length) return { text, lines: laidOut, caret: { line, pos: before } }
    before -= laidOut[line].length
  }
  const last = laidOut.length - 1
  return { text, lines: laidOut, caret: { line: last, pos: laidOut[last].length } }
}

/** Each chord with the marks that follow it ("D (x2)"), so a mark never starts a line. */
function groups(tokens: string[]): string[][] {
  const out: string[][] = []
  for (const token of tokens) {
    if (isChartMark(token) && out.length > 0) out[out.length - 1].push(token)
    else out.push([token])
  }
  return out
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i])

function split(chords: string[][]): string[][][] {
  const part = longestRepeat(chords)
  if (!part) {
    const length = alikeParts(chords)
    if (!length) return [chords]
    return Array.from({ length: chords.length / length }, (_, n) => chords.slice(n * length, (n + 1) * length))
  }
  const { start, length } = part
  const playedAt = (i: number) => chords.slice(i, i + length).every((c, k) => same(c, chords[start + k]))
  // Every time the part is played, left to right, never overlapping
  const at: number[] = []
  for (let i = start; i + length <= chords.length; i += playedAt(i) ? length : 1) {
    if (playedAt(i)) at.push(i)
  }
  const lines = start > 0 ? split(chords.slice(0, start)) : []
  // How far one time through runs: the part, and the rest of its phrase
  let phrase = length
  at.forEach((from, n) => {
    const end = from + length
    const next = at[n + 1]
    if (next !== undefined && next - end < length) {
      // Shorter than the part: the rest of its phrase, up to where it comes round again
      lines.push(chords.slice(from, next))
      phrase = next - from
    } else if (next !== undefined) {
      // As long as the part or longer: a part of its own
      lines.push(chords.slice(from, end), ...split(chords.slice(end, next)))
      phrase = length
    } else {
      // The last time: as long as the times before; a chord or two after it
      // (where it lands) stay on its line, more are a part of their own
      const stop = Math.min(from + phrase, chords.length)
      if (chords.length - stop < MIN_PART) lines.push(chords.slice(from))
      else lines.push(chords.slice(from, stop), ...split(chords.slice(stop)))
    }
  })
  return lines
}

/**
 * Parts that start alike and end differently ("Am7 Fmaj7 Am7 Dm9", then
 * "Am7 Fmaj7 Em7 Dm9"): the section cut into equal parts that each open on
 * the same chord and have at least half their chords in the same places.
 * The fewest such parts, so each line is as long as it can be. Their length,
 * or null when the section does not cut that way.
 */
function alikeParts(chords: string[][]): number | null {
  for (let count = 2; chords.length / count >= MIN_PART; count++) {
    if (chords.length % count !== 0) continue
    const length = chords.length / count
    const first = chords.slice(0, length)
    const alike = (n: number) => {
      const part = chords.slice(n * length, (n + 1) * length)
      const shared = part.filter((c, k) => same(c, first[k])).length
      return same(part[0], first[0]) && shared * 2 >= length
    }
    if (Array.from({ length: count - 1 }, (_, n) => n + 1).every(alike)) return length
  }
  return null
}

/** The longest run of chords played twice without overlapping, the earliest if more than one. */
function longestRepeat(chords: string[][]): { start: number; length: number } | null {
  for (let length = chords.length >> 1; length >= MIN_PART; length--) {
    for (let start = 0; start + 2 * length <= chords.length; start++) {
      for (let again = start + length; again + length <= chords.length; again++) {
        let k = 0
        while (k < length && same(chords[start + k], chords[again + k])) k++
        if (k === length) return { start, length }
      }
    }
  }
  return null
}
