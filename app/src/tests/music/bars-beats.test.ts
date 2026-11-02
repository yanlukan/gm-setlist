import { describe, it, expect } from 'vitest'
import { beatsOf, fromGrid, barsOf } from '../../music/bars'
import { isChartMark, transposeInKey } from '../../music/theory'
import { parseChordText } from '../../music/chord-text'

describe('beatsOf', () => {
  it('places each chord on its beat when the bar has dots (Faith: B F#/A# G#m .)', () => {
    expect(beatsOf(['B', 'F#/A#', 'G#m', '.'])).toEqual({
      beats: 4, dotted: true,
      chords: [{ token: 'B', start: 0, length: 1 }, { token: 'F#/A#', start: 1, length: 1 }, { token: 'G#m', start: 2, length: 2 }],
    })
  })
  it('shares a bar without dots equally, as before', () => {
    expect(beatsOf(['E', 'B'])).toEqual({ beats: 2, dotted: false, chords: [{ token: 'E', start: 0, length: 1 }, { token: 'B', start: 1, length: 1 }] })
  })
  it('holds a chord over the dots after it', () => {
    expect(beatsOf(['C', '.', '.', '.']).chords).toEqual([{ token: 'C', start: 0, length: 4 }])
  })
  it('leaves % and (x2) out of the beats', () => {
    expect(beatsOf(['%'])).toEqual({ beats: 1, dotted: false, chords: [] })
    expect(beatsOf(['A', '.', 'D', '.', '(x2)']).beats).toBe(4)
  })
  it('gives a bar of only dots its beats and no chords', () => {
    expect(beatsOf(['.', '.', '.', '.'])).toEqual({ beats: 4, dotted: true, chords: [] })
  })
  it('starts the first chord after the empty beats before it', () => {
    expect(beatsOf(['.', '.', 'G', '.']).chords).toEqual([{ token: 'G', start: 2, length: 2 }])
  })
})

describe('dots in chart text', () => {
  it('are a chart mark, never a chord to transpose', () => {
    expect(isChartMark('.')).toBe(true)
  })
  it('stay in place when the chord line is transposed', () => {
    expect(transposeInKey('| C . . . | G/B . . . |', 'C', 2)).toBe('| D . . . | A/C# . . . |')
  })
  it('survive a pasted ChordPro grid', () => {
    expect(fromGrid('| C . . . | G . . . |')).toBe(' |  C . . .  |  G . . .  | ')
    expect(barsOf(parseChordText('| C . . . | G . . . |')[0])).toEqual([['C', '.', '.', '.'], ['G', '.', '.', '.']])
  })
})
