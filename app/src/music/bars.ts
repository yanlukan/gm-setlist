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
 * it was typed ("C|G", "||"), and the dots that stand for beats go.
 */
export function fromGrid(text: string): string {
  return text.replace(/\|+/g, ' | ').replace(/(^|\s)\.+(?=\s|$)/gm, '$1')
}
