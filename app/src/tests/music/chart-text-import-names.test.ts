import { describe, it, expect } from 'vitest'
import { readChartText } from '../../music/chart-text-import'
import { addedSong } from '../../music/added-song'

// Made-up neutral words stand in for a chart's lyrics: none may reach the song file.
const WORDS = ['apple', 'river', 'window', 'orange', 'table', 'garden']
const noWords = (value: unknown) => {
  const text = JSON.stringify(value).toLowerCase()
  for (const w of WORDS) expect(text).not.toContain(w)
}

describe('readChartText keeps no words in part names, key or time', () => {
  const wordy = [
    'Key: apple river',
    'Time: 4/4 window',
    '[Verse 1 - apple river window]',
    '| C | G |',
    '[Chorus: orange table]',
    '| F | C |',
    'Garden Window Table:',
    '| Am | F |',
    'Apple River: | D | G |',
    '[guitar solo over the garden]',
    '| E | A |',
  ].join('\n')

  it('a wordy header keeps only its part word and number; one with none is a Part', () => {
    const d = readChartText(wordy)
    expect(d.sections.map(s => s.name)).toEqual(['Verse 1', 'Chorus', 'Part', 'Part 2', 'Solo'])
    expect(d.form).toEqual(['Verse 1', 'Chorus', 'Part', 'Part 2', 'Solo'])
    expect(d.barred).toBe(true)
    expect(d.key).toBeUndefined()
    expect(d.timeSignature).toBeUndefined()
    expect(d.warnings.length).toBeGreaterThan(0)
    noWords(d)
  })

  it('the song file made from a wordy chart carries no word', () => {
    const d = readChartText(wordy)
    const answer = {
      recording: 'x.m4a', duration: 200, key: 'C', bpm: 100, timeSignature: '4/4', route: 'chart' as const,
      check: { recording: 'x.m4a', checked: '2026-11-14', shift: 0, verdict: 'lined up', unchecked: [],
        bars: d.sections.map(s => ({ section: s.name, bar: 0, chords: 'C', kind: 'chord' as const, record: 'G', confidence: 0.9, at: [1] })) },
    }
    const song = addedSong({ title: 'T', artist: 'A', draft: d }, answer)
    noWords(song)
    expect(Object.keys(song.evidence ?? {}).length).toBeGreaterThan(0)
    for (const name of Object.keys(song.evidence ?? {})) expect(d.sections.map(s => s.name)).toContain(name)
  })

  it('part words are read in any case and spelling', () => {
    const d = readChartText('[pre chorus]\n| C |\n[MIDDLE EIGHT]\n| D |\n[Verse2]\n| E |\n[post-chorus]\n| F |\nOUTRO:\n| G |')
    expect(d.sections.map(s => s.name)).toEqual(['Pre-Chorus', 'Middle 8', 'Verse 2', 'Post-Chorus', 'Outro'])
  })

  it('an Order line is read with the same part words', () => {
    const d = readChartText('Order: intro, Verse 1 - apple, chorus\n[Intro]\n| C |\n[Verse 1]\n| G |\n[Chorus]\n| F |')
    expect(d.form).toEqual(['Intro', 'Verse 1', 'Chorus'])
    expect(d.unknownOrder).toEqual([])
    noWords(d)
  })

  it('a key name is kept, anything else is left out with a warning', () => {
    for (const k of ['C', 'F#', 'Bb', 'Ebm', 'C#m', 'Am']) expect(readChartText(`Key: ${k}\n[Verse]\n| C |`).key).toBe(k)
    const d = readChartText('Key: H minor\n[Verse]\n| C |')
    expect(d.key).toBeUndefined()
    expect(d.warnings.join(' ')).toMatch(/Key/)
    expect(d.warnings.join(' ')).not.toMatch(/minor/)
  })

  it('a time signature is kept, anything else is left out with a warning', () => {
    for (const t of ['4/4', '3/4', '6/8', '12/8', '2/2']) expect(readChartText(`Time: ${t}\n[Verse]\n| C |`).timeSignature).toBe(t)
    for (const t of ['4/4 swing', 'four', '4/5', '0/4']) {
      const d = readChartText(`Time: ${t}\n[Verse]\n| C |`)
      expect(d.timeSignature).toBeUndefined()
      expect(d.warnings.join(' ')).toMatch(/Time/)
    }
  })
})

describe('readChartText item 5', () => {
  it('a repeat count on a line without bar lines repeats the chords before it', () => {
    const d = readChartText('[Verse]\nC G x2\nAm F (x3) D\nE A\n(x2)')
    expect(d.chordLines.map(l => l.chords)).toEqual([
      ['C', 'G', 'C', 'G'], ['Am', 'F', 'Am', 'F', 'Am', 'F', 'D'], ['E', 'A', 'E', 'A'],
    ])
    expect(d.sections[0].chords).toBe('C G C G\nAm F Am F Am F D\nE A E A')
  })

  it('a repeat count line under a barred line keeps the chart barred, with a warning', () => {
    const d = readChartText('[Verse]\n| C | G |\n(x2)\n[Chorus]\n| F | C |')
    expect(d.barred).toBe(true)
    expect(d.sections[0].chords).toBe('| C | G |')
    expect(d.warnings.join(' ')).toMatch(/repeat count/)
  })

  it('a repeated name never gives two parts one name, and no chords are lost', () => {
    const d = readChartText('[Verse 2]\nC G\n[Verse]\nAm F\n[Verse]\nD E')
    const names = d.sections.map(s => s.name)
    expect(new Set(names).size).toBe(names.length)
    expect(d.sections.map(s => s.chords)).toEqual(['C G', 'Am F', 'D E'])
    expect(d.chordLines.map(l => l.chords.join(' '))).toEqual(['C G', 'Am F', 'D E'])
  })

  it('a part with only words under it does not change the route and is not a section', () => {
    const d = readChartText('[Intro]\n| C | G |\n[Bridge]\napple river window\n[Chorus]\n| F | C |')
    expect(d.barred).toBe(true)
    expect(d.unbarred).toEqual([])
    expect(d.sections.map(s => s.name)).toEqual(['Intro', 'Chorus'])
    expect(d.form).toEqual(['Intro', 'Chorus'])
    expect(d.warnings.join(' ')).toMatch(/Bridge/)
    noWords(d)
  })

  it('a part with only words plays a same-named part written later', () => {
    const d = readChartText('[Verse]\napple river\n[Chorus]\n| F | C |\n[Verse]\n| C | G |')
    expect(d.barred).toBe(true)
    expect(d.sections.map(s => s.name)).toEqual(['Chorus', 'Verse'])
    expect(d.form).toEqual(['Verse', 'Chorus', 'Verse'])
  })

  it('an Order line after the first part is read', () => {
    const d = readChartText('[Verse]\n| C |\nOrder: Verse, Chorus, Verse\n[Chorus]\n| F |')
    expect(d.form).toEqual(['Verse', 'Chorus', 'Verse'])
  })

  it('other header lines after the first part are left out with a warning', () => {
    const d = readChartText('[Verse]\n| C |\nKey: D\n[Chorus]\n| F |')
    expect(d.key).toBeUndefined()
    expect(d.warnings.join(' ')).toMatch(/Key/)
    expect(d.sections.map(s => s.name)).toEqual(['Verse', 'Chorus'])
  })
})
