import { describe, expect, it } from 'vitest'
import { outsideNotes, parseShapeText, shapeNotes } from '../../music/own-shapes'

describe('a shape you write', () => {
  it('is read from fret text, low E to high e', () => {
    expect(parseShapeText('x-x-2-2-3-5')).toEqual({ f: [null, null, 2, 2, 3, 5], s: 0, l: '2nd fret' })
    expect(parseShapeText('x x 2 2 3 5')).toEqual(parseShapeText('x-x-2-2-3-5'))
    expect(parseShapeText('xx2235')).toEqual(parseShapeText('x-x-2-2-3-5'))
    expect(parseShapeText('X-X-7-7-10-X')).toEqual({ f: [null, null, 1, 1, 4, null], s: 7, l: '7th fret' })
    expect(parseShapeText('0-2-2-1-0-0')).toEqual({ f: [0, 2, 2, 1, 0, 0], s: 0, l: 'Open' })
  })

  it('is nothing when it is not six strings of frets', () => {
    expect(parseShapeText('x-x-2-2')).toBeNull()
    expect(parseShapeText('x-x-2-2-3-99')).toBeNull()
    expect(parseShapeText('')).toBeNull()
    expect(parseShapeText('x-x-x-x-x-x')).toBeNull()
  })

  it('names the notes it sounds, low to high', () => {
    expect(shapeNotes(parseShapeText('x-x-2-2-3-5')!)).toEqual(['E', 'A', 'D', 'A'])
    expect(shapeNotes(parseShapeText('x-x-7-7-10-x')!)).toEqual(['A', 'D', 'A'])
    expect(shapeNotes(parseShapeText('x-1-3-3-3-1')!, true)).toEqual(['Bb', 'F', 'Bb', 'D', 'F'])
  })

  it('tells which of its notes are outside the chord', () => {
    expect(outsideNotes('Em11', parseShapeText('x-x-2-2-3-5')!)).toEqual([])
    expect(outsideNotes('Em11', parseShapeText('x-x-2-2-3-6')!)).toEqual(['A#'])
    expect(outsideNotes('Bbm', parseShapeText('x-1-3-3-3-1')!)).toEqual(['D'])
    expect(outsideNotes('Gb', parseShapeText('2-4-4-3-2-4')!)).toEqual(['Ab'])
    expect(outsideNotes('Zz', parseShapeText('x-x-2-2-3-5')!)).toEqual([])
  })
})
