import { describe, expect, it } from 'vitest'
import { moreShapesFor } from '../../music/more-shapes'
import { chordNotes, pitchAt, shapeText, voicingsFor } from '../../music/voicings'
import type { ChordVoicing } from '../../data/chords-db'

const sounded = (v: ChordVoicing) =>
  v.f.flatMap((f, string) => (f === null ? [] : [pitchAt(string, f === 0 || v.s === 0 ? f : v.s + f - 1)]))

describe('more shapes', () => {
  it('include the ways Em11 is really played', () => {
    const texts = moreShapesFor('Em11').map(shapeText)
    expect(texts).toContain('x-x-2-2-3-5')
    expect(texts).toContain('x-x-7-7-10-x')
  })

  it('never repeat a shape the chord already has, nor each other', () => {
    for (const name of ['Em11', 'C', 'G7', 'Bbm7']) {
      const have = new Set(voicingsFor(name).map(shapeText))
      const texts = moreShapesFor(name).map(shapeText)
      expect(new Set(texts).size).toBe(texts.length)
      for (const text of texts) expect(have.has(text), `${name} ${text}`).toBe(false)
    }
  })

  it('sound only chord notes, at least two different ones, on three to six strings in reach', () => {
    for (const name of ['Em11', 'C', 'Bbm7', 'C/E']) {
      const notes = chordNotes(name)!
      const inside = new Set([...notes.tones, ...(notes.bass === null ? [] : [notes.bass])])
      for (const v of moreShapesFor(name)) {
        const played = sounded(v)
        expect(played.length).toBeGreaterThanOrEqual(3)
        expect(new Set(played).size).toBeGreaterThanOrEqual(2)
        for (const pc of played) expect(inside.has(pc), `${name} ${shapeText(v)}`).toBe(true)
        const fretted = shapeText(v).split('-').map(Number).filter(f => f > 0)
        if (fretted.length) expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3)
        expect(Math.max(0, ...fretted)).toBeLessThanOrEqual(15)
      }
    }
  })

  it('keep a slash chord\'s bass at the bottom', () => {
    for (const v of moreShapesFor('C/E')) expect(sounded(v)[0]).toBe(4)
  })

  it('leave out at most two of the notes that matter, fewest first', () => {
    const notes = chordNotes('Em11')!
    const missing = moreShapesFor('Em11').map(v => notes.essential.filter(pc => !sounded(v).includes(pc)).length)
    expect(Math.max(...missing)).toBeLessThanOrEqual(2)
    for (let i = 1; i < missing.length; i++) expect(missing[i]).toBeGreaterThanOrEqual(missing[i - 1])
  })

  it('are nothing for a name that is not a chord', () => {
    expect(moreShapesFor('Zz')).toEqual([])
  })
})
