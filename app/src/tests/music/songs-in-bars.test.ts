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
    expect(sectionBars(LOVE)).toEqual({ Intro: 8, Verse: 8, 'Pre-Chorus': 3, Chorus: 12, Interlude: 4, Outro: 18 })
  })

  it('names the parts by what is sung: the riff after the chorus is not chorus (2026-11-26)', () => {
    // The player said the sections were wrong. The sung chorus is 12 bars; the
    // intro's line comes back after it (an Interlude the first time, the start
    // of the Outro the second), and the three bars that leave the verse's line
    // are a Pre-Chorus. Every part starts on its own first bar, whole lines only.
    expect(by(LOVE).form).toEqual(['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Interlude', 'Verse', 'Pre-Chorus', 'Chorus', 'Outro'])
    const c = Object.fromEntries(by(LOVE).sections.map(s => [s.name, s.chords]))
    expect(c['Pre-Chorus']).toBe('|  Am7  |  G/D  |  D  G/B  |')
    expect(c.Interlude).toBe('|  Cadd9  Em11  |  C  |  G/B  |  Am7  |')
    expect(c['Last chorus']).toBeUndefined()
    expect(c['Chorus end']).toBeUndefined()
    expect(c.Outro).toBe(
      '|  Cadd9  Em11  |  C  |  G/B  |  Em7  Am7  |\n|  Cadd9  Em11  |  C  |  G/B  |  Am7  |\n|  C  Em11  |  C  |  G/B  |  Em7  Am7  |\n|  C  Em11  |  Cadd9  |  G/B  |  Em7  Cadd9  |\n|  Cadd9  |  Fmaj9  |',
    )
  })

  it("plays the chorus's third bar as its first, both chords, as the recording does (2026-11-26)", () => {
    const chorus = by(LOVE).sections.find(s => s.name === 'Chorus')!.chords
    expect(chorus.split('\n')[0]).toBe('|  Cadd9  G  |  Cadd9  |  Cadd9  G  |  G/B  C  D  |')
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
      Intro: 8, 'Intro 2': 4, Verse: 8, Chorus: 8, Instrumental: 12, 'Bass solo': 8, 'Last verse': 16, Outro: 18,
    })
  })

  it('keeps the song order', () => {
    expect(by(TROP).form).toEqual([
      'Intro', 'Intro 2', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Instrumental', 'Chorus', 'Bass solo', 'Last verse', 'Chorus', 'Outro',
    ])
  })

  it('moves to E in the second half of every second groove bar, as the recording does (2026-11-23)', () => {
    // Bass, guitar and keys stems over every verse, the instrumental and the
    // outro: bar 1 is F#m7; bar 2 is B, then E on its last two beats (bass
    // B D# E D#, the keys on E major 7). The chart had a whole bar of B7.
    const chords = Object.fromEntries(by(TROP).sections.map(s => [s.name, s.chords]))
    const GROOVE = '|  F#m7  |  B  E  |  F#m7  |  B  E  |'
    expect(chords['Intro 2']).toBe(GROOVE)
    expect(chords.Verse).toBe(`${GROOVE}\n|  F#m7  |  B  E  |  F#m7  |  B  B/D#  .  E  |`)
    expect(chords.Instrumental).toBe(`${GROOVE}  (x2)\n|  F#m7  |  B  E  |  F#m7  |  B  B/D#  .  E  |`)
    // The walk-up is the last two bars of the last verse's fourth time round, not a part of its own (2026-11-24)
    expect(chords['Last verse']).toBe(`${GROOVE}  (x3)\n|  F#m7  |  B  E  |  F#m7  |  B  C#m  B/D#  E  |`)
    expect(chords['Walk-up']).toBeUndefined()
    expect(chords.Outro).toBe(`${GROOVE}  (x2)\n|  F#m7  |  B  E  |  F#m7  |  B  C#m  B/D#  E  |\n${GROOVE}\n|  F#m7  |  B  E  |`)
    // Under the bass solo the keys stay on B
    expect(chords['Bass solo']).toBe('|  F#m7  |  B  |  F#m7  |  B  |  (x2)')
    // The slap-bass opening and the chorus are as they were
    expect(chords.Intro).toBe('|  F#m7  |  %  |  %  |  %  |  (x2)')
    expect(chords.Chorus).toBe('|  B  |  D#m7  |  B  |  D#m7  |\n|  B  |  D#m7  |  B  |  D#m7  Dm7  C#m7  |')
    for (const name of ['Intro 2', 'Verse', 'Instrumental', 'Bass solo', 'Last verse', 'Outro']) {
      expect(by(TROP).evidence?.[name]?.from, name).toBe('Record')
    }
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

  it("has the book's bars, and before them the 12-bar intro of the recording", () => {
    expect(sectionBars(ROX)).toEqual({
      Intro: 12, Verse: 8, 'Verse 2': 8, Chorus: 8, Interlude: 4, 'Pre-Chorus': 8, 'Chorus 2': 9, Outro: 12, Ending: 3,
    })
  })

  it('plays the verse chords once with no voice before the singer comes in, the B11 held two bars', () => {
    // Measured on the recording (bass and voice stems, 2026-11-23): 4 bars of
    // the vamp from 0:03, the verse chords from 0:15, the voice at 0:38.
    expect(by(ROX).sections.find(s => s.name === 'Intro')!.chords).toBe(
      '|  Bm7  |  A  |  Bm7  |  A  |\n|  Bm  |  F#m  |  Gmaj7  |  F#m7  |\n|  Em7  |  G/A  |  B11  |  %  |',
    )
  })

  it("has the chords the player hears: A in the vamp, F#m in the verse's second bar", () => {
    // The player, 2026-11-23: "starts from Bm7, A, later Bm, F#m, Gmaj7 f#m7". The
    // recording agrees: the bass plays A under the vamp's second chord (the book's
    // B11 has B), and the piano plays F# A C# over the bass's A (the book: D/A).
    const chords = (name: string) => by(ROX).sections.find(s => s.name === name)!.chords
    expect(chords('Interlude')).toBe('|  Bm7  |  A  |  Bm7  |  A  |')
    for (const name of ['Verse', 'Verse 2']) {
      expect(chords(name).split('\n')[0], name).toBe('|  Bm  |  F#m  |  Gmaj7  |  F#m7  |')
    }
    expect(chordsOf(ROX)).not.toContain('D/A')
  })

  it('ends the second verse on both stabs and holds the B11 two bars before the N.C.', () => {
    const chords = (name: string) => by(ROX).sections.find(s => s.name === name)!.chords
    // The last bar from the recording (2026-11-23): the Bm7 still rings on beat 1,
    // then bass and piano walk up a beat each, G#, C#, F#, into the chorus's Em9.
    expect(chords('Verse 2').endsWith('|  N.C.  E  Bm7  |  Bm7  E/G#  A/C#  F#m  |')).toBe(true)
    expect(chords('Chorus')).toBe('|  Em9  |  G/A  |  B11  |  %  |\n|  Em9  |  G/A  |  B11  |  B11  N.C.  |')
  })

  it('keeps the order of its parts', () => {
    expect(by(ROX).form).toEqual([
      'Intro', 'Verse', 'Verse 2', 'Chorus', 'Interlude', 'Verse', 'Pre-Chorus', 'Chorus 2', 'Outro', 'Ending',
    ])
  })

  it('comes to the length of the recording, with the free ending (from 3:48) left out', () => {
    const charted = formBars(ROX) - sectionBars(ROX).Ending
    expect(Math.abs(charted - recordingBars(ROX, 3, 228.5))).toBeLessThanOrEqual(1)
  })

  it('stays in Bm with the songbook shapes and its sound and cue', () => {
    const song = by(ROX)
    expect(song.key).toBe('Bm')
    expect(song.transpose).toBeUndefined()
    // A and F#m are the player's chords and the walk-up is from the recording: the app recommends their shapes
    expect(chordsOf(ROX).filter(c => !song.shapes?.[c]).sort()).toEqual(['A', 'A/C#', 'E/G#', 'F#m'])
    expect(Object.keys(song.shapes ?? {})).not.toContain('D/A')
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

  it("has the book's bars, played in order, with the opening riff and the ending counted from the recording", () => {
    expect(by(PAPA).form).toBeUndefined()
    // The opening, from the recording's voice stem (2026-11-23): the two-bar
    // riff 3 times before the voice, 7 times under the first verse, 6 times
    // alone (the voice picks up in its last bar), 4 times under the second
    // verse: 40 bars before the first chord. The book has 9, 16, 8 and 8.
    expect(sectionBars(PAPA)).toEqual({
      Intro: 6, 'Killer verse': 14, Riff: 12, 'Killer verse 2': 8, Killer: 24, 'Trumpet solo': 8, Break: 4, Papa: 40, Outro: 8,
    })
    const chords = Object.fromEntries(by(PAPA).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe('|  N.C.  |  %  |  (x3)')
    expect(chords['Killer verse']).toBe('|  N.C.  |  %  |  (x7)')
    expect(chords.Riff).toBe('|  N.C.  |  %  |  (x6)')
    expect(chords['Killer verse 2']).toBe('|  N.C.  |  %  |  %  |  %  |  (x2)')
    for (const name of ['Intro', 'Killer verse', 'Riff']) expect(by(PAPA).evidence?.[name]?.from, name).toBe('Record')
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
      Intro: 2, Instrumental: 8, Verse: 8, 'Pre-Chorus': 8, Chorus: 16, Bridge: 15, 'Last Chorus': 25,
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
  // The record is the 12-inch version: after the third chorus comes a sung
  // part the book doesn't have, 16 bars twice (4:16 to 5:23). The player
  // missed it on the chart (2026-11-23); its chords are read from the recording.
  const MIDDLE = '|  F#m  |  %  |  C#m7  |  C#7  |  (x2)\n|  Bm7  |  C#m7  |  F#m  |  B7  |\n|  D  |  %  |  G#m7  |  C#7  |'
  it('writes every line of every section in bars', () => everyLineInBars(ESW))

  it("has the book's bars, with the intro from the recording", () => {
    expect(sectionBars(ESW)).toEqual({
      Intro: 26, Verse: 16, 'Post-Verse': 8, 'Pre-Chorus': 2, Chorus: 6, Instrumental: 8, Bridge: 8, Middle: 16, Outro: 16,
    })
    const chords = Object.fromEntries(by(ESW).sections.map(s => [s.name, s.chords]))
    expect(chords.Intro).toBe(`|  N.C.  |  %  |\n${GROOVE}  (x6)`)
    expect(chords.Verse).toBe(`${GROOVE}  (x4)`)
    expect(chords['Pre-Chorus']).toBe('|  Bm  C#aug  |  C#  |')
    expect(chords.Chorus).toBe('|  F#m  |  %  |  Bm  C#aug  |  C#  |\n|  F#m  |  %  |')
    expect(chords.Bridge).toBe('|  F#sus4  |  %  |  Bm  |  %  |  (x2)')
    expect(chords.Middle).toBe(MIDDLE)
    expect(chords.Outro).toBe('|  Bm  C#aug  |  C#  |  F#m  |  %  |  (x4)')
  })

  it('plays the bridge before the third chorus and the middle part twice after it', () => {
    expect(by(ESW).form).toEqual([
      'Intro', 'Verse', 'Post-Verse', 'Pre-Chorus', 'Chorus', 'Instrumental',
      'Verse', 'Post-Verse', 'Pre-Chorus', 'Chorus', 'Instrumental',
      'Bridge', 'Pre-Chorus', 'Chorus', 'Middle', 'Middle', 'Instrumental', 'Pre-Chorus', 'Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording, up to the end of the fade (6:29)', () => {
    expect(Math.abs(formBars(ESW) - recordingBars(ESW, 0.58, 389.3))).toBeLessThanOrEqual(1)
  })

  it('stays in F#m with a songbook shape for every chord of the book and its sound', () => {
    const song = by(ESW)
    expect(song.key).toBe('F#m')
    expect(song.transpose).toBeUndefined()
    // The middle part's chords are not in the book: the app recommends their shapes
    expect(chordsOf(ESW).filter(c => !song.shapes?.[c]).sort()).toEqual(['B7', 'Bm7', 'C#7', 'C#m7', 'D', 'G#m7'])
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

  it("has the book's bars, four to a line, and no part opens on a bar left over from the part before (2026-11-24)", () => {
    // After the rehearsal of 2026-11-24 the player found the chart confusing: a
    // whole line with one bar of two chords, and parts that seemed to begin with
    // the chords of the part before. The verse's 25th bar and the bar that leads
    // into the Bridge (and into the Middle 8) are a two-bar turnaround: they are
    // now a Link of their own, so the Verse is three clean rounds of 8 bars and
    // the Bridge and the Middle 8 start on their own first bar. The last verse's
    // fifth bar is the Outro's first.
    expect(sectionBars(KISS)).toEqual({
      Intro: 4, Verse: 24, Link: 2, Bridge: 8, 'Link 2': 2, 'Middle 8': 10, 'Last verse': 4, Outro: 7,
    })
    const c = chords()
    expect(c.Intro).toBe('|  Eb  |  Edim7  |  Fm  |  Abm6  Bb  |')
    expect(c['Last verse']).toBe('|  Eb6  |  Edim7  |  Fm7  |  Cb(b5)  Bb7  |')
    for (const s of by(KISS).sections) expect(s.chords.split('\n')[0].split('|').filter(b => b.trim()).length, s.name).toBeGreaterThan(1)
  })

  it('has the five places where the recording differs from the book (read 2026-11-24)', () => {
    // Every bar read from the recording's stems with the pitch corrected (the
    // record sits half a semitone under Eb): bass note, notes of each
    // instrument and the chord model, a beat at a time. 79 of 84 bars are the
    // book's. These are not:
    const c = chords()
    const verse = c.Verse.split('\n')
    // Verse bar 16, both rounds: C, Eb, G and Ab over the bass's Bb, and no third (D)
    // until the Bb7(b9). The book's Bb13 has that D. Written as the notes played:
    // Abmaj7 over Bb (a Bb13 with the fourth for its third), which the chord library draws
    expect(verse[3]).toBe('|  Eb6  Db6(b5)  |  C7  |  Fm11  Fm7  |  Abmaj7/Bb  Bb7(b9)  |')
    // Verse bar 25: F, Ab, Cb over the held Eb, as the book NAMES it (a plain
    // diminished chord over the bass); the dim7 of the book's box has a D that
    // nobody plays
    expect(verse[6]).toBeUndefined()
    // The bar that leads into the Bridge: Eb for two beats, then a beat each.
    // Into the Middle 8 it is two beats each, without the last chord
    expect(c.Link).toBe('|  Eb6  Abm6/Eb  |  Eb  .  Cm7  C7(b9)  |')
    expect(c['Link 2']).toBe('|  Eb6  Abm6/Eb  |  Eb  Cm7  |')
    expect(c.Bridge).toBe('|  Fm7  |  Bb  |  Fm7  |  Bb  |\n|  Ebm7  |  Ab7  |  Db  Db/C  |  Bb7  |')
    // Middle 8 bar 9: the fourth first, then the third
    expect(c['Middle 8'].split('\n')[2]).toBe('|  Bb7sus4  Bb  |  Bb7(b9)  |')
    // Outro: the band slows down, and the last Cb7 and Bb7 take a bar each
    expect(c.Outro).toBe('|  Eb6  |  C7(b9)  |  Cb7  Bb7  |  Eb6  C9  |\n|  Cb7  |  Bb7  |  Ebmaj9  |')
    const ev = by(KISS).evidence!
    expect(ev.Verse.bars).toEqual([{ bar: 15, chords: 'Abmaj7/Bb Bb7(b9)', from: 'Record' }])
    expect(ev.Link.bars).toEqual([{ bar: 0, chords: 'Eb6 Abm6/Eb', from: 'Record' }])
    expect(ev['Link 2'].bars).toEqual([{ bar: 0, chords: 'Eb6 Abm6/Eb', from: 'Record' }])
    expect(ev['Middle 8'].bars).toEqual([{ bar: 8, chords: 'Bb7sus4 Bb', from: 'Record' }])
    expect(ev.Outro.bars).toEqual([{ bar: 4, chords: 'Cb7', from: 'Record' }, { bar: 5, chords: 'Bb7', from: 'Record' }])
  })

  it('names the parts as the player hears them: one long verse, no chorus (2026-11-24)', () => {
    // The book prints no part names. The 16 bars after the first 8 were
    // labelled Chorus by the chart's writer; they run on the verse's chord
    // loop twice more (voice stem: a new tune each time round, the same words
    // in both rounds), and the title is only sung at the very end. The player
    // said the names were wrong and chose Verse for all 24 bars. The two contrasting parts are different music: the first stays
    // Bridge, the second (3:15, the high part) is the Middle 8.
    const c = chords()
    expect(c.Chorus).toBeUndefined()
    expect(c['Bridge 2']).toBeUndefined()
    expect(c.Verse).toBe(
      '|  Eb6  |  Edim7  |  Fm7  |  Cb(b5)  Bb7  |\n|  Eb6  |  C7(b9)  |  Fm7  |  Cb(b5)  Bb  |\n' +
        '|  Eb6  |  Edim7  |  Fm7  |  Abm6  Bb7(b9)  |\n|  Eb6  Db6(b5)  |  C7  |  Fm11  Fm7  |  Abmaj7/Bb  Bb7(b9)  |\n' +
        '|  Eb6  |  Db(b5)  C7(b9)  |  Fm7  |  Abm  Bb7  |\n|  Eb6  Db6(b5)  |  C7  |  Fm7  |  Abm6  Bb7  |',
    )
    expect(c['Middle 8']).toBe(
      '|  Fm7  |  Cb7  |  Eb/Bb  Eb  |  Db6  C7  |\n|  Fm9  |  Cb6  |  Bb7sus4  Cm7  |  Fm7  |\n|  Bb7sus4  Bb  |  Bb7(b9)  |',
    )
    expect(by(KISS).form).toEqual(['Intro', 'Verse', 'Link', 'Bridge', 'Verse', 'Link 2', 'Middle 8', 'Last verse', 'Outro'])
    expect(by(KISS).notes).toContain('Form: Intro, Verse, Link, Bridge, Verse, Link 2, Middle 8, Last verse, Outro.')
    expect(by(KISS).notes).not.toMatch(/chorus/i)
  })

  it('comes to the length of the recording, up to the held chords at the end (0:00 to 4:19)', () => {
    expect(Math.abs(formBars(KISS) - recordingBars(KISS, 0.378, 259.4))).toBeLessThanOrEqual(1)
  })

  it('stays in the book\'s Eb, played a semitone down in D, with a band shape for every chord and its sound', () => {
    const song = by(KISS)
    expect(song.key).toBe('Eb')
    expect(song.transpose).toBe(-1)
    expect(song.lowerKey).toBe(true)
    // The two chords read from the recording have no box in the book; the box of the
    // chord that went (Edim7/D) went with it
    expect(song.shapes?.['Edim7/D']).toBeUndefined()
    expect(chordsOf(KISS).map(c => transposeInKey(c, 'Eb', -1)).filter(c => !song.shapes?.[c]).sort()).toEqual(['Gm6/D', 'Gmaj7/A'])
    expect(song.shapes?.A13).toBeUndefined()
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
