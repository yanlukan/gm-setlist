/** A bar line, written between bars. */
export const BAR = '|'
/** The bar before, played again: always a whole bar of its own. */
export const REPEAT_BAR = '%'

/** A repeat count such as (x2): it goes with the bar before it, never a bar of its own. */
export const isRepeatCount = (token: string) => /^\(?x\d+\)?$/i.test(token)

/** A line is written in bars when it has a bar line or a repeat bar. */
export function hasBars(line: string | string[]): boolean {
  const tokens = typeof line === 'string' ? line.split(/\s+/) : line
  return tokens.some(t => t === BAR || t === REPEAT_BAR)
}

/** Blank cells after a written line's bars, to the next multiple of four; the ones past a multiple of two are for wide rows only. */
export function padsAfter(count: number): ('pad-both' | 'pad-wide')[] {
  const toFour = (4 - (count % 4)) % 4
  const toTwo = count % 2
  return Array.from({ length: toFour }, (_, i) => (i < toTwo ? 'pad-both' : 'pad-wide'))
}

/**
 * A written line's bars, the chords in each. Bar lines divide them; chords
 * before the first bar line or after the last are a bar of their own, % is
 * a whole bar, and two bar lines together leave no empty bar.
 */
export function barsOf(tokens: string[]): string[][] {
  const bars: string[][] = []
  let bar: string[] = []
  const close = () => {
    if (bar.length > 0) bars.push(bar)
    bar = []
  }
  for (const token of tokens) {
    if (token === BAR) close()
    else if (token === REPEAT_BAR) {
      close()
      bars.push([REPEAT_BAR])
    } else if (isRepeatCount(token) && bar.length === 0 && bars.length > 0) bars[bars.length - 1].push(token)
    else bar.push(token)
  }
  close()
  return bars
}

/**
 * ChordPro grid writing made plain: a bar line is a token of its own however
 * it was typed ("C|G", "||"). The dots stay: each one is a beat.
 */
export function fromGrid(text: string): string {
  return text.replace(/\|+/g, ' | ')
}

/** A beat with no new chord on it: the chord before it carries on, or the beat is empty. */
export const BEAT = '.'

/** A chord in a bar: the beat it starts on and how many beats it lasts. */
export interface BarChord {
  token: string
  start: number
  length: number
}

/** A bar laid out on its beats; `dotted` is true when the writer gave the beats with dots. */
export interface BarBeats {
  beats: number
  chords: BarChord[]
  dotted: boolean
}

/**
 * A bar's chords placed on its beats. With dots, every token (chord or dot)
 * is one beat and a chord lasts until the next chord or the end of the bar;
 * dots before the first chord are empty beats. Without dots, each chord is
 * one beat. % and repeat counts like (x2) take no beat of their own, but a
 * bar that is only % is one beat long.
 */
export function beatsOf(bar: string[]): BarBeats {
  if (bar.length === 1 && bar[0] === REPEAT_BAR) return { beats: 1, dotted: false, chords: [] }
  const tokens = bar.filter(t => t !== REPEAT_BAR && !isRepeatCount(t))
  const dotted = tokens.includes(BEAT)
  const chords: BarChord[] = []
  tokens.forEach((token, i) => {
    if (token === BEAT) return
    chords.push({ token, start: i, length: 1 })
  })
  if (dotted) {
    chords.forEach((c, i) => {
      c.length = (i + 1 < chords.length ? chords[i + 1].start : tokens.length) - c.start
    })
  } else {
    chords.forEach((c, i) => {
      c.start = i
    })
  }
  return { beats: tokens.length, dotted, chords }
}
