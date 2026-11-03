import { describe, it, expect } from 'vitest'
import { barsOfSection, barChords, replaceBar, openUnsure, chordsFromText } from '../../music/evidence'
import type { Song } from '../../types'

const text = '|  E  |  B  |  E  |  B  |\n|  E  |  B  F#/A#  G#m  .  |  C#m  |  F#  N.C.  |'
const disputed = 'B F#/A# G#m .'

const song: Song = {
  title: 'T', artist: 'A', key: 'E', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  sections: [{ name: 'Pre-Chorus', chords: text }],
  evidence: {
    'Pre-Chorus': {
      bars: [{
        bar: 5, chords: disputed, from: 'Unsure',
        readings: [{ from: 'Book', chords: 'B G#m' }, { from: 'Record', chords: disputed }],
      }],
    },
  },
}

describe('bars of a section', () => {
  it('numbers bars across lines, from 0', () => {
    expect(barsOfSection(text).map(barChords)).toEqual(['E', 'B', 'E', 'B', 'E', 'B F#/A# G#m .', 'C#m', 'F# N.C.'])
  })
  it('skips lines not in bars', () => {
    expect(barsOfSection('N.C.\n|  A  |  %  (x2)  |').map(barChords)).toEqual(['A', '%'])
  })
  it('replaces one bar, leaving the other lines as written', () => {
    expect(replaceBar(text, 5, 'B G#m')).toBe('|  E  |  B  |  E  |  B  |\n|  E  |  B  G#m  |  C#m  |  F#  N.C.  |')
  })
  it('keeps a repeat count', () => {
    expect(replaceBar('|  E  |  %  (x2)  |', 1, 'A')).toBe('|  E  |  A  (x2)  |')
  })
  it('leaves the text alone past its last bar', () => {
    expect(replaceBar(text, 8, 'A')).toBe(text)
  })
})

describe('open unsure bars', () => {
  it('marks an Unsure bar that still reads its chords', () => {
    expect(openUnsure(song, undefined)).toEqual([{ section: 0, name: 'Pre-Chorus', bar: 5, evidence: song.evidence!['Pre-Chorus'].bars![0] }])
  })
  it('no mark once the bar reads other chords', () => {
    expect(openUnsure(song, { sections: [{ name: 'Pre-Chorus', chords: replaceBar(text, 5, 'B G#m') }] })).toEqual([])
  })
  it('no mark once the player settled on these chords', () => {
    expect(openUnsure(song, { heard: { 'Pre-Chorus': { 5: disputed } } })).toEqual([])
  })
  it('a mark comes back when the settled chords are gone', () => {
    expect(openUnsure(song, { heard: { 'Pre-Chorus': { 5: 'B G#m' } } })).toHaveLength(1)
  })
  it('no marks for a song without evidence, nor for Ear, Book, Record or Chart bars', () => {
    expect(openUnsure({ ...song, evidence: undefined }, undefined)).toEqual([])
    for (const from of ['Ear', 'Book', 'Record', 'Chart'] as const) {
      const s: Song = { ...song, evidence: { 'Pre-Chorus': { bars: [{ bar: 5, chords: disputed, from }] } } }
      expect(openUnsure(s, undefined)).toEqual([])
    }
  })
  it('matches bars however the chart is spaced', () => {
    const spaced = text.replace('B  F#/A#  G#m  .', 'B\t F#/A#   G#m .')
    expect(openUnsure(song, { sections: [{ name: 'Pre-Chorus', chords: spaced }] })).toHaveLength(1)
  })
})

describe('where the chords came from', () => {
  const s: Song = {
    ...song,
    chordsFrom: 'Book',
    sections: [{ name: 'Intro', chords: '|  A  |  B  |' }, ...song.sections],
    evidence: {
      Intro: { from: 'Record', bars: [{ bar: 1, chords: 'B', from: 'Ear' }] },
      'Pre-Chorus': song.evidence!['Pre-Chorus'],
    },
  }
  it('says where the chords came from', () => {
    expect(chordsFromText(s, undefined)).toBe('Songbook. Intro: the recording. 1 bar by ear. 1 bar unsure.')
    expect(chordsFromText({ ...s, chordsFrom: undefined }, undefined)).toBeNull()
  })
  it('counts settled bars as by ear', () => {
    expect(chordsFromText(s, { heard: { 'Pre-Chorus': { 5: disputed } } })).toBe('Songbook. Intro: the recording. 2 bars by ear.')
  })
})
