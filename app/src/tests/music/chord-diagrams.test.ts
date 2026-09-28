import { describe, it, expect } from 'vitest'
import { CHORD_DB, lookupChord } from '../../data/chords-db'
import { DEFAULT_SONGS } from '../../data/songs'
import { transposeText, shouldUseFlats } from '../../music/theory'

describe('chord diagrams', () => {
  it('has a real diagram for every chord in the set, in the keys the band plays', () => {
    const missing: string[] = []
    for (const song of DEFAULT_SONGS) {
      const k = song.transpose ?? 0
      for (const section of song.sections) {
        const shown = k ? transposeText(section.chords, k, shouldUseFlats(song.key, k)) : section.chords
        for (const chord of shown.split(/\s+/).filter(Boolean)) {
          if (/^N\.?C\.?$/i.test(chord)) continue // "no chord" is an instruction, not a chord
          const plain = chord.replace(/\/[A-G][#b]?$/, '')
          if (!CHORD_DB[chord] && !CHORD_DB[plain]) missing.push(`${chord} in ${song.title}`)
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

  it('has no diagram for things that are not chords', () => {
    expect(lookupChord('N.C.')).toBeUndefined()
    expect(lookupChord('')).toBeUndefined()
  })
})
