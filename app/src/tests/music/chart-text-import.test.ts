import { describe, it, expect } from 'vitest'
import { readChartText } from '../../music/chart-text-import'

describe('readChartText', () => {
  it('reads the header lines', () => {
    const d = readChartText('title: La Song\nArtist: Nobody\nKey: F#m\nBPM: 92\nTime: 6/8\nOrder: Intro, Verse, Chorus\n[Intro]\n| F#m | A |')
    expect(d.title).toBe('La Song')
    expect(d.artist).toBe('Nobody')
    expect(d.key).toBe('F#m')
    expect(d.bpm).toBe(92)
    expect(d.timeSignature).toBe('6/8')
    expect(d.form).toEqual(['Intro', 'Verse', 'Chorus'])
  })

  it('a barred chart keeps its bar lines', () => {
    const d = readChartText('[Verse]\n  | C | G | Am | F |  \n| C | G | % | N.C. |\n[Chorus]\n| F | C |')
    expect(d.barred).toBe(true)
    expect(d.sections[0].chords).toBe('| C | G | Am | F |\n| C | G | % | N.C. |')
    expect(d.sections[1]).toEqual({ name: 'Chorus', chords: '| F | C |' })
  })

  it('word lines are dropped, chord lines kept', () => {
    const d = readChartText('[Verse]\nC  G\nla la la love\nAm  F\nla la')
    expect(d.chordLines).toEqual([
      { section: 'Verse', chords: ['C', 'G'] },
      { section: 'Verse', chords: ['Am', 'F'] },
    ])
    expect(d.barred).toBe(false)
    expect(d.sections).toEqual([{ name: 'Verse', chords: 'C G\nAm F' }])
    expect(JSON.stringify(d)).not.toContain('la')
  })

  it('a repeated header plays the section again', () => {
    const d = readChartText('[Verse]\nC G\n[Chorus]\nF C\n[Verse]')
    expect(d.form).toEqual(['Verse', 'Chorus', 'Verse'])
    expect(d.sections.map(s => s.name)).toEqual(['Verse', 'Chorus'])
  })

  it('a chart mixing barred and unbarred sections is unbarred', () => {
    const d = readChartText('Verse:\n| C | G |\nChorus:\nF C')
    expect(d.barred).toBe(false)
    expect(d.sections).toEqual([{ name: 'Verse', chords: 'C G' }, { name: 'Chorus', chords: 'F C' }])
    expect(d.chordLines).toHaveLength(2)
  })

  it('no sections at all gives an empty draft', () => {
    const d = readChartText('la la la\nnothing here')
    expect(d.sections).toEqual([])
    expect(d.barred).toBe(false)
    expect(d.chordLines).toEqual([])
  })

  it('a word line ending in a colon is dropped', () => {
    const d = readChartText('[Verse]\nC G\nand then la la:\nAm F\nGuitar Solo:\nD A')
    expect(d.sections.map(s => s.name)).toEqual(['Verse', 'Guitar Solo'])
    expect(JSON.stringify(d)).not.toContain('la')
  })

  it('a repeated header with the same chords reuses the section', () => {
    const d = readChartText('[Verse]\nC G\n[Chorus]\nF C\n[Verse]\nC G')
    expect(d.sections.map(s => s.name)).toEqual(['Verse', 'Chorus'])
    expect(d.form).toEqual(['Verse', 'Chorus', 'Verse'])
    expect(d.chordLines.map(l => l.section)).toEqual(['Verse', 'Chorus', 'Verse'])
  })

  it('chord lines repeat a section at each play, in the order line when it names the parts', () => {
    const d = readChartText('Order: Verse, Verse, Chorus\n[Verse]\nC G\nAm F\n[Chorus]\nF C\n')
    expect(d.chordLines).toEqual([
      { section: 'Verse', chords: ['C', 'G'] }, { section: 'Verse', chords: ['Am', 'F'] },
      { section: 'Verse', chords: ['C', 'G'] }, { section: 'Verse', chords: ['Am', 'F'] },
      { section: 'Chorus', chords: ['F', 'C'] },
    ])
  })

  it('a repeated header with different chords gets a numbered name', () => {
    const d = readChartText('[Verse]\nC G\n[Chorus]\nF C\n[Verse]\nAm G')
    expect(d.sections.map(s => s.name)).toEqual(['Verse', 'Chorus', 'Verse 2'])
    expect(d.form).toEqual(['Verse', 'Chorus', 'Verse 2'])
    expect(d.chordLines.map(l => l.section)).toEqual(['Verse', 'Chorus', 'Verse 2'])
  })
})
