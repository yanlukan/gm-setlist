import type { Section, Song, SongEdits } from '../types'
import { isChartMark, keySpelling, shouldUseFlats, transposeChord, transposeInKey } from './theory'
import { transposeFor } from './setlist-text'
import { parseChordText } from './chord-text'
import type { Guitar } from './voicings'

/** What the player plays: the keyboard player needs chords, not shapes. */
export type Instrument = 'guitar' | 'keyboard'

/** How the player wants chords shown: the same for every song. */
export interface ChartView {
  /** Plain chords only: Cmaj7 as C on acoustic, as Cmaj7 still on electric. */
  simple: boolean
  /**
   * The guitar for every song, or 'auto' for each song's own: acoustic for a
   * song played on the acoustic sound, electric for the rest. A guitar set
   * on the song itself wins over both.
   */
  guitar: Guitar | 'auto'
  /** The keyboard reads every chord as it sounds: no capo, no shapes. */
  instrument: Instrument
}

export const DEFAULT_VIEW: ChartView = { simple: false, guitar: 'auto', instrument: 'guitar' }

/**
 * The guitar a song is played on: the player's choice for the song, else
 * their choice for every song, else the song's sound. The GX-10 is an
 * electric multi-effects unit, so a song with a preset is electric unless
 * that preset is the acoustic one; a song with none is acoustic.
 */
export function guitarFor(song: Song | undefined, edits: SongEdits | undefined, view: ChartView): Guitar {
  if (edits?.guitar) return edits.guitar
  if (view.guitar !== 'auto') return view.guitar
  if (!song?.preset) return 'acoustic'
  return song.preset.name === 'ACOUSTIC' ? 'acoustic' : 'electric'
}

/** The highest capo offered: past the 7th fret the neck runs out of chords. */
export const MAX_CAPO = 7

/**
 * The capo the player set for this song, else the song's own, else none. A
 * keyboard has no capo: it plays what sounds, whatever the guitarist does.
 */
export function capoFor(song: Song | undefined, edits?: SongEdits, view?: ChartView): number {
  if (view?.instrument === 'keyboard') return 0
  return edits?.capo ?? song?.capo ?? 0
}

/**
 * How far the chords on screen are from the chart as stored: the band's key
 * (or the player's transpose), then down by the capo, since with a capo on
 * the 2nd fret a D chord is played with a C shape.
 */
export function shapeShift(song: Song | undefined, edits?: SongEdits, view?: ChartView): number {
  return transposeFor(song, edits) - capoFor(song, edits, view)
}

/** The key the shapes are in: with a capo on 2, a song in D is played in C shapes. */
export function shapeKey(key: string, shift: number): string {
  if (!shift || !key) return key
  return transposeChord(key, shift, shouldUseFlats(key, shift), keySpelling(key, shift).letterShift)
}

/**
 * A chord made simpler for the guitar it is played on, without a slash bass
 * (the bass player has it).
 *
 * Acoustic: the plain major, minor, diminished, augmented or suspended
 * chord. Cmaj7 is C, Am9 is Am, Bm7b5 is Bdim, D7sus4 is Dsus4, G/B is G.
 *
 * Electric: the 7ths and 9ths stay, as they are the sound of the part; only
 * what is past a 9th goes. A13 is A9, Am11 is Am9, Cmaj13 is Cmaj9,
 * E7#9 is E7, Am7/G is Am7.
 */
export function simplifyChord(chord: string, guitar: Guitar = 'acoustic'): string {
  if (isChartMark(chord)) return chord
  const m = chord.match(/^([A-G][#b]?)([^/]*)(?:\/.*)?$/)
  if (!m) return chord
  const [, root, rawQuality] = m
  const quality = rawQuality.replace(/[()]/g, '')
  if (guitar === 'electric') {
    const kept = electricQuality(quality)
    if (kept !== null) return root + kept
  }
  if (/^(m7b5|ø|dim|°|o7?$)/.test(quality)) return `${root}dim`
  if (/^(aug|\+)/.test(quality) || /#5/.test(quality)) return `${root}aug`
  if (/^(m|min|-)(?!aj)/.test(quality)) return `${root}m`
  if (/sus2/.test(quality) && !/sus4/.test(quality)) return `${root}sus2`
  if (/sus/.test(quality)) return `${root}sus4`
  if (quality === '5') return `${root}5`
  return root
}

/**
 * A chord's quality cut back to a 9th at most, or null where nothing past a
 * triad is kept (the acoustic rule then decides).
 */
function electricQuality(q: string): string | null {
  const minor = /^(m|min|-)(?!aj)/.test(q)
  const major7 = /maj|M7|Δ/.test(q)
  const natural9 = /(^|[^b#])(9|11|13)/.test(q) // a 9th, or past it: not the altered b9 or #9
  if (/^(m7b5|ø)/.test(q)) return 'm7b5'
  if (/^(dim7|°7|o7)$/.test(q)) return 'dim7'
  if (/add(9|2)/.test(q)) return minor ? 'madd9' : 'add9'
  if (/sus/.test(q) && /7|9|11|13/.test(q)) return '7sus4'
  if (/^(aug|\+)/.test(q)) return /7/.test(q) ? 'aug7' : null
  if (major7) return (minor ? 'mmaj' : 'maj') + (natural9 ? '9' : '7')
  if (natural9 && !/^6/.test(q) && !/69|6\/9/.test(q)) return minor ? 'm9' : '9'
  if (/7/.test(q)) return minor ? 'm7' : '7'
  if (/6/.test(q)) return minor ? 'm6' : '6'
  return null
}

/** Every chord in a chord line made simpler for its guitar, spacing kept. */
export function simplifyText(text: string, guitar: Guitar = 'acoustic'): string {
  return text
    .split(/(\s+)/)
    .map(token => (token.trim() === '' ? token : simplifyChord(token, guitar)))
    .join('')
}

/**
 * The chart at the pitch it is played from: the band's key, less the capo.
 * This is what the editor shows and writes back through.
 */
export function shapeSections(song: Song, edits: SongEdits | undefined, view?: ChartView): Section[] {
  const sections = edits?.sections ?? song.sections ?? []
  const shift = shapeShift(song, edits, view)
  if (!shift) return sections
  const key = edits?.key ?? song.key ?? ''
  return sections.map(section => ({ name: section.name, chords: transposeInKey(section.chords, key, shift) }))
}

/** The chords of a song as the chart shows them, once each in order, without marks like N.C. */
export function songChordsOf(song: Song, edits: SongEdits | undefined, view?: ChartView): string[] {
  const chords = shapeSections(song, edits, view).flatMap(s => parseChordText(s.chords).flat())
  return [...new Set(chords.filter(c => !isChartMark(c)))]
}

/**
 * Which simplify rule a song gets: its guitar's, or the plain acoustic rule
 * on the keyboard, where a 7th is colour the player adds, not the part.
 */
export function simplifyRuleFor(song: Song | undefined, edits: SongEdits | undefined, view: ChartView): Guitar {
  return view.instrument === 'keyboard' ? 'acoustic' : guitarFor(song, edits, view)
}

/** The chart as it is read: at the shapes' pitch, and simpler if the player asked for that. */
export function shownSections(song: Song, edits: SongEdits | undefined, view: ChartView): Section[] {
  const sections = shapeSections(song, edits, view)
  if (!view.simple) return sections
  const rule = simplifyRuleFor(song, edits, view)
  return sections.map(section => ({ ...section, chords: simplifyText(section.chords, rule) }))
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
