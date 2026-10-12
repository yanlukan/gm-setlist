import type { ReactNode } from 'react'
import { barsOf, hasBars, isRepeatCount, REPEAT_BAR } from '../../music/bars'

interface Props {
  /** The section's lines, as written. */
  lines: string[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

/**
 * A section written in bars: a box for each bar, every box as wide as the
 * widest in the section, so bar 1 of every line stands in the same column.
 * Two chords in a bar share it evenly. A line without bars (N.C., or one
 * left blank) runs across the whole width.
 */
export function BarGrid({ lines, renderTokens }: Props) {
  const rows = lines.map(line => line.split(/\s+/).filter(Boolean))
  const columns = Math.max(1, ...rows.filter(row => hasBars(row)).map(row => barsOf(row).length))
  return (
    <div className="bar-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {rows.map((row, li) => {
        if (!hasBars(row)) return <div key={li} className="chart-line bar-plain">{renderTokens(lines[li])}</div>
        const bars = barsOf(row)
        return bars.map((bar, bi) => (
          <div
            key={`${li}-${bi}`}
            className={['bar', bi === 0 ? 'bar-first' : '', bi === bars.length - 1 ? 'bar-last' : ''].filter(Boolean).join(' ')}
          >
            {bar.map((token, ti) =>
              token === REPEAT_BAR ? (
                <span key={ti} className="bar-repeat" aria-label="Repeat the bar before">%</span>
              ) : isRepeatCount(token) ? (
                <span key={ti} className="chart-mark bar-count">{token}</span>
              ) : (
                <span key={ti} className="bar-chord">{renderTokens(token)}</span>
              ))}
          </div>
        ))
      })}
    </div>
  )
}
