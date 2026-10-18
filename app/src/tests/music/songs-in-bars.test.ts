import { describe, it, expect } from 'vitest'
import { hasBars, REPEAT_BAR, isRepeatCount } from '../../music/bars'
import { transposeInKey } from '../../music/theory'
import {
  by, tokens, barsIn, sectionBars, recordingBars, chordsOf, everyLineInBars, formBars, playedLines,
} from '../songs-in-bars-helpers'

// The songs charted in bars from the songbook, each checked against the
// recording: the bars of the song order, played through, must come to the
// recording's length at its tempo. From batch 6 on in songs-in-bars-6.test.ts.

describe("I Can't Make You Love Me in bars (songbook no. 25)", () => {
  const LOVE = "I Can't Make You Love Me"

  it('writes every line of every section in bars', () => {
    for (const section of by(LOVE).sections) {
      for (const line of section.chords.split('\n')) expect(hasBars(line), `${section.name}: ${line}`).toBe(true)
    }
  })

  it('has the bars the book has, with the piano intro from the recording', () => {
    expect(sectionBars(LOVE)).toEqual({ Intro: 8, Verse: 11, Chorus: 15, 'Chorus end': 1, Outro: 15 })
  })

  it('plays the whole chorus both times, the first going back to the verse, the second into the outro', () => {
    expect(by(LOVE).form).toEqual(['Intro', 'Verse', 'Chorus', 'Chorus end', 'Verse', 'Chorus', 'Outro'])
  })

  it('comes to the length of the recording at its tempo, give or take the slowing down at the end', () => {
    expect(Math.abs(formBars(LOVE) - recordingBars(LOVE))).toBeLessThanOrEqual(3)
  })

  it('stays in G with a shape for every chord, and keeps the Em11 as the player plays it', () => {
    const song = by(LOVE)
    expect(song.key).toBe('G')
    const chords = song.sections.flatMap(s => tokens(s.chords)).filter(t => t !== '|' && t !== REPEAT_BAR && !isRepeatCount(t))
    const missing = [...new Set(chords)].filter(c => !song.shapes?.[c])
    expect(missing).toEqual([])
    expect(song.playerShapes).toEqual({ Em11: 'x-x-2-2-3-5' })
  })
})

describe('a line played again straight away', () => {
  it('is written once with its repeat count, so the chart stays big enough to read on stage', () => {
    for (const title of [
      'Faith', "I'm Your Man", 'Club Tropicana', 'Amazing', 'Roxanne', 'A Different Corner', "Freedom! '90", 'Papa Was a Rolling Stone',
      'Too Funky', 'Jesus to a Child', 'Everything She Wants', 'Fastlove',
      'Kissing a Fool', 'Last Christmas', 'Waiting (Reprise)',
      'Outside', 'Father Figure', 'Wake Me Up Before You Go-Go', 'Somebody to Love',
      'Careless Whisper',
    ]) {
      for (const section of by(title).sections) {
        const lines = playedLines(section.chords)
        lines.forEach((line, i) => expect(line, `${title}, ${section.name}, line ${i + 1}`).not.toBe(lines[i - 1]))
      }
    }
  })

  it('counts its bars as many times as it is played', () => {
    expect(barsIn('|  D  |  G6  |  A6  |  G6  |  (x2)\n|  D  |')).toBe(9)
  })
})

describe('Faith in bars (songbook no. 12)', () => {
  // The book marks 192 in quarter notes; the chart counts bars at 96, the
  // recording's tempo, so each chart bar is two of the book's.
  it('writes every line of every section in bars', () => everyLineInBars('Faith'))

  it("has the book's bars at 96, with the guitar intro and the last stop from the recording", () => {
    expect(sectionBars('Faith')).toEqual({ Intro: 4, Verse: 8, 'Pre-Chorus': 8, Chorus: 4, Solo: 8, Stop: 1 })
  })

  it('stops for a bar more before the last chorus, as the recording does', () => {
    expect(by('Faith').form).toEqual([
      'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Solo', 'Pre-Chorus', 'Stop', 'Chorus',
    ])
  })

  it('comes to the length of the recording after the organ opening, which is in free time (29 s)', () => {
    expect(Math.abs(formBars('Faith') - recordingBars('Faith', 29))).toBeLessThanOrEqual(1)
  })

  it('stays in B with the songbook shapes', () => {
    const song = by('Faith')
    expect(song.key).toBe('B')
    expect(chordsOf('Faith').filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe("I'm Your Man in bars (songbook no. 31)", () => {
  const MAN = "I'm Your Man"
  it('writes every line of every section in bars', () => everyLineInBars(MAN))

  it("has the book's bars, with the intro and instrumental from the recording", () => {
    expect(sectionBars(MAN)).toEqual({ Intro: 8, Verse: 8, 'Pre-Chorus': 8, Chorus: 8, Instrumental: 8, Bridge: 24, Outro: 4 })
  })

  it('plays the chorus twice after the second verse, and four times after the bridge', () => {
    expect(by(MAN).form).toEqual([
      'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Chorus', 'Instrumental', 'Bridge',
      'Chorus', 'Chorus', 'Chorus', 'Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording, give or take the fade', () => {
    expect(Math.abs(formBars(MAN) - recordingBars(MAN))).toBeLessThanOrEqual(2)
  })

  it('stays in D, a whole tone above the band', () => {
    expect(by(MAN).key).toBe('D')
    expect(by(MAN).transpose).toBe(-2)
  })
})

describe('Club Tropicana in bars (the NoTreble bass transcription)', () => {
  const TROP = 'Club Tropicana'
  it('writes every line of every section in bars', () => everyLineInBars(TROP))

  it("has the transcription's bars, with the walk-up it plays once more in the fade", () => {
    expect(sectionBars(TROP)).toEqual({
      Intro: 8, 'Intro 2': 4, Verse: 8, Chorus: 8, Instrumental: 12, 'Bass solo': 8, 'Last verse': 14, 'Walk-up': 2, Outro: 18,
    })
  })

  it('keeps the song order', () => {
    expect(by(TROP).form).toEqual([
      'Intro', 'Intro 2', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Instrumental', 'Chorus', 'Bass solo', 'Last verse', 'Walk-up', 'Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording after its sound-effects opening (35 s)', () => {
    expect(Math.abs(formBars(TROP) - recordingBars(TROP, 35))).toBeLessThanOrEqual(2)
  })

  it('stays in B, a whole tone above the band', () => {
    expect(by(TROP).key).toBe('B')
    expect(by(TROP).transpose).toBe(-2)
  })
})

describe('Amazing in bars (from the recording, chords as the band plays them)', () => {
  it('writes every line of every section in bars', () => everyLineInBars('Amazing'))

  it('changes chord every two bars, with the pre-chorus turning faster', () => {
    expect(sectionBars('Amazing')).toEqual({ Intro: 8, Verse: 16, 'Pre-Chorus': 8, Chorus: 8 })
  })

  it('plays the intro again before the second verse, and the chorus six times into the fade', () => {
    expect(by('Amazing').form).toEqual([
      'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Chorus', 'Intro', 'Verse', 'Pre-Chorus',
      'Chorus', 'Chorus', 'Chorus', 'Chorus', 'Chorus', 'Chorus',
    ])
  })

  it('comes to the length of the recording from where the band comes in (15 s) to where the fade has gone (4:15)', () => {
    expect(Math.abs(formBars('Amazing') - recordingBars('Amazing', 15, 255))).toBeLessThanOrEqual(1)
  })

  it('stays in Bbm, a semitone above the band, with the pre-chorus starting on Ebm7 (Dm7 in Am), as recorded', () => {
    expect(by('Amazing').key).toBe('Bbm')
    expect(by('Amazing').transpose).toBe(-1)
    expect(by('Amazing').sections.find(s => s.name === 'Pre-Chorus')!.chords.startsWith('|  Ebm7  |')).toBe(true)
  })
})

describe('Roxanne in bars (songbook no. 49)', () => {
  const ROX = 'Roxanne'
  it('writes every line of every section in bars', () => everyLineInBars(ROX))

  it("has the book's bars, with the intro and the chorus line played three times from the recording", () => {
    expect(sectionBars(ROX)).toEqual({
      Intro: 4, Verse: 8, 'Verse 2': 8, Chorus: 12, Interlude: 4, 'Pre-Chorus': 8, 'Chorus 2': 9, Outro: 12, Ending: 3,
    })
  })

  it('ends the second verse on both stabs and holds the B11 two bars before the N.C.', () => {
    const chords = (name: string) => by(ROX).sections.find(s => s.name === name)!.chords
    expect(chords('Verse 2').endsWith('|  N.C.  E  Bm7  |  %  |')).toBe(true)
    expect(chords('Chorus')).toBe('|  Em9  |  G/A  |  B11  |  %  |  (x2)\n|  Em9  |  G/A  |  B11  |  B11  N.C.  |')
  })

  it('opens with the interlude chords, as the recording does', () => {
    expect(by(ROX).form).toEqual([
      'Intro', 'Verse', 'Verse 2', 'Chorus', 'Interlude', 'Verse', 'Pre-Chorus', 'Chorus 2', 'Outro', 'Ending',
    ])
  })

  it('comes to the length of the recording, with the 4 unclear bars before the first chorus not charted and the free ending (from 3:48) left out', () => {
    const charted = formBars(ROX) - sectionBars(ROX).Ending + 4
    expect(Math.abs(charted - recordingBars(ROX, 3, 228.5))).toBeLessThanOrEqual(1)
  })

  it('stays in Bm with the songbook shapes and its sound and cue', () => {
    const song = by(ROX)
    expect(song.key).toBe('Bm')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(ROX).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe('A Different Corner in bars (songbook, in Gb as the band plays it)', () => {
  const CORNER = 'A Different Corner'
  const ROUND = '|  Gb  |  Gb/Db  Gb  |  Gb  |  Gb/Db  Gb  |\n|  Ebm  |  Abm  |  Gb  |  %  |'
  it('writes every line of every section in bars', () => everyLineInBars(CORNER))

  it("has the book's 16-bar verse and its 8-bar round everywhere else, with the intro and instrumental from the recording", () => {
    expect(sectionBars(CORNER)).toEqual({ Intro: 8, Verse: 16, Chorus: 8, Instrumental: 8, Bridge: 8, Outro: 8 })
    for (const name of ['Intro', 'Chorus', 'Instrumental', 'Bridge', 'Outro']) {
      expect(by(CORNER).sections.find(s => s.name === name)!.chords, name).toBe(ROUND)
    }
  })

  it('plays the instrumental and the bridge twice round, and the outro round until the fade', () => {
    expect(by(CORNER).form).toEqual([
      'Intro', 'Verse', 'Chorus', 'Instrumental', 'Instrumental', 'Bridge', 'Bridge', 'Chorus', 'Outro', 'Outro', 'Outro',
    ])
  })

  it('comes to the length of the recording, up to the last time round as it fades (3:53)', () => {
    expect(Math.abs(formBars(CORNER) - recordingBars(CORNER, 0.5, 233))).toBeLessThanOrEqual(1)
  })

  it('stays in Gb with the songbook shapes and its sound', () => {
    const song = by(CORNER)
    expect(song.key).toBe('Gb')
    expect(song.transpose).toBeUndefined()
    expect(song.shapes).toEqual({ Gb: '2-4-4-3-2-2', 'Gb/Db': 'x-4-4-3-2-2' })
  })
})

describe("Freedom! '90 in bars (songbook no. 19)", () => {
  const FREEDOM = "Freedom! '90"
  const HOOK = '|  C  |  Bb  |  F  |  C  |'
  it('writes every line of every section in bars', () => everyLineInBars(FREEDOM))

  it("has the book's bars, the hook four times round in the intro and twice round in the fade", () => {
    expect(sectionBars(FREEDOM)).toEqual({
      Intro: 16, Verse: 16, 'Pre-Chorus': 8, 'Pre-Chorus 2': 8, Chorus: 8, Interlude: 8, Bridge: 16, Outro: 8,
    })
    const chords = Object.fromEntries(by(FREEDOM).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`${HOOK}  (x4)`)
    expect(chords.Chorus).toBe(`${HOOK}  (x2)`)
    expect(chords.Outro).toBe(`${HOOK}  (x2)`)
    expect(chords['Pre-Chorus']).toBe('|  Cm  |  Cm(maj7)  |  Cm7  |  Cm6  |\n|  Cm  |  Cm(maj7)  |  Cm7  |  G  |')
    expect(chords.Bridge).toBe('|  Cm  |  Cm(maj7)  |  Cm7  |  Cm6  |  (x3)\n|  Cm  |  Cm(maj7)  |  Cm7  |  G  |')
  })

  it('comes to the length of the recording, from the hook after the four quiet bars to the end of the fade (6:27)', () => {
    expect(Math.abs(formBars(FREEDOM) - recordingBars(FREEDOM, 11.1, 386.7))).toBeLessThanOrEqual(1)
  })

  it('stays in C with a songbook shape for every chord and its sound', () => {
    const song = by(FREEDOM)
    expect(song.key).toBe('C')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(FREEDOM).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe('Papa Was a Rolling Stone in bars (songbook no. 36, the Killer / Papa medley)', () => {
  const PAPA = 'Papa Was a Rolling Stone'
  it('writes every line of every section in bars', () => everyLineInBars(PAPA))

  it("has the book's bars, played in order, with the ending from the recording", () => {
    expect(by(PAPA).form).toBeUndefined()
    expect(sectionBars(PAPA)).toEqual({
      Intro: 9, 'Killer verse': 16, Riff: 8, 'Killer verse 2': 8, Killer: 24, 'Trumpet solo': 8, Break: 4, Papa: 40, Outro: 8,
    })
    const chords = Object.fromEntries(by(PAPA).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe('|  N.C.  |  %  |  (x4)\n|  %  |')
    expect(chords.Killer).toBe('|  Bbm  |  Bbm  Gb  |  Fm  |  %  |  (x6)')
    expect(chords['Trumpet solo']).toBe('|  Bbm  Gb  |  Fm  Ab  |  Bbm  Gb  |  Fm  Ab  |\n|  Bbm  Gb  |  Fm  Ab  |  Bbm  Gb  |  Ab  |')
    expect(chords.Papa).toBe('|  Bbm7  |  %  |  %  |  %  |  (x10)')
    expect(chords.Outro).toBe('|  Bbm7  |  %  |  %  |  %  |\n|  Bbm  |  Bbm  Gb  |  Fm  |  %  |')
  })

  it('comes to the length of the recording, up to the last Fm, where the band slows down (4:05)', () => {
    const played = Object.values(sectionBars(PAPA)).reduce((n, bars) => n + bars, 0)
    expect(Math.abs(played - recordingBars(PAPA, 0, 244.8))).toBeLessThanOrEqual(1)
  })

  it('stays in Bbm with a songbook shape for every chord and its sound and cue', () => {
    const song = by(PAPA)
    expect(song.key).toBe('Bbm')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(PAPA).filter(c => !song.shapes?.[c])).toEqual([])
    expect(song.cue).toBe('Killer / Papa medley, Wembley 1991. Killer riff with no chords until Bbm Gb Fm; Papa is Bbm7 throughout. Wah essential.')
  })
})

describe('Too Funky in bars (songbook no. 61)', () => {
  const FUNKY = 'Too Funky'
  const GROOVE = '|  Dm  G/D  |  Am/D  G/D  |  Dm  G/D  |  Am/D  G/D  |'
  it('writes every line of every section in bars', () => everyLineInBars(FUNKY))

  it("has the book's bars on its one groove, with the intro from the recording", () => {
    expect(sectionBars(FUNKY)).toEqual({ Intro: 8, Verse: 16, Keyboard: 4, 'Pre-Chorus': 8, Chorus: 4, Break: 2, Outro: 24 })
    const chords = Object.fromEntries(by(FUNKY).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`${GROOVE}  (x2)`)
    expect(chords.Verse).toBe(`${GROOVE}  (x4)`)
    expect(chords.Keyboard).toBe(GROOVE)
    expect(chords.Break).toBe('|  N.C.  |  %  |')
    expect(chords.Outro).toBe(`${GROOVE}  (x6)`)
  })

  it('plays the four keyboard bars after each verse and after the chorus', () => {
    expect(by(FUNKY).form).toEqual([
      'Intro', 'Verse', 'Keyboard', 'Verse', 'Keyboard', 'Pre-Chorus', 'Chorus', 'Keyboard', 'Break', 'Outro',
    ])
  })

  it('comes to the length of the recording, up to the end of the fade (3:41)', () => {
    expect(Math.abs(formBars(FUNKY) - recordingBars(FUNKY, 0.65, 220.6))).toBeLessThanOrEqual(1)
  })

  it('stays in Dm over the open D with the songbook shapes and its sound', () => {
    const song = by(FUNKY)
    expect(song.key).toBe('Dm')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(FUNKY).filter(c => !song.shapes?.[c])).toEqual([])
    expect(song.shapes).toEqual({ Dm: 'x-x-0-2-3-1', 'G/D': 'x-x-0-4-3-3', 'Am/D': 'x-x-0-5-5-5' })
  })
})

describe('Jesus to a Child in bars (songbook no. 35)', () => {
  const JESUS = 'Jesus to a Child'
  const VERSE = '|  C#madd9  |  G#7  |  Amaj7  |  G#7  |\n|  F#m9  |  B6  |  C#sus24  |  C#m  |'
  it('writes every line of every section in bars', () => everyLineInBars(JESUS))

  it("has the book's bars, with the intro from the recording", () => {
    expect(sectionBars(JESUS)).toEqual({
      Intro: 2, Instrumental: 8, Verse: 8, 'Pre-Chorus': 8, Chorus: 16, Bridge: 19, 'Last Chorus': 21,
    })
    const chords = Object.fromEntries(by(JESUS).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe('|  C#m  |  %  |')
    expect(chords.Verse).toBe(VERSE)
    expect(chords.Instrumental).toBe(VERSE)
    expect(chords['Pre-Chorus']).toBe('|  F#m7  |  B  |  F#m7  |  B  |\n|  Emaj7  |  G#7sus4  |  G#  |  %  |')
    expect(chords['Last Chorus'].split('\n').slice(-2)).toEqual(['|  G#m7  |  F#m7  |  G#aug  |  C#m11  |', '|  %  |'])
  })

  it('starts the chorus on C#m7 both times round, by ear from the record (the book has G#m7)', () => {
    const chorus = by(JESUS).sections.find(s => s.name === 'Chorus')!.chords.split('\n')
    expect(chorus[0]).toBe('|  C#m7  |  B  |  Amaj7  |  G#m7  |')
    expect(chorus[2]).toBe(chorus[0])
  })

  it('plays the verse chords twice before the voice comes in, and again after the first chorus', () => {
    expect(by(JESUS).form).toEqual([
      'Intro', 'Instrumental', 'Instrumental', 'Verse', 'Verse', 'Pre-Chorus', 'Chorus',
      'Instrumental', 'Verse', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Last Chorus',
    ])
  })

  it('comes to the length of the recording, up to the end of the last C#m11 (6:44)', () => {
    expect(Math.abs(formBars(JESUS) - recordingBars(JESUS, 0.627, 404.5))).toBeLessThanOrEqual(1)
  })

  it('stays in C#m at concert pitch with a songbook shape for every chord and its sound', () => {
    const song = by(JESUS)
    expect(song.key).toBe('C#m')
    expect(song.transpose).toBeUndefined()
    expect(song.capo).toBeNull()
    expect(chordsOf(JESUS).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe("Everything She Wants in bars (songbook no. 11, the 12-inch version)", () => {
  const ESW = 'Everything She Wants'
  const GROOVE = '|  F#sus4  |  F#  |  Esus24  |  Eadd9  |'
  // The record is the 12-inch remix: after the third chorus it plays 32 bars
  // the book doesn't have (4:16 to 5:23), which are not charted.
  const REMIX_BARS = 32
  it('writes every line of every section in bars', () => everyLineInBars(ESW))

  it("has the book's bars, with the intro from the recording", () => {
    expect(sectionBars(ESW)).toEqual({
      Intro: 26, Verse: 16, 'Post-Verse': 8, 'Pre-Chorus': 2, Chorus: 6, Instrumental: 8, Bridge: 8, Outro: 16,
    })
    const chords = Object.fromEntries(by(ESW).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`|  N.C.  |  %  |\n${GROOVE}  (x6)`)
    expect(chords.Verse).toBe(`${GROOVE}  (x4)`)
    expect(chords['Pre-Chorus']).toBe('|  Bm  C#aug  |  C#  |')
    expect(chords.Chorus).toBe('|  F#m  |  %  |  Bm  C#aug  |  C#  |\n|  F#m  |  %  |')
    expect(chords.Bridge).toBe('|  F#sus4  |  %  |  Bm  |  %  |  (x2)')
    expect(chords.Outro).toBe('|  Bm  C#aug  |  C#  |  F#m  |  %  |  (x4)')
  })

  it('plays the verse chords after each chorus but the last, and the bridge before the third chorus', () => {
    expect(by(ESW).form).toEqual([
      'Intro', 'Verse', 'Post-Verse', 'Pre-Chorus', 'Chorus', 'Instrumental',
      'Verse', 'Post-Verse', 'Pre-Chorus', 'Chorus', 'Instrumental',
      'Bridge', 'Pre-Chorus', 'Chorus', 'Instrumental', 'Pre-Chorus', 'Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording with the remix section, up to the end of the fade (6:29)', () => {
    expect(Math.abs(formBars(ESW) + REMIX_BARS - recordingBars(ESW, 0.58, 389.3))).toBeLessThanOrEqual(1)
  })

  it('stays in F#m with a songbook shape for every chord and its sound', () => {
    const song = by(ESW)
    expect(song.key).toBe('F#m')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(ESW).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe('Fastlove in bars (songbook no. 13)', () => {
  const FAST = 'Fastlove'
  const VAMP = '|  Dm9  |  Am11  |  Dm9  |  Am11  |'
  const BRIDGE = '|  Am7  Fmaj9  |  G6  Em7  |  Am7  Fmaj9  |  G6  Em7  |'
  it('writes every line of every section in bars', () => everyLineInBars(FAST))

  it("has the book's bars, with the intro, the drum break and the outro counted on the recording", () => {
    expect(sectionBars(FAST)).toEqual({
      Intro: 12, Verse: 16, Chorus: 8, Instrumental: 8, 'Post-Chorus': 8, 'Drum break': 4, Bridge: 24, Outro: 8,
    })
    const chords = Object.fromEntries(by(FAST).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`${VAMP}  (x3)`)
    expect(chords.Verse).toBe(`${VAMP}  (x4)`)
    expect(chords.Chorus).toBe('|  Am7  |  Fmaj7  |  Am7  |  Dm9  |\n|  Am7  |  Fmaj7  |  Em7  |  Dm9  |')
    expect(chords.Instrumental).toBe(`${VAMP}  (x2)`)
    expect(chords['Drum break']).toBe('|  N.C.  |  %  |  %  |  %  |')
    expect(chords.Bridge).toBe(`${BRIDGE}  (x6)`)
    expect(chords.Outro).toBe(`${BRIDGE}  (x2)`)
  })

  it('opens with the groove before the verse', () => {
    expect(by(FAST).form).toEqual([
      'Intro', 'Verse', 'Chorus', 'Instrumental', 'Verse', 'Chorus', 'Instrumental', 'Post-Chorus', 'Drum break', 'Bridge', 'Outro',
    ])
  })

  it('comes to the length of the recording, from the groove after four quiet bars to the held A at the end (0:10 to 4:48)', () => {
    expect(Math.abs(formBars(FAST) - recordingBars(FAST, 9.77, 287.6))).toBeLessThanOrEqual(1)
  })

  it('stays in Am with a songbook shape for every chord and its sound', () => {
    const song = by(FAST)
    expect(song.key).toBe('Am')
    expect(song.transpose).toBeUndefined()
    expect(chordsOf(FAST).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe('Kissing a Fool in bars (songbook no. 37)', () => {
  const KISS = 'Kissing a Fool'
  const chords = () => Object.fromEntries(by(KISS).sections.map(s => [s.name, s.chords]))
  it('writes every line of every section in bars', () => everyLineInBars(KISS))

  it("has the book's bars, four to a line, with the odd last bar on a line of its own", () => {
    expect(sectionBars(KISS)).toEqual({
      Intro: 4, Verse: 8, Chorus: 17, Bridge: 9, 'Bridge 2': 11, 'Last verse': 5, Outro: 5,
    })
    const c = chords()
    expect(c.Intro).toBe('|  Eb  |  Edim7  |  Fm  |  Abm6  Bb  |')
    expect(c.Verse).toBe('|  Eb6  |  Edim7  |  Fm7  |  Cb(b5)  Bb7  |\n|  Eb6  |  C7(b9)  |  Fm7  |  Cb(b5)  Bb  |')
    expect(c.Chorus).toBe(
      '|  Eb6  |  Edim7  |  Fm7  |  Abm6  Bb7(b9)  |\n|  Eb6  Db6(b5)  |  C7  |  Fm11  Fm7  |  Bb13  Bb7(b9)  |\n' +
        '|  Eb6  |  Db(b5)  C7(b9)  |  Fm7  |  Abm  Bb7  |\n|  Eb6  Db6(b5)  |  C7  |  Fm7  |  Abm6  Bb7  |\n|  Eb6  Fdim7/Eb  |',
    )
    expect(c.Bridge).toBe('|  Eb  Cm7  C7(b9)  |\n|  Fm7  |  Bb  |  Fm7  |  Bb  |\n|  Ebm7  |  Ab7  |  Db  Db/C  |  Bb7  |')
    expect(c['Bridge 2']).toBe(
      '|  Eb  Cm7  |\n|  Fm7  |  Cb7  |  Eb/Bb  Eb  |  Db6  C7  |\n|  Fm9  |  Cb6  |  Bb7sus4  Cm7  |  Fm7  |\n|  Bb  |  Bb7(b9)  |',
    )
    expect(c['Last verse']).toBe('|  Eb6  |  Edim7  |  Fm7  |  Cb(b5)  Bb7  |\n|  Eb6  |')
    expect(c.Outro).toBe('|  C7(b9)  |  Cb7  Bb7  |  Eb6  C9  |  Cb7  Bb7  |\n|  Ebmaj9  |')
  })

  it('keeps the form', () => {
    expect(by(KISS).form).toEqual(['Intro', 'Verse', 'Chorus', 'Bridge', 'Verse', 'Chorus', 'Bridge 2', 'Last verse', 'Outro'])
  })

  it('comes to the length of the recording, up to the held chords at the end (0:00 to 4:19)', () => {
    expect(Math.abs(formBars(KISS) - recordingBars(KISS, 0.378, 259.4))).toBeLessThanOrEqual(1)
  })

  it('stays in the book\'s Eb, played a semitone down in D, with a band shape for every chord and its sound', () => {
    const song = by(KISS)
    expect(song.key).toBe('Eb')
    expect(song.transpose).toBe(-1)
    expect(song.lowerKey).toBe(true)
    expect(song.shapes?.['Edim7/D']).toBe('x-x-0-3-2-3')
    expect(chordsOf(KISS).map(c => transposeInKey(c, 'Eb', -1)).filter(c => !song.shapes?.[c])).toEqual([])
  })
})

describe('Waiting (Reprise) in bars (songbook no. 63)', () => {
  const WAIT = 'Waiting (Reprise)'
  const VAMP = '|  G  |  Cadd9  |  G  |  Cadd9  |'
  it('writes every line of every section in bars', () => everyLineInBars(WAIT))

  it("has the book's bars, with the guitar's intro from the recording", () => {
    expect(sectionBars(WAIT)).toEqual({ Intro: 8, Verse: 4, Hook: 4, 'Verse 2': 6, 'Last verse': 10, Ending: 5 })
    const chords = Object.fromEntries(by(WAIT).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`${VAMP}  (x2)`)
    expect(chords.Verse).toBe(VAMP)
    expect(chords.Hook).toBe(VAMP)
    expect(chords['Verse 2']).toBe(`${VAMP}\n|  D  |  C  |`)
    expect(chords['Last verse']).toBe(`${VAMP}  (x2)\n|  D  |  C  |`)
    expect(chords.Ending).toBe(`${VAMP}\n|  G  |`)
  })

  it('opens with the vamp before the first verse', () => {
    expect(by(WAIT).form).toEqual(['Intro', 'Verse', 'Hook', 'Verse 2', 'Hook', 'Last verse', 'Ending'])
  })

  it('comes to the length of the recording, to the last G (0:00 to 2:21)', () => {
    expect(Math.abs(formBars(WAIT) - recordingBars(WAIT, 0.5, 141.5))).toBeLessThanOrEqual(2)
  })

  it('stays in G with the book\'s open shapes and its sound', () => {
    const song = by(WAIT)
    expect(song.key).toBe('G')
    expect(song.transpose).toBeUndefined()
    expect(song.shapes).toEqual({ G: '3-x-0-0-3-3', Cadd9: 'x-3-2-0-3-3', D: 'x-x-0-2-3-2', C: 'x-3-2-0-1-0' })
  })
})

describe('Last Christmas in bars (published chords, form from the recording)', () => {
  const XMAS = 'Last Christmas'
  const ROUND = '|  D  |  %  |  Bm7  |  %  |\n|  Em7  |  %  |  A  |  %  |'
  it('writes every line of every section in bars', () => everyLineInBars(XMAS))

  it('plays one 8-bar round everywhere, two bars a chord, and ends on D', () => {
    expect(sectionBars(XMAS)).toEqual({ Intro: 8, Chorus: 8, Instrumental: 8, Verse: 8, Outro: 9 })
    for (const name of ['Intro', 'Chorus', 'Instrumental', 'Verse']) {
      expect(by(XMAS).sections.find(s => s.name === name)!.chords, name).toBe(ROUND)
    }
    expect(by(XMAS).sections.find(s => s.name === 'Outro')!.chords).toBe(`${ROUND}\n|  D  |`)
  })

  it('goes round the chorus twice, a round with no voice, then the verse twice, three times over', () => {
    expect(by(XMAS).form).toEqual([
      'Intro', 'Chorus', 'Chorus', 'Instrumental', 'Verse', 'Verse',
      'Chorus', 'Chorus', 'Instrumental', 'Verse', 'Verse',
      'Chorus', 'Chorus', 'Instrumental', 'Outro',
    ])
  })

  it('comes to the length of the recording, to where the fade has gone (4:24), with the band\'s last D', () => {
    expect(Math.abs(formBars(XMAS) - recordingBars(XMAS, 0.224, 264.2))).toBeLessThanOrEqual(3)
  })

  it('stays in D with its sound and no shapes of its own', () => {
    const song = by(XMAS)
    expect(song.key).toBe('D')
    expect(song.transpose).toBeUndefined()
    expect(song.shapes).toBeUndefined()
  })
})
