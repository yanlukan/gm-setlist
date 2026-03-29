import type { ChordVoicing } from '../../data/chords-db'

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
  const circleR = stringSpacing * 0.35
  const atNut = voicing.s === 0

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      {/* Fret lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={padding.left}
          y1={padding.top + i * fretSpacing}
          x2={padding.left + gridW}
          y2={padding.top + i * fretSpacing}
          stroke="#555"
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
          stroke="#555"
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
          stroke="#fff"
          strokeWidth={3}
        />
      ) : (
        <text
          x={padding.left - 6}
          y={padding.top + fretSpacing * 0.5}
          textAnchor="end"
          fill="#aaa"
          fontSize={9}
          dominantBaseline="central"
        >
          {voicing.s + 1}fr
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
              fill="#aaa"
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
              stroke="#fff"
              strokeWidth={1.5}
            />
          )
        }

        // Fretted note - fret value is relative to startFret
        const relativeFret = fret - voicing.s
        return (
          <circle
            key={`f-${i}`}
            cx={cx}
            cy={padding.top + (relativeFret - 0.5) * fretSpacing}
            r={circleR}
            fill="#fff"
          />
        )
      })}
    </svg>
  )
}
