import { describe, it, expect } from 'vitest'
import { fingering } from '../../music/fingering'
import { voicingsFor, shapeText } from '../../music/voicings'
import type { ChordVoicing } from '../../data/chords-db'

const shape = (f: (number | null)[], s = 0): ChordVoicing => ({ f, s, l: '' })

describe('fingering', () => {
  it("uses the chord library's own fingering: open C is 3-2-1 from the A string", () => {
    const c = voicingsFor('C').find(v => shapeText(v) === 'x-3-2-0-1-0')!
    expect(fingering(c)).toEqual({ fingers: [0, 3, 2, 0, 1, 0], barre: null })
  })

  it('shows the barre of an F at the first fret across all six strings', () => {
    const f = voicingsFor('F').find(v => shapeText(v) === '1-3-3-2-1-1')!
    expect(fingering(f)?.barre).toEqual({ fret: 1, from: 0, to: 5 })
    expect(fingering(f)?.fingers).toEqual([1, 3, 4, 2, 1, 1])
  })

  it('works out a barre for a shape the library does not finger', () => {
    // A-shape barre at the 2nd fret: B
    expect(fingering(shape([null, 1, 3, 3, 3, 1], 2))).toEqual({
      fingers: [0, 1, 2, 3, 4, 1],
      barre: { fret: 1, from: 1, to: 5 },
    })
  })

  it('never barres over an open or muted string', () => {
    // Open D: x-x-0-2-3-2, three fingers and no barre
    expect(fingering(shape([null, null, 0, 2, 3, 2]))).toEqual({ fingers: [0, 0, 0, 1, 3, 2], barre: null })
  })

  it('lets the index hold two strings when a shape would need five fingers', () => {
    expect(fingering(shape([2, null, 4, 3, 2, 4]))?.fingers).toEqual([1, 0, 3, 2, 1, 4])
  })

  it('gives up on a shape no hand can hold', () => {
    expect(fingering(shape([1, 2, 3, 4, 5, 6]))).toBeNull()
  })
})
