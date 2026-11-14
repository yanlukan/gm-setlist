import { describe, it, expect } from 'vitest'
import { readChartText } from '../../music/chart-text-import'

const WORDS = ['apple', 'river', 'window']
const noWords = (value: unknown) => {
  const text = JSON.stringify(value).toLowerCase()
  for (const w of WORDS) expect(text).not.toContain(w)
}
const names = (t: string) => readChartText(t).sections.map(s => s.name)

describe('readChartText review points', () => {
  it('1: a line ending in a colon with a part word is a header, whatever else it holds', () => {
    const d = readChartText('Verse 1:\nC G\nChorus (x2):\nF C')
    expect(d.sections).toEqual([{ name: 'Verse 1', chords: 'C G' }, { name: 'Chorus', chords: 'F C' }])
    expect(d.form).toEqual(['Verse 1', 'Chorus', 'Chorus'])
    expect(names('Verse:\nC G\nChorus x2:\nF C')).toEqual(['Verse', 'Chorus'])
    expect(names('Verse:\nC G\nVerse 2 (apple):\nAm F')).toEqual(['Verse', 'Verse 2'])
    expect(names('Verse:\nC G\nPre–Chorus:\nAm F')).toEqual(['Verse', 'Pre-Chorus'])
    expect(names('Verse 1 - Capo 2:\nC G')).toEqual(['Verse 1'])
    noWords(readChartText('Verse:\nC G\nVerse 2 (apple):\nAm F'))
  })

  it('1: a part header with words after its colon still opens the part; the words are dropped', () => {
    const d = readChartText('[Verse]\nC G\nChorus: apple river\nF C')
    expect(d.sections).toEqual([{ name: 'Verse', chords: 'C G' }, { name: 'Chorus', chords: 'F C' }])
    expect(d.warnings.join(' ')).toMatch(/words/)
    noWords(d)
  })

  it('1: a line ending in a colon with no part word is left out with a warning', () => {
    const d = readChartText('[Verse]\nC G\nand then apple river:\nAm F')
    expect(d.sections).toEqual([{ name: 'Verse', chords: 'C G\nAm F' }])
    expect(d.warnings.join(' ')).toMatch(/colon/)
    noWords(d)
  })

  it('2: a line with no real chords never makes a barred chart unbarred', () => {
    for (const t of ['[Intro]\nN.C.\n| C | G |', '[Verse]\n(x2)\n| C |', 'Chorus: x2\n| F | C |']) {
      const d = readChartText(t)
      expect(d.barred).toBe(true)
      expect(d.unbarred).toEqual([])
    }
    const d = readChartText('Chorus: x2\n| F | C |')
    expect(d.form).toEqual(['Chorus', 'Chorus'])
  })

  it('2: a part with only marks under it is empty', () => {
    const d = readChartText('[Intro]\nN.C.\n[Verse]\n| C | G |')
    expect(d.sections.map(s => s.name)).toEqual(['Verse'])
  })

  it('3: part words accept the whole dash family', () => {
    expect(names('[Pre–Chorus]\n| C |\n[Post‑Chorus]\n| D |\n[Pre—Chorus 2]\n| E |')).toEqual(['Pre-Chorus', 'Post-Chorus', 'Pre-Chorus 2'])
  })

  it('4: a repeated header with the same chords in other bars is a part of its own', () => {
    const d = readChartText('[Verse]\n| C . G . |\n[Verse]\n| C G |')
    expect(d.sections).toEqual([{ name: 'Verse', chords: '| C . G . |' }, { name: 'Verse 2', chords: '| C G |' }])
    expect(readChartText('[Verse]\n| C | G |\n[Verse]\n|C|  G  |').sections).toHaveLength(1)
  })

  it('5: a repeat count is capped at 16 with a warning', () => {
    const d = readChartText('[Verse]\nC x99999999')
    expect(d.chordLines[0].chords).toHaveLength(16)
    expect(d.warnings.join(' ')).toMatch(/16/)
    expect(readChartText('[Verse]\nC G\n(x99999999)').chordLines[0].chords).toHaveLength(32)
    expect(readChartText('[Verse]\n| C | G (x99999999) |').chordLines[0].chords).toHaveLength(17)
  })

  it('6: an Order name with no part word is counted, never kept as text', () => {
    const d = readChartText('Order: Verse, apple river, Bridge\n[Verse]\nC G')
    expect(d.unknownOrder).toEqual(['Bridge'])
    expect(d.orderWithoutPart).toBe(1)
    expect(d.form).toEqual(['Verse'])
    noWords(d)
  })
})
