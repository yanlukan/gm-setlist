import { describe, it, expect } from 'vitest'
import { CHORD_DB, lookupChord, type ChordVoicing } from '../../data/chords-db'
import { DEFAULT_SONGS } from '../../data/songs'
import { transposeInKey } from '../../music/theory'

describe('chord diagrams', () => {
  it('has a real diagram for every chord in the set, in the keys the band plays', () => {
    const missing: string[] = []
    for (const song of DEFAULT_SONGS) {
      const k = song.transpose ?? 0
      for (const section of song.sections) {
        const shown = transposeInKey(section.chords, song.key, k)
        for (const chord of shown.split(/\s+/).filter(Boolean)) {
          // "no chord" and repeat marks like (x3) are instructions, not chords
          if (/^N\.?C\.?$/i.test(chord) || /^\(?x\d+\)?$/i.test(chord)) continue
          // The chord as written, spelled any way (C7(b9), Cb7) — never a simpler stand-in
          if (!lookupChord(chord, { simplify: false })) missing.push(`${chord} in ${song.title}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it.each([
    ['Am(maj7)', 'Ammaj7'],
    ['C-7', 'Cm7'],
    ['Bø', 'Bm7b5'],
    ['E°7', 'Edim7'],
    ['G+', 'Gaug'],
    ['Dmin7', 'Dm7'],
    ['Csus', 'Csus4'],
    ['A6/9', 'A69'],
  ])('reads %s the way it is usually written', (typed, dbName) => {
    expect(lookupChord(typed)).toBe(lookupChord(dbName))
    expect(lookupChord(typed)).toBeDefined()
  })

  it('falls back within the chord family, never from minor to major', () => {
    // F#m13 is not in the database: a minor shape is fine, F# major is not
    const fallback = lookupChord('F#m13')
    expect(fallback).toBeDefined()
    expect(fallback).not.toBe(lookupChord('F#'))
    expect([lookupChord('F#m7'), lookupChord('F#m')]).toContain(fallback)
  })

  it('falls back from an unlisted dominant chord to the plain seventh', () => {
    expect(lookupChord('G7#11')).toBe(lookupChord('G7'))
  })

  it('keeps half-diminished chords half-diminished', () => {
    expect(lookupChord('Am7b5')).not.toBe(lookupChord('A'))
  })

  it('uses a real slash-chord voicing when there is one', () => {
    expect(CHORD_DB['G/B']).toBeDefined()
    expect(lookupChord('G/B')).toBe(CHORD_DB['G/B'])
  })

  it('otherwise shows the chord itself for a slash chord', () => {
    expect(CHORD_DB['Fm7b5/Eb']).toBeUndefined()
    expect(lookupChord('Fm7b5/Eb')).toBe(lookupChord('Fm7b5'))
  })

  it('reads the notes of a diagram correctly, at the nut and up the neck', () => {
    // Checks the helper below against the database itself
    for (const voicing of CHORD_DB['C']) expect(notesOf(voicing)).toEqual(notes('C', 'E', 'G'))
    for (const voicing of CHORD_DB['F#m7']) expect(notesOf(voicing)).toEqual(notes('F#', 'A', 'C#', 'E'))
  })

  it.each([
    ['Cb(b5)', ['B', 'D#', 'F']],
    ['Db(b5)', ['C#', 'F', 'G']],
    ['Db6(b5)', ['C#', 'F', 'G', 'A#']],
    // Down a semitone to D, where the band plays it
    ['Bb(b5)', ['A#', 'D', 'E']],
    ['C(b5)', ['C', 'E', 'F#']],
    ['C6(b5)', ['C', 'E', 'F#', 'A']],
    // Everything She Wants
    ['Esus24', ['E', 'F#', 'A', 'B']],
    // Jesus to a Child
    ['C#sus24', ['C#', 'D#', 'F#', 'G#']],
  ])("plays %s from the songbook with exactly the chord's notes", (chord, expected) => {
    const voicings = lookupChord(chord as string, { simplify: false })
    expect(voicings).toBeDefined()
    for (const voicing of voicings!) expect(notesOf(voicing)).toEqual(notes(...(expected as string[])))
  })

  it('plays any other 6(b5) chord as the m7b5 a tritone away, which has the same notes', () => {
    // E6(b5) is E G# Bb C#, the same four notes as Bbm7b5
    const voicings = lookupChord('E6(b5)', { simplify: false })
    expect(voicings).toBe(CHORD_DB['A#m7b5'] ?? CHORD_DB['Bbm7b5'])
    for (const voicing of voicings!) expect(notesOf(voicing)).toEqual(notes('E', 'G#', 'A#', 'C#'))
  })

  it('never lets an alteration in brackets change the root', () => {
    // Glued straight on, A + b9 reads as Ab9 and C + #9 as C#9
    expect(lookupChord('A(b9)')).toEqual(CHORD_DB['A7b9'])
    expect(lookupChord('E(b9)')).toEqual(CHORD_DB['E7b9'])
    expect(lookupChord('C(#9)')).toEqual(CHORD_DB['C7#9'])
    expect(lookupChord('G(#5)')).toEqual(CHORD_DB['Gaug'])
  })

  it('does not count a stand-in as the chord written', () => {
    expect(lookupChord('A(b9)', { simplify: false })).toBeUndefined() // shown as A7b9
    expect(lookupChord('Gmaj13#11', { simplify: false })).toBeUndefined()
  })

  it('has no diagram for things that are not chords', () => {
    expect(lookupChord('N.C.')).toBeUndefined()
    expect(lookupChord('')).toBeUndefined()
  })
})

const PITCH: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
const notes = (...names: string[]) => [...new Set(names.map(n => PITCH[n]))].sort((a, b) => a - b)

/** The notes a diagram sounds in standard tuning, as sorted pitch classes. */
function notesOf(voicing: ChordVoicing) {
  const open = [4, 9, 2, 7, 11, 4] // E A D G B E
  const sounding = voicing.f.flatMap((f, string) => {
    if (f === null) return []
    const fret = f === 0 ? 0 : voicing.s === 0 ? f : voicing.s + f - 1
    return [(open[string] + fret) % 12]
  })
  return [...new Set(sounding)].sort((a, b) => a - b)
}
