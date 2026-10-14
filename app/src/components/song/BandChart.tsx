import type { CSSProperties, ReactNode } from 'react'
import { sectionLetters } from '../../music/letters'
import { sectionColor } from '../../music/theory'
import { BandBars } from './BandBars'

interface Props {
  sections: readonly { name: string; chords: string }[]
  /** Headers are buttons: tap one to see just that section's chord shapes. */
  focusable: boolean
  /** The section whose shapes are showing, or null. */
  focusedIndex: number | null
  onFocus: (index: number | null) => void
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

/**
 * A chart in bands: each section a band tinted in its colour, its letter
 * (A, B, C in chart order) and name in a gutter beside its bars.
 */
export function BandChart({ sections, focusable, focusedIndex, onFocus, renderTokens }: Props) {
  const letters = sectionLetters(sections.map(s => s.name))
  return (
    <>
      {sections.map((section, i) => {
        const focused = focusedIndex === i
        return (
          <div key={i} className="band" style={{ '--band': sectionColor(section.name) } as CSSProperties}>
            <div className="band-head">
              <span className="band-letter" aria-hidden="true">{letters[i]}</span>
              {focusable ? (
                <button
                  type="button"
                  className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                  aria-pressed={focused}
                  onClick={() => onFocus(focused ? null : i)}
                >
                  {section.name}
                </button>
              ) : (
                <div className="chart-label">{section.name}</div>
              )}
            </div>
            <div className="chart-chords">
              <BandBars lines={section.chords.trim() ? section.chords.split('\n') : []} renderTokens={renderTokens} />
            </div>
          </div>
        )
      })}
    </>
  )
}
