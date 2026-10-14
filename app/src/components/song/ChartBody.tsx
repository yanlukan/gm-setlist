import { Fragment, type Ref } from 'react'
import { isChartMark, sectionColor } from '../../music/theory'
import { hasShapes } from '../../music/voicings'
import { splitAlteration } from '../../music/chord-text'
import type { SongChart } from '../../hooks/use-song-chart'
import { BandChart } from './BandChart'

interface Props {
  chart: SongChart
  /** Practice: a chord with shapes reacts to a tap. Absent on Stage, where nothing on the chart does. */
  onChord?: (chord: string) => void
  /** The chord picked, drawn as picked. */
  picked?: string | null
  /** Practice: a part's name picks the part, to see just its shapes. */
  focus?: { index: number | null; onFocus: (index: number | null) => void }
  sectionsRef?: Ref<HTMLDivElement>
}

/** The chart's parts and chords: the same on both screens, only what reacts to a tap differs. */
export function ChartBody({ chart, onChord, picked = null, focus, sectionsRef }: Props) {
  const { readSections, bands, keyboard, song } = chart
  const focusable = !!focus && !keyboard

  // In bands, a chord's alteration in brackets is drawn a little smaller: Bb7(b9).
  // The tap still picks the whole chord.
  const chordText = (token: string) => {
    const parts = bands ? splitAlteration(token) : null
    return parts ? <>{parts[0]}<span className="chord-alt">{parts[1]}</span></> : token
  }

  const renderTokens = (text: string) =>
    text.split(/(\s+)/).map((token, i) => {
      if (!token.trim()) return <span key={i}>{token}</span>
      if (isChartMark(token)) return <span key={i} className="chart-mark">{token}</span>
      if (!onChord || keyboard || !hasShapes(token)) return <span key={i}>{chordText(token)}</span>
      return (
        <span
          key={i}
          className={token === picked ? 'chart-chord-tap is-picked' : 'chart-chord-tap'}
          onClick={e => {
            e.stopPropagation()
            onChord(token)
          }}
        >
          {chordText(token)}
        </span>
      )
    })

  // Each line is one part. A line too long for the screen goes on indented,
  // so where it wraps never looks like the next part starting. The line break
  // stays in the text, for anything that reads the chart as text.
  const renderChords = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, li) => (
      <div key={li} className="chart-line">
        {renderTokens(line)}
        {li < lines.length - 1 && '\n'}
      </div>
    ))
  }

  return (
    <div ref={sectionsRef} className="chart-sections">
      {bands ? (
        <BandChart
          sections={readSections}
          focusable={focusable}
          focusedIndex={focus?.index ?? null}
          onFocus={focus?.onFocus ?? (() => {})}
          renderTokens={renderTokens}
        />
      ) : (
        readSections.map((section, i) => {
          const focused = focus?.index === i
          return (
            <Fragment key={`${song.title}-${i}`}>
              {focusable ? (
                // Tap a section to see just its chord shapes
                <button
                  type="button"
                  className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                  style={{ color: sectionColor(section.name) }}
                  aria-pressed={focused}
                  onClick={() => focus!.onFocus(focused ? null : i)}
                >
                  {section.name}
                </button>
              ) : (
                <div className="chart-label" style={{ color: sectionColor(section.name) }}>
                  {section.name}
                </div>
              )}
              <div className="chart-chords">{renderChords(section.chords)}</div>
            </Fragment>
          )
        })
      )}
    </div>
  )
}
