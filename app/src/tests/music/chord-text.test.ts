import { describe, it, expect } from 'vitest'
import { parseChordText, formatChordText, normalizeChordText, unknownChords, isChordToken } from '../../music/chord-text'

describe('chord text', () => {
  it('reads lines and chords, however they are spaced', () => {
    expect(parseChordText('Gb  Abm7\n  Ebm Abm  ')).toEqual([['Gb', 'Abm7'], ['Ebm', 'Abm']])
  })

  it('keeps a line break between chords instead of joining the chords', () => {
    // Regression: Return in the old editor was dropped, so "A D" Return "E B" saved as "A DE B"
    expect(normalizeChordText('A  D\nE  B')).toBe('A  D\nE  B')
    expect(parseChordText('A  D\nE  B')).toEqual([['A', 'D'], ['E', 'B']])
  })

  it('writes two spaces between chords and one line break between lines', () => {
    expect(formatChordText([['Gb', 'Abm7'], ['Ebm', 'Abm']])).toBe('Gb  Abm7\nEbm  Abm')
    expect(normalizeChordText('Gb Abm7\nEbm   Abm')).toBe('Gb  Abm7\nEbm  Abm')
  })

  it('takes every kind of line ending and space a phone or a paste can bring', () => {
    expect(normalizeChordText('A\r\nD\rE\u2028B')).toBe('A\nD\nE\nB')
    expect(normalizeChordText('A\u00a0 D\tE')).toBe('A  D  E')
    // An invisible character is dropped, not turned into a gap
    expect(normalizeChordText('D\u200bE')).toBe('DE')
  })

  it('trims the ends and keeps at most one blank line between groups', () => {
    expect(normalizeChordText('  A  D  \n\n\n')).toBe('A  D')
    expect(normalizeChordText('\n\nA\n\n\n\nD')).toBe('A\n\nD')
  })

  it('turns flat and sharp signs into the letters the chart uses', () => {
    expect(normalizeChordText('B\u266d  F\u266fm')).toBe('Bb  F#m')
  })

  it('is stable: tidying tidy text changes nothing', () => {
    const tidy = 'Gb  Gb/Db  Gb  Gb/Db\nGb  Ebm  Abm  Gb  (x2)'
    expect(normalizeChordText(tidy)).toBe(tidy)
  })

  it('has no chords in an empty line', () => {
    expect(parseChordText('')).toEqual([])
    expect(normalizeChordText('  \n ')).toBe('')
  })
})

describe('checking chords', () => {
  it('knows chords, slash chords, songbook spellings and chart marks', () => {
    for (const token of ['Gb', 'Ebm', 'Abm7', 'Gb/Db', 'Bb(b5)', 'C6/9', 'Edim7/D', 'F#7#5', 'Cm(maj7)', 'Am11', 'N.C.', '(x2)', '|']) {
      expect(isChordToken(token), token).toBe(true)
    }
  })

  it('does not know what two chords fused into', () => {
    expect(isChordToken('DE')).toBe(false)
    expect(isChordToken('GAm7')).toBe(false)
    expect(isChordToken('H')).toBe(false)
  })

  it('lists each unknown chord once, in the order it appears', () => {
    expect(unknownChords('Gb  DE  Gb/Db\nN.C.  (x2)  Xyz  DE  Abm7')).toEqual(['DE', 'Xyz'])
  })

  it('finds nothing wrong with the charts the app ships', async () => {
    const { DEFAULT_SONGS } = await import('../../data/songs')
    const wrong: string[] = []
    for (const song of DEFAULT_SONGS) {
      for (const section of song.sections) {
        for (const token of unknownChords(section.chords)) wrong.push(`${song.title} / ${section.name}: ${token}`)
      }
    }
    expect(wrong).toEqual([])
  })
})
