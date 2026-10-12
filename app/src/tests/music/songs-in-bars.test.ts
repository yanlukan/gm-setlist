import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { barsOf, hasBars, REPEAT_BAR, isRepeatCount } from '../../music/bars'

// The songs charted in bars from the songbook, each checked against the
// recording: the bars of the song order, played through, must come to the
// recording's length at its tempo.

const by = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
const tokens = (line: string) => line.split(/\s+/).filter(Boolean)
/** How many times a line is played: once, or as its repeat count says. */
const timesPlayed = (line: string) => Number(tokens(line).find(isRepeatCount)?.match(/\d+/)?.[0] ?? 1)
const barsIn = (chords: string) =>
  chords.split('\n').reduce((n, line) => n + barsOf(tokens(line)).length * timesPlayed(line), 0)
const sectionBars = (title: string) => Object.fromEntries(by(title).sections.map(s => [s.name, barsIn(s.chords)]))

/** The recording's bars at its tempo, leaving out an opening in free time and,
 * for a long fade, what comes after the music has gone (both in seconds). */
function recordingBars(title: string, freeTime = 0, end = by(title).duration!) {
  const song = by(title)
  const [top, bottom] = (song.timeSignature ?? '4/4').split('/').map(Number)
  // In 6/8 or 12/8 the tempo counts dotted quarters, three eighths a beat
  const beatsPerBar = bottom === 8 && top % 3 === 0 ? top / 3 : top
  return ((end - freeTime) * song.bpm!) / 60 / beatsPerBar
}
const chordsOf = (title: string) =>
  [...new Set(by(title).sections.flatMap(s => tokens(s.chords)).filter(t => t !== '|' && t !== REPEAT_BAR && !isRepeatCount(t) && t !== 'N.C.'))]
function everyLineInBars(title: string) {
  for (const section of by(title).sections) {
    for (const line of section.chords.split('\n')) expect(hasBars(line), `${section.name}: ${line}`).toBe(true)
  }
}
function formBars(title: string) {
  const bars = sectionBars(title)
  return by(title).form!.reduce((n, name) => n + bars[name], 0)
}
/** A section's lines as played: each % written out as the bar it repeats. */
function playedLines(chords: string) {
  let before: string[] = []
  return chords.split('\n').map(line =>
    barsOf(tokens(line).filter(t => !isRepeatCount(t)))
      .map(bar => (before = bar[0] === REPEAT_BAR ? before : bar).join(' '))
      .join(' | '),
  )
}

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
    for (const title of ['Faith', "I'm Your Man", 'Club Tropicana', 'Amazing', 'Roxanne', 'A Different Corner', "Freedom! '90", 'Papa Was a Rolling Stone']) {
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

  it('stays in Bbm, a semitone above the band, with the pre-chorus starting on the band\'s chord', () => {
    expect(by('Amazing').key).toBe('Bbm')
    expect(by('Amazing').transpose).toBe(-1)
    expect(by('Amazing').sections.find(s => s.name === 'Pre-Chorus')!.chords.startsWith('|  Cm7  |')).toBe(true)
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
    expect(song.preset).toEqual({ name: 'WARM JAZZ', slot: 'U01-3' })
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
    expect(song.preset).toEqual({ name: 'WARM JAZZ', slot: 'U01-3' })
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
    expect(song.preset).toEqual({ name: 'FUNK', slot: 'U01-1' })
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
    expect(song.preset).toEqual({ name: 'FUNK', slot: 'U01-1' })
    expect(song.cue).toBe('Killer / Papa medley, Wembley 1991. Killer riff with no chords until Bbm Gb Fm; Papa is Bbm7 throughout. Wah essential.')
  })
})
