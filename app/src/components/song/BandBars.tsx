import type { ReactNode } from 'react'
import { barsOf, hasBars, isRepeatCount, padsAfter, REPEAT_BAR } from '../../music/bars'

interface Props {
  /** The section's lines, as written. */
  lines: string[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

type Cell =
  | { kind: 'plain'; text: string }
  | { kind: 'pad'; className: 'pad-both' | 'pad-wide' }
  | { kind: 'bar'; tokens: string[]; classes: string[] }

/** Chords in a bar, leaving out % and repeat counts. */
const chordCount = (bar: string[]) => bar.filter(t => t !== REPEAT_BAR && !isRepeatCount(t)).length

/**
 * One cell per bar. Each written line is padded with blank cells to a
 * multiple of four, so every line starts a row and bar 1 of every line is in
 * the first column, in rows of four, eight or two.
 */
function layOut(lines: string[]): Cell[] {
  const cells: Cell[] = []
  let column = 0
  lines.forEach((line, li) => {
    const tokens = line.split(/\s+/).filter(Boolean)
    if (!hasBars(tokens)) {
      // N.C., a blank line or a line not in bars runs across the whole row
      cells.push({ kind: 'plain', text: line })
      column = 0
      return
    }
    const bars = barsOf(tokens)
    bars.forEach((bar, bi) => {
      const classes = ['bar']
      if (bi === 0) classes.push('bar-first')
      if (bi === bars.length - 1) classes.push('bar-last')
      // The double bar where the section starts
      if (li === 0 && bi === 0) classes.push('bar-double')
      if (chordCount(bar) > 1) classes.push('bar-shared')
      // Halfway along an eight-bar row: the line between the two phrases is the stronger one
      if (column % 8 === 4) {
        classes.push('phrase-start')
        const before = cells[cells.length - 1]
        if (before?.kind === 'bar') before.classes.push('phrase-end')
      }
      cells.push({ kind: 'bar', tokens: bar, classes })
      column++
    })
    for (const pad of padsAfter(bars.length)) {
      cells.push({ kind: 'pad', className: pad })
      column++
    }
  })
  return cells
}

/** A section's bars, as cells of the band's grid. */
export function BandBars({ lines, renderTokens }: Props) {
  return (
    <div className="bar-grid">
      {layOut(lines).map((cell, i) => {
        if (cell.kind === 'plain') return <div key={i} className="chart-line bar-plain">{renderTokens(cell.text)}</div>
        if (cell.kind === 'pad') return <div key={i} className={`bar-pad ${cell.className}`} aria-hidden="true" />
        return (
          <div key={i} className={cell.classes.join(' ')}>
            {cell.tokens.map((token, ti) => {
              if (token === REPEAT_BAR) return <span key={ti} className="bar-repeat" aria-label="Repeat the bar before">%</span>
              if (isRepeatCount(token)) return <span key={ti} className="chart-mark bar-count">{token}</span>
              return <span key={ti} className="bar-chord">{renderTokens(token)}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}
