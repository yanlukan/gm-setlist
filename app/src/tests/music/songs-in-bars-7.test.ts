import { describe, it, expect } from 'vitest'
import { by, sectionBars, recordingBars, chordsOf, everyLineInBars, formBars } from '../songs-in-bars-helpers'

// Batch 7 (3.65.0): Careless Whisper, the last of the gig songs, in bars and
// checked against the recording like the songs in songs-in-bars-6.test.ts.

const chordsIn = (title: string) => Object.fromEntries(by(title).sections.map(s => [s.name, s.chords]))

describe('Careless Whisper in bars (songbook no. 4)', () => {
  const CW = 'Careless Whisper'
  // The loop after its first bar; the passing chord in its second bar comes on the last beat
  const LOOP = '|  Gm7  Am7  |  Bbmaj7  |  Am7  |'
  it('writes every line of every section in bars', () => everyLineInBars(CW))

  it("has the book's four-bar loop in every part, the outro going round to where the record fades", () => {
    expect(sectionBars(CW)).toEqual({ 'Intro (sax)': 8, Verse: 8, Chorus: 8, 'Sax riff': 4, 'Outro (sax)': 24 })
    const chords = chordsIn(CW)
    expect(chords['Intro (sax)']).toBe(`|  Dm  ${LOOP}  (x2)`)
    expect(chords.Verse).toBe(`|  Dm7  ${LOOP}  (x2)`)
    expect(chords.Chorus).toBe(`|  Dm  ${LOOP}  (x2)`)
    expect(chords['Sax riff']).toBe(`|  Dm  ${LOOP}`)
    expect(chords['Outro (sax)']).toBe(`|  Dm7  ${LOOP}  (x6)`)
  })

  it('plays the sax riff once after the first chorus and twice after the second, as the book and the record do', () => {
    expect(by(CW).form).toEqual([
      'Intro (sax)', 'Verse', 'Chorus', 'Sax riff', 'Verse', 'Chorus', 'Sax riff', 'Sax riff', 'Verse', 'Chorus', 'Outro (sax)',
    ])
  })

  it('comes to the length of the recording, from the first bar to where the fade has gone (4:51)', () => {
    expect(Math.abs(formBars(CW) - recordingBars(CW, 1.9, 290.7))).toBeLessThanOrEqual(2)
  })

  it("stays a whole tone down in the band's key Cm, with the book's barre and its sound", () => {
    const song = by(CW)
    expect(song.key).toBe('Dm')
    expect(song.transpose).toBe(-2)
    expect(song.lowerKey).toBe(true)
    expect(song.capo).toBeNull()
    expect(song.shapes).toEqual({ Fm7: '1-3-1-1-1-1' })
    expect(song.preset).toEqual({ name: '80s CLEAN', slot: 'U01-2' })
    expect(chordsOf(CW)).toEqual(['Dm', 'Gm7', 'Am7', 'Bbmaj7', 'Dm7'])
  })
})
