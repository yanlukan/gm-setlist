import type { ChordVoicing } from '../data/chords-db'

export interface Fingering {
  /** The finger on each string, low E to high e: 1 index to 4 little, 0 for none. */
  fingers: number[]
  /** The fret (as drawn) the index finger lays across, and the strings it covers. */
  barre: { fret: number; from: number; to: number } | null
}

/**
 * How to hold a shape: the chord library's own fingering where it has one,
 * else worked out the way a guitarist would. The index finger barres the
 * lowest fret when it holds two or more strings there with nothing open or
 * muted under it; the other notes take the next fingers, lowest fret first.
 * Null for a shape that needs more than four fingers.
 */
export function fingering(v: ChordVoicing): Fingering | null {
  const fretted = v.f.flatMap((f, string) => (f !== null && f > 0 ? [{ string, fret: f }] : []))
  if (fretted.length === 0) return { fingers: v.f.map(() => 0), barre: null }

  if (v.fg && v.fg.length === 6) {
    return { fingers: v.fg.map((g, i) => (v.f[i] ? g : 0)), barre: barreOf(v, v.b ?? null, v.fg) }
  }

  const fingers = v.f.map(() => 0)
  const low = Math.min(...fretted.map(n => n.fret))
  const atLow = fretted.filter(n => n.fret === low)
  const from = atLow[0].string
  const to = atLow[atLow.length - 1].string
  // A barre needs every string under it pressed at or above the barred fret,
  // and is only used when the fingers would run out or it holds three strings:
  // open D (x-x-0-2-3-2) is fingered 1-3-2, not barred
  const canBarre = atLow.length >= 2
    && (fretted.length > 4 || atLow.length >= 3)
    && v.f.slice(from, to + 1).every(f => f !== null && f >= low)
  // Five notes and no clean barre: the index still takes every note on the
  // lowest fret, damping the strings between (2-x-4-3-2-4)
  const indexTakesLow = canBarre || (fretted.length > 4 && atLow.length >= 2)
  const rest = indexTakesLow ? fretted.filter(n => n.fret !== low) : fretted
  if (rest.length > (indexTakesLow ? 3 : 4)) return null
  if (indexTakesLow) atLow.forEach(n => { fingers[n.string] = 1 })
  rest
    .sort((a, b) => a.fret - b.fret || a.string - b.string)
    .forEach((n, i) => { fingers[n.string] = i + (indexTakesLow ? 2 : 1) })
  return { fingers, barre: canBarre ? { fret: low, from, to } : null }
}

/** The strings the library's barre covers: every string the index finger holds at that fret. */
function barreOf(v: ChordVoicing, fret: number | null, fg: number[]): Fingering['barre'] {
  if (fret === null) return null
  const held = v.f.flatMap((f, string) => (f === fret && fg[string] === 1 ? [string] : []))
  if (held.length < 2) return null
  return { fret, from: held[0], to: held[held.length - 1] }
}
