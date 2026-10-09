import { describe, expect, it } from 'vitest'
import { chordSuggestions, normalizeChordName, QUALITY_GROUPS } from '../../music/chord-names'

describe('a typed chord name', () => {
  it('is tidied to the name the charts use', () => {
    expect(normalizeChordName('em11')).toBe('Em11')
    expect(normalizeChordName('E min 11')).toBe('Em11')
    expect(normalizeChordName('E-11')).toBe('Em11')
    expect(normalizeChordName('FΔ7')).toBe('Fmaj7')
    expect(normalizeChordName('bbm7b5')).toBe('Bbm7b5')
    expect(normalizeChordName('c/e')).toBe('C/E')
    expect(normalizeChordName(' A(b9) ')).toBe('A7b9')
    expect(normalizeChordName('F♯m')).toBe('F#m')
    expect(normalizeChordName('DMaj7')).toBe('Dmaj7')
    expect(normalizeChordName('G SUS4')).toBe('Gsus4')
  })

  it('is nothing when it is not a chord', () => {
    expect(normalizeChordName('Hm')).toBeNull()
    expect(normalizeChordName('nonsense')).toBeNull()
    expect(normalizeChordName('')).toBeNull()
    expect(normalizeChordName('Em99')).toBeNull()
  })
})

describe('chord suggestions while typing', () => {
  it('finish the quality being typed', () => {
    expect(chordSuggestions('Em1')).toEqual(['Em11', 'Em13'])
    expect(chordSuggestions('em1')).toEqual(['Em11', 'Em13'])
    expect(chordSuggestions('Bbm7')).toEqual(['Bbm7', 'Bbm7b5'])
  })

  it('offer the song\'s own chords first, once, and at most eight', () => {
    const got = chordSuggestions('E', ['Em7', 'A', 'E', 'Em7'])
    expect(got.slice(0, 2)).toEqual(['Em7', 'E'])
    expect(new Set(got).size).toBe(got.length)
    expect(got.length).toBe(8)
    expect(got.every(c => c.startsWith('E'))).toBe(true)
  })

  it('skip words in the song that are not chords, like the one being typed', () => {
    expect(chordSuggestions('em1', ['em1', 'Em11', 'B'])).toEqual(['Em11', 'Em13'])
  })

  it('offer nothing for something that is not a chord', () => {
    expect(chordSuggestions('xyz')).toEqual([])
    expect(chordSuggestions('')).toEqual([])
  })
})

describe('the qualities the keyboard offers', () => {
  it('are grouped, and every one is a chord the app knows', () => {
    expect(QUALITY_GROUPS.map(g => g.label)).toEqual(['Triads', 'Sixths', 'Sevenths', 'Ninths and up', 'Suspended', 'Altered'])
    for (const group of QUALITY_GROUPS) {
      for (const q of group.qualities) expect(normalizeChordName('C' + q), q).toBe('C' + q)
    }
    expect(QUALITY_GROUPS.flatMap(g => g.qualities)).toContain('m13')
  })
})
