import type { CSSProperties } from 'react'
import { sectionColor } from '../../music/theory'

interface SectionRowProps {
  name: string
  chords: string
  fontSize: number
}

export function SectionRow({ name, chords, fontSize }: SectionRowProps) {
  const labelStyle: CSSProperties = {
    minWidth: 72,
    maxWidth: 90,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: sectionColor(name),
    flexShrink: 0,
  }

  const chordsStyle: CSSProperties = {
    fontSize,
    fontWeight: 'bold',
    letterSpacing: 1,
    wordSpacing: 14,
    whiteSpace: 'pre-wrap',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={labelStyle}>{name}</span>
      <span style={chordsStyle}>{chords}</span>
    </div>
  )
}
