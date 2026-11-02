import type { CSSProperties, ReactNode } from 'react'
import { barsOf, beatsOf, hasBars, isRepeatCount, padsAfter, REPEAT_BAR } from '../../music/bars'

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
      if (beatsOf(bar).chords.length > 1) classes.push('bar-shared')
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
        // The bar is a grid of its beats: each chord starts in the column of its beat
        const { beats, chords } = beatsOf(cell.tokens)
        const style = { '--beats': Math.max(beats, 1) } as CSSProperties
        return (
          <div
            key={i}
            className={cell.classes.join(' ')}
            style={style}
            data-beats={beats}
            // Its chords as written: the fit draws bars of a section with the same ones the same way
            data-chords={cell.tokens.filter(t => !isRepeatCount(t)).join(' ')}
          >
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
          </div>
        )
      })}
    </div>
  )
}
