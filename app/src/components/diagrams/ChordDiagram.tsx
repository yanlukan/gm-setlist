import type { ChordVoicing } from '../../data/chords-db'
import { fingering } from '../../music/fingering'

interface ChordDiagramProps {
  voicing: ChordVoicing
  size?: number
}

export function ChordDiagram({ voicing, size = 120 }: ChordDiagramProps) {
  const h = size * 1.17
  const padding = { top: 20, left: 22, right: 10, bottom: 10 }
  const gridW = size - padding.left - padding.right
  const gridH = h - padding.top - padding.bottom
  const stringSpacing = gridW / 5
  const fretSpacing = gridH / 5
  const circleR = stringSpacing * 0.4
  const atNut = voicing.s === 0
  // Which finger goes where, and the index-finger barre, so the shape reads as a chord to hold
  const hold = fingering(voicing)
  const fretY = (fret: number) => padding.top + (fret - 0.5) * fretSpacing

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} role="img" aria-label={describeHold(voicing)}>
      {/* Fret lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={padding.left}
          y1={padding.top + i * fretSpacing}
          x2={padding.left + gridW}
          y2={padding.top + i * fretSpacing}
          style={{ stroke: 'var(--diagram-line)' }}
          strokeWidth={1}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`str-${i}`}
          x1={padding.left + i * stringSpacing}
          y1={padding.top}
          x2={padding.left + i * stringSpacing}
          y2={padding.top + gridH}
          style={{ stroke: 'var(--diagram-line)' }}
          strokeWidth={1}
        />
      ))}

      {/* Nut or fret position label */}
      {atNut ? (
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left + gridW}
          y2={padding.top}
          style={{ stroke: 'var(--text)' }}
          strokeWidth={3}
        />
      ) : (
        <text
          x={padding.left - 6}
          y={padding.top + fretSpacing * 0.5}
          textAnchor="end"
          style={{ fill: 'var(--text-muted)' }}
          fontSize={9}
          dominantBaseline="central"
        >
          {voicing.s}fr
        </text>
      )}

      {/* String markers */}
      {voicing.f.map((fret, i) => {
        const cx = padding.left + i * stringSpacing

        if (fret === null) {
          // Muted string
          return (
            <text
              key={`m-${i}`}
              x={cx}
              y={padding.top - 7}
              textAnchor="middle"
              style={{ fill: 'var(--text-muted)' }}
              fontSize={10}
              dominantBaseline="auto"
            >
              x
            </text>
          )
        }

        if (fret === 0) {
          // Open string
          return (
            <circle
              key={`o-${i}`}
              cx={cx}
              cy={padding.top - 7}
              r={circleR * 0.7}
              fill="none"
              style={{ stroke: 'var(--text)' }}
              strokeWidth={1.5}
            />
          )
        }

        // Under the barre: the bar is drawn for it
        if (hold?.barre && fret === hold.barre.fret && i >= hold.barre.from && i <= hold.barre.to && hold.fingers[i] === 1) {
          return null
        }

        // Fretted note — fret values are already relative to the grid position
        const finger = hold?.fingers[i] ?? 0
        return (
          <g key={`f-${i}`}>
            <circle cx={cx} cy={fretY(fret)} r={circleR} style={{ fill: 'var(--text)' }} />
            {finger > 0 && (
              <text
                x={cx}
                y={fretY(fret)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={circleR * 1.35}
                fontWeight={700}
                style={{ fill: 'var(--bg)' }}
              >
                {finger}
              </text>
            )}
          </g>
        )
      })}

      {/* The index finger laid across the strings */}
      {hold?.barre && (
        <g>
          <rect
            x={padding.left + hold.barre.from * stringSpacing - circleR}
            y={fretY(hold.barre.fret) - circleR}
            width={(hold.barre.to - hold.barre.from) * stringSpacing + circleR * 2}
            height={circleR * 2}
            rx={circleR}
            style={{ fill: 'var(--text)' }}
          />
          <text
            x={padding.left + ((hold.barre.from + hold.barre.to) / 2) * stringSpacing}
            y={fretY(hold.barre.fret)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={circleR * 1.35}
            fontWeight={700}
            style={{ fill: 'var(--bg)' }}
          >
            1
          </text>
        </g>
      )}
    </svg>
  )
}

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']

/** The shape in words, for screen readers and tests: "x-3-2-0-1-0, barre at fret 1". */
function describeHold(v: ChordVoicing): string {
  const frets = v.f.map(f => (f === null ? 'x' : f === 0 ? 0 : v.s === 0 ? f : v.s + f - 1)).join('-')
  const hold = fingering(v)
  if (!hold) return frets
  const barre = hold.barre
    ? `, barre at fret ${v.s === 0 ? hold.barre.fret : v.s + hold.barre.fret - 1} from ${STRING_NAMES[hold.barre.from]} to ${STRING_NAMES[hold.barre.to]}`
    : ''
  return `${frets}${barre}`
}
