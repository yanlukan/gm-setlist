import { isChartMark } from './theory'

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
  if (!part) return [chords]
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
