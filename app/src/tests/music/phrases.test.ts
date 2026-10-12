import { describe, expect, it } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { layOutParts, phraseLines, relayOut } from '../../music/phrases'

const section = (title: string, name: string) =>
  DEFAULT_SONGS.find(s => s.title === title)!.sections.find(s => s.name === name)!.chords

describe('a section laid out by its parts', () => {
  it('starts each time through the verse on a line of its own, the turnaround on its own line', () => {
    // I Can't Make You Love Me's verse as one line, before it was written in bars
    expect(phraseLines('Cadd9  Em11  C  G/B  Em7  Am7  Cadd9  Em11  C  G/B  Em7  Am7  G/D  D  G/B')).toEqual([
      'Cadd9  Em11  C  G/B  Em7  Am7',
      'Cadd9  Em11  C  G/B  Em7  Am7',
      'G/D  D  G/B',
    ])
  })

  it('runs a line on until the part comes round again', () => {
    expect(phraseLines(section('A Different Corner', 'Verse'))).toEqual([
      'Gb  Gb/Db  Gb  Gb/Db  Gb  Ebm  Abm',
      'Gb  Gb/Db  Gb  Gb/Db  Ebm  Abm  Gb',
    ])
    expect(phraseLines('Cm  Cm(maj7)  Cm7  Cm6  Cm  Cm(maj7)  Cm7  G')).toEqual([
      'Cm  Cm(maj7)  Cm7  Cm6',
      'Cm  Cm(maj7)  Cm7  G',
    ])
  })

  it('puts what comes between on its own line when it is as long as the part', () => {
    expect(phraseLines(section("I'm Your Man", 'Bridge'))).toEqual([
      'D  G6  D  G6  D  G6  D',
      'G6  A6  G6  D  A  Bm  A/C#',
      'D  G6  D  G6  D  G6  D',
    ])
  })

  it('keeps the chords before the part on a line of their own', () => {
    expect(phraseLines('Cadd9  G  Cadd9  G  G/B  C  D  Em7  G/C  D/F#  Em7  G/C  D/F#  Em7  Am7  G/D  D  G/B')).toEqual([
      'Cadd9  G  Cadd9  G  G/B  C  D',
      'Em7  G/C  D/F#',
      'Em7  G/C  D/F#',
      'Em7  Am7  G/D  D  G/B',
    ])
  })

  it('keeps a chord or two after the last time on its line', () => {
    expect(phraseLines('Em9  G/A  B11  Em9  G/A  B11  G13')).toEqual(['Em9  G/A  B11', 'Em9  G/A  B11  G13'])
    expect(phraseLines('F#m7  B7  F#m7  B7  F#m7  B7  F#m7  B7  B/D#  E')).toEqual([
      'F#m7  B7  F#m7  B7',
      'F#m7  B7  F#m7  B7  B/D#  E',
    ])
  })

  it('puts parts that start alike and end differently on lines of their own', () => {
    expect(phraseLines(section('Fastlove', 'Chorus'))).toEqual(['Am7  Fmaj7  Am7  Dm9', 'Am7  Fmaj7  Em7  Dm9'])
    expect(phraseLines(section('Kissing a Fool', 'Verse'))).toEqual([
      'Eb6  Edim7  Fm7  Cb(b5)  Bb7',
      'Eb6  C7(b9)  Fm7  Cb(b5)  Bb',
    ])
    // Not alike: another first chord, or only the first chord the same
    expect(phraseLines('C  F  G  Am  D  F  G  Bm')).toEqual(['C  F  G  Am  D  F  G  Bm'])
    expect(phraseLines('C  F  G  Am  C  Dm  Em  G')).toEqual(['C  F  G  Am  C  Dm  Em  G'])
  })

  it('leaves a section with no part played twice on one line', () => {
    expect(phraseLines('Bm  D/A  Gmaj7  F#m7  Em7  G/A  B11  F#7#5')).toEqual(['Bm  D/A  Gmaj7  F#m7  Em7  G/A  B11  F#7#5'])
    // Two chords back and forth is not a part
    expect(phraseLines('B  E  B  E  B')).toEqual(['B  E  B  E  B'])
    expect(phraseLines('')).toEqual([])
  })

  it('keeps repeat counts and N.C. with the chord before them', () => {
    expect(phraseLines('Am7  Fmaj9  G6  Em7 (x4)')).toEqual(['Am7  Fmaj9  G6  Em7 (x4)'])
    expect(phraseLines('F#7#5  C9 N.C.  E  Bm7  F#7#5  C9 N.C.  E  Bm7')).toEqual([
      'F#7#5  C9 N.C.  E  Bm7',
      'F#7#5  C9 N.C.  E  Bm7',
    ])
  })

  it('never loses, adds or reorders a chord in any built-in song', () => {
    for (const song of DEFAULT_SONGS) {
      for (const s of song.sections) {
        expect(phraseLines(s.chords).join(' ').split(/\s+/).filter(Boolean)).toEqual(s.chords.split(/\s+/).filter(Boolean))
      }
    }
  })
})

describe('the lines the chart shows', () => {
  it('keeps the lines a player set in the editor just as they are', () => {
    const own = 'Cadd9  Em11  C  G/B  Em7  Am7  Cadd9\nEm11  C  G/B  Em7  Am7'
    expect(layOutParts(own)).toBe(own)
  })

  it('lays a one-line section out by its parts', () => {
    expect(layOutParts('D  G  C  D  G  C')).toBe('D  G  C\nD  G  C')
  })
})

describe('lines laid out again in the editor', () => {
  it('lays the lines out again after a chord goes in, the cursor after it', () => {
    expect(relayOut([['D', 'G', 'C', 'D', 'G', 'C']], { line: 0, pos: 6 })).toEqual({
      lines: [['D', 'G', 'C'], ['D', 'G', 'C']],
      caret: { line: 1, pos: 3 },
    })
    // At the end of a line, not the start of the next
    expect(relayOut([['D', 'G', 'C', 'D', 'G', 'C']], { line: 0, pos: 3 }).caret).toEqual({ line: 0, pos: 3 })
    expect(relayOut([[]], { line: 0, pos: 0 })).toEqual({ lines: [[]], caret: { line: 0, pos: 0 } })
  })
})
