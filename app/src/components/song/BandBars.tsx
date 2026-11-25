import type { CSSProperties, ReactNode } from 'react'
import { barsOf, BEAT, beatsOf, hasBars, isRepeatCount, padsAfter, REPEAT_BAR } from '../../music/bars'
import { isChartMark } from '../../music/theory'

interface Props {
  /** The section's lines, as written. */
  lines: string[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
  /** A mark drawn inside a bar, by its number in the section (every bar of every line in bars, from 0). */
  markFor?: (bar: number) => ReactNode
}

type Cell =
  | { kind: 'plain'; text: string }
  | { kind: 'pad'; className: string }
  | { kind: 'bar'; tokens: string[]; classes: string[]; held?: string; number: number }

/** A line of one or two bars shares an eight-bar row with the line after it. */
const SHORT = 2

/**
 * One cell per bar. Each written line is padded with blank cells to a
 * multiple of four, so every line starts a row and bar 1 of every line is in
 * the first column, in rows of four or two. A row of eight is laid out a
 * little differently: a line of one or two bars is followed straight away by
 * the next line when both fit in the row, so the row has no hole in its
 * middle and reads left to right; the blank cells come at its end. The cells
 * only one of the two rows draws are pad-four and pad-eight (bands.css).
 * A bar of only dots holds the chord still sounding: the section's last chord
 * before it, across bar lines and lines in bars; none at the section's start,
 * after N.C. or after a line not in bars.
 */
function layOut(lines: string[]): Cell[] {
  const cells: Cell[] = []
  // Where the next cell goes on a row of eight
  let column = 0
  let sounding: string | undefined
  let number = 0
  const barLines = lines.map(line => {
    const tokens = line.split(/\s+/).filter(Boolean)
    return hasBars(tokens) ? barsOf(tokens) : null
  })
  lines.forEach((line, li) => {
    const bars = barLines[li]
    if (!bars) {
      // N.C., a blank line or a line not in bars runs across the whole row
      cells.push({ kind: 'plain', text: line })
      column = 0
      sounding = undefined
      return
    }
    bars.forEach((bar, bi) => {
      const classes = ['bar']
      if (bi === 0) classes.push('bar-first')
      if (bi === bars.length - 1) classes.push('bar-last')
      // The double bar where the section starts
      if (li === 0 && bi === 0) classes.push('bar-double')
      if (beatsOf(bar).chords.length > 1) classes.push('bar-shared')
      // A line, or the second four bars of a long one, starting part-way along an
      // eight-bar row: the line between the two phrases is the stronger one
      if (bi % 4 === 0 && column % 8 !== 0) {
        classes.push('phrase-start')
        // The cell before it on a row of eight
        const before = [...cells].reverse().find(c => !(c.kind === 'pad' && c.className.includes('pad-four')))
        if (before?.kind === 'bar') before.classes.push('phrase-end')
      }
      const { chords } = beatsOf(bar)
      const last = chords[chords.length - 1]?.token
      if (last !== undefined) sounding = isChartMark(last) ? undefined : last
      const held = chords.length === 0 && bar.includes(BEAT) ? sounding : undefined
      cells.push({ kind: 'bar', tokens: bar, classes, held, number: number++ })
      column++
    })
    // The blank cells of a row of four, and how many of them a row of eight draws
    const four = padsAfter(bars.length)
    const next = barLines[li + 1]
    const joins = bars.length <= SHORT && !!next && column % 8 !== 0 && (column % 8) + next.length <= 8
    const eight = joins ? 0 : (4 - (column % 4)) % 4
    four.forEach((pad, i) => cells.push({ kind: 'pad', className: i < eight ? pad : `${pad} pad-four` }))
    for (let i = four.length; i < eight; i++) cells.push({ kind: 'pad', className: 'pad-eight' })
    column += eight
  })
  return cells
}

/** A section's bars, as cells of the band's grid. */
export function BandBars({ lines, renderTokens, markFor }: Props) {
  return (
    <div className="bar-grid">
      {layOut(lines).map((cell, i) => {
        if (cell.kind === 'plain') return <div key={i} className="chart-line bar-plain">{renderTokens(cell.text)}</div>
        if (cell.kind === 'pad') return <div key={i} className={`bar-pad ${cell.className}`} aria-hidden="true" />
        // The bar is a grid of its beats: each chord starts in the column of its beat
        const { beats, chords } = beatsOf(cell.tokens)
        // A bar with a mark keeps room clear for it on the right
        const mark = markFor?.(cell.number)
        const style = { '--beats': Math.max(beats, 1) } as CSSProperties
        return (
          <div
            key={i}
            className={(mark ? [...cell.classes, 'bar-marked'] : cell.classes).join(' ')}
            style={style}
            data-beats={beats}
            // Its chords as written: the fit draws bars of a section with the same ones the same way
            data-chords={cell.tokens.filter(t => !isRepeatCount(t)).join(' ')}
          >
            {cell.held !== undefined && (
              // The chord still sounding, muted: a held bar never reads as empty
              <span className="bar-chord bar-held" data-start={0} style={{ '--start': 1, '--span': Math.max(beats, 1) } as CSSProperties}>
                {cell.held}
              </span>
            )}
            {chords.map(chord => (
              <span
                key={chord.start}
                className="bar-chord"
                data-start={chord.start}
                style={{ '--start': chord.start + 1, '--span': chord.length } as CSSProperties}
              >
                {renderTokens(chord.token)}
              </span>
            ))}
            {cell.tokens.map((token, ti) => {
              if (token === REPEAT_BAR) return <span key={ti} className="bar-repeat" aria-label="Repeat the bar before">%</span>
              if (isRepeatCount(token)) return <span key={ti} className="chart-mark bar-count">{token}</span>
              return null
            })}
            {mark}
          </div>
        )
      })}
    </div>
  )
}
