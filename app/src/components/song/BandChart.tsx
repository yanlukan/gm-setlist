import type { CSSProperties, ReactNode } from 'react'
import { sectionLetters } from '../../music/letters'
import { sectionColor } from '../../music/theory'
import { BandBars } from './BandBars'

interface Props {
  sections: readonly { name: string; chords: string }[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
  /** A tag under a section's name, by section name: "CTL1 ON · SOLO", "CTL1 OFF". */
  tags?: ReadonlyMap<string, string>
  /** A mark drawn inside a bar, by the section's index and the bar's number in it. */
  markFor?: (section: number, bar: number) => ReactNode
}

/**
 * A chart in bands: each section a band tinted in its colour, its letter
 * (A, B, C in chart order) and name in a gutter beside its bars.
 */
export function BandChart({ sections, renderTokens, tags, markFor }: Props) {
  const letters = sectionLetters(sections.map(s => s.name))
  return (
    <>
      {sections.map((section, i) => (
        <div key={i} className="band" style={{ '--band': sectionColor(section.name) } as CSSProperties}>
          <div className="band-head">
            <span className="band-letter" aria-hidden="true">{letters[i]}</span>
            <div className="chart-label">{section.name}</div>
            {tags?.get(section.name) && <Ctl1Tag text={tags.get(section.name)!} />}
          </div>
          <div className="chart-chords">
            <BandBars lines={section.chords.trim() ? section.chords.split('\n') : []} renderTokens={renderTokens} markFor={markFor && (bar => markFor(i, bar))} />
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * "CTL1 ON · SOLO": where the column is narrow (Stage on its side, a phone)
 * it reads just ON or OFF, filled or outlined.
 */
function Ctl1Tag({ text }: { text: string }) {
  const [state, name] = text.split(' · ')
  const on = state.endsWith('ON')
  return (
    <span className={on ? 'ctl1-tag is-on' : 'ctl1-tag'} aria-label={text}>
      <span className="ctl1-prefix">CTL1 </span>
      {on ? 'ON' : 'OFF'}
      {name && <span className="ctl1-name"> · {name}</span>}
    </span>
  )
}
