import { describe, it, expect } from 'vitest'
import { barsOf, fromGrid, hasBars, padsAfter } from '../../music/bars'
import { parseChordText, normalizeChordText, unknownChords } from '../../music/chord-text'
import { layOutParts } from '../../music/phrases'
import { simplifyText, songChordsOf } from '../../music/chart-view'
import { transposeText } from '../../music/theory'
import { hasShapes } from '../../music/voicings'

const bars = (line: string) => barsOf(line.split(/\s+/).filter(Boolean))

describe('a line written in bars', () => {
  it('splits at the bar lines, two chords sharing a bar', () => {
    expect(bars('|  Cadd9  |  Em11  |  C  G/B  |')).toEqual([['Cadd9'], ['Em11'], ['C', 'G/B']])
  })
  it('makes chords before the first bar line or after the last a bar of their own', () => {
    expect(bars('Cadd9  |  Em11')).toEqual([['Cadd9'], ['Em11']])
  })
  it('makes % a whole bar, and drops an empty bar', () => {
    expect(bars('|  Am  |  %  |  |  F  %')).toEqual([['Am'], ['%'], ['F'], ['%']])
  })
  it('keeps a repeat count with the bar before it', () => {
    expect(bars('|  Am  |  F  |  (x2)')).toEqual([['Am'], ['F', '(x2)']])
  })
  it('knows a line with bars', () => {
    expect(hasBars('C  |  G')).toBe(true)
    expect(hasBars('C  %')).toBe(true)
    expect(hasBars('C  G  N.C.  (x2)')).toBe(false)
  })
})

describe('bars typed or pasted', () => {
  it('reads bar lines typed against a chord, and drops ChordPro beat dots', () => {
    expect(parseChordText('|C . . .|G/B . . .||')).toEqual([['|', 'C', '|', 'G/B', '|']])
    expect(normalizeChordText('C|G\n| Am . . | % |')).toBe('C  |  G\n|  Am  |  %  |')
    expect(fromGrid('|. C . |').split(/\s+/).filter(Boolean)).toEqual(['|', 'C', '|'])
  })
  it('never flags | or % as not a chord', () => {
    expect(unknownChords('|  C  |  %  |')).toEqual([])
  })
})

describe('bars through the rest of the app', () => {
  it('are never laid out by parts', () => {
    expect(layOutParts('|  D  G  C  |  D  G  C  |')).toBe('|  D  G  C  |  D  G  C  |')
  })
  it('survive a key change and plain chords', () => {
    expect(transposeText('|  C  |  %  |', 2, false)).toBe('|  D  |  %  |')
    expect(simplifyText('|  Cmaj7  |  %  |')).toBe('|  C  |  %  |')
  })
  it('are not chords of the song, and have no shapes', () => {
    const song = { title: 'T', key: 'C', sections: [{ name: 'Verse', chords: '|  C  |  %  |  G  |' }] }
    expect(songChordsOf(song as never, undefined)).toEqual(['C', 'G'])
    expect(hasShapes('|')).toBe(false)
    expect(hasShapes('%')).toBe(false)
  })
})

describe('padsAfter', () => {
  it('pads a line to four cells, the ones past a multiple of two for wide rows only', () => {
    expect(padsAfter(1)).toEqual(['pad-both', 'pad-wide', 'pad-wide'])
    expect(padsAfter(2)).toEqual(['pad-wide', 'pad-wide'])
    expect(padsAfter(3)).toEqual(['pad-both'])
    expect(padsAfter(4)).toEqual([])
    expect(padsAfter(5)).toEqual(['pad-both', 'pad-wide', 'pad-wide'])
    expect(padsAfter(8)).toEqual([])
  })
})
