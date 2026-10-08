import type { Section, Song, SongEdits } from '../types'
import { isChartMark, keySpelling, shouldUseFlats, transposeChord, transposeInKey } from './theory'
import { transposeFor } from './setlist-text'
import type { ShapeStyle } from './voicings'

/** How the player wants chords shown: the same for every song. */
export interface ChartView {
  /** Plain chords only: Cmaj7 as C, Am7 as Am, G/B as G. */
  simple: boolean
  /** Whole open and barre chords, or compact shapes up the neck. */
  shapes: ShapeStyle
}

export const DEFAULT_VIEW: ChartView = { simple: false, shapes: 'full' }

/** The highest capo offered: past the 7th fret the neck runs out of chords. */
export const MAX_CAPO = 7

/** The capo the player set for this song, else the song's own, else none. */
export function capoFor(song: Song | undefined, edits?: SongEdits): number {
  return edits?.capo ?? song?.capo ?? 0
}

/**
 * How far the chords on screen are from the chart as stored: the band's key
 * (or the player's transpose), then down by the capo, since with a capo on
 * the 2nd fret a D chord is played with a C shape.
 */
export function shapeShift(song: Song | undefined, edits?: SongEdits): number {
  return transposeFor(song, edits) - capoFor(song, edits)
}

/** The key the shapes are in: with a capo on 2, a song in D is played in C shapes. */
export function shapeKey(key: string, shift: number): string {
  if (!shift || !key) return key
  return transposeChord(key, shift, shouldUseFlats(key, shift), keySpelling(key, shift).letterShift)
}

/**
 * A chord as a beginner would play it: the plain major, minor, diminished,
 * augmented or suspended chord, without sevenths, extensions or a slash
 * bass. Cmaj7 is C, Am9 is Am, Bm7b5 is Bdim, D7sus4 is Dsus4, G/B is G.
 */
export function simplifyChord(chord: string): string {
  if (isChartMark(chord)) return chord
  const m = chord.match(/^([A-G][#b]?)([^/]*)(?:\/.*)?$/)
  if (!m) return chord
  const [, root, rawQuality] = m
  const quality = rawQuality.replace(/[()]/g, '')
  if (/^(m7b5|ø|dim|°|o7?$)/.test(quality)) return `${root}dim`
  if (/^(aug|\+)/.test(quality) || /#5/.test(quality)) return `${root}aug`
  if (/^(m|min|-)(?!aj)/.test(quality)) return `${root}m`
  if (/sus2/.test(quality) && !/sus4/.test(quality)) return `${root}sus2`
  if (/sus/.test(quality)) return `${root}sus4`
  if (quality === '5') return `${root}5`
  return root
}

/** Every chord in a chord line made plain, spacing kept. */
export function simplifyText(text: string): string {
  return text
    .split(/(\s+)/)
    .map(token => (token.trim() === '' ? token : simplifyChord(token)))
    .join('')
}

/**
 * The chart at the pitch it is played from: the band's key, less the capo.
 * This is what the editor shows and writes back through.
 */
export function shapeSections(song: Song, edits: SongEdits | undefined): Section[] {
  const sections = edits?.sections ?? song.sections ?? []
  const shift = shapeShift(song, edits)
  if (!shift) return sections
  const key = edits?.key ?? song.key ?? ''
  return sections.map(section => ({ name: section.name, chords: transposeInKey(section.chords, key, shift) }))
}

/** The chart as it is read: at the shapes' pitch, and plain if the player asked for that. */
export function shownSections(song: Song, edits: SongEdits | undefined, view: ChartView): Section[] {
  const sections = shapeSections(song, edits)
  return view.simple ? sections.map(section => ({ ...section, chords: simplifyText(section.chords) })) : sections
}

/** Root pitch classes of the open chords every guitarist knows. */
const OPEN_SHAPES: Record<string, number[]> = {
  '': [0, 2, 4, 7, 9], // C D E G A
  m: [2, 4, 9], // Dm Em Am
}

/**
 * The capo that leaves the most of a song's chords as open chords, as
 * { capo, open } where `open` is how many of the chords are. Ties go to the
 * lower capo, and no capo wins unless a capo does better.
 */
export function easiestCapo(chords: string[]): { capo: number; open: number } {
  const NOTE: Record<string, number> = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
  }
  const plain = chords
    .filter(c => !isChartMark(c))
    .map(c => simplifyChord(c).match(/^([A-G][#b]?)(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null && NOTE[m[1]] !== undefined)
  let best = { capo: 0, open: -1 }
  for (let capo = 0; capo <= MAX_CAPO; capo++) {
    const open = plain.filter(([, root, quality]) =>
      (OPEN_SHAPES[quality] ?? []).includes((NOTE[root] - capo + 12) % 12)).length
    if (open > best.open) best = { capo, open }
  }
  return best
}
