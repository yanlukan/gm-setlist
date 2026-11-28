import { describe, it, expect } from 'vitest'
import { by, sectionBars, recordingBars, chordsOf, everyLineInBars, formBars } from '../songs-in-bars-helpers'

// Batch 6 (3.63.0): the gig songs after the rehearsal setlist, in bars, each
// checked against the recording like the songs in songs-in-bars.test.ts.

const chordsIn = (title: string) => Object.fromEntries(by(title).sections.map(s => [s.name, s.chords]))
const withoutShape = (title: string) => chordsOf(title).filter(c => !by(title).shapes?.[c])

describe('Outside in bars (songbook no. 47)', () => {
  const OUT = 'Outside'
  const GROOVE = '|  Gm9  |  C6  |  Gm9  |  C6  |'
  it('writes every line of every section in bars', () => everyLineInBars(OUT))

  it("has the book's chords, with the intro and the groove after each chorus from the recording", () => {
    expect(sectionBars(OUT)).toEqual({ Intro: 16, Verse: 16, Chorus: 16, 'Post-Chorus': 8, Instrumental: 8, Outro: 16 })
    const chords = chordsIn(OUT)
    expect(chords.Intro).toBe(`${GROOVE}  (x4)`)
    expect(chords.Verse).toBe(`${GROOVE}  (x4)`)
    expect(chords.Chorus).toBe('|  Cm7  |  Cm6  |  Gm9  |  Gm  |  (x3)\n|  Cm7  |  Cm6  |  Dsus4  |  Dsus4  |')
    expect(chords['Post-Chorus']).toBe(`${GROOVE}  (x2)`)
    expect(chords.Outro).toBe(`${GROOVE}  (x4)`)
  })

  it('writes what the recording plays in the break, not eight empty bars', () => {
    // The player missed this part on the chart (2026-11-23): it read N.C. for
    // 8 bars, as the book prints it. On the recording (3:01 to 3:16) bass and
    // drums play alone for 4 bars, the bass on a low G; then the keys play F
    // over that G, and a G7 on the last two beats leads into the chorus's Cm7.
    const song = by(OUT)
    expect(song.sections.find(s => s.name === 'Instrumental')!.chords).toBe(
      '|  N.C.  |  %  |  %  |  %  |\n|  F/G  |  %  |  %  |  F/G  G7  |',
    )
    expect(song.evidence?.Instrumental?.from).toBe('Record')
  })

  it('has a song order: two verses, the chorus, and the guitar out for the instrumental', () => {
    expect(by(OUT).form).toEqual([
      'Intro', 'Verse', 'Verse', 'Chorus', 'Post-Chorus', 'Verse', 'Instrumental', 'Chorus', 'Post-Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording, from the end of the quiet opening to where the fade has gone (0:08 to 4:39)', () => {
    expect(Math.abs(formBars(OUT) - recordingBars(OUT, 8.28, 279.45))).toBeLessThanOrEqual(2)
  })

  it('stays in Gm with a songbook shape for every chord of the book and its sound', () => {
    const song = by(OUT)
    expect(song.key).toBe('Gm')
    expect(song.transpose).toBeUndefined()
    // F/G and G7 are the break's chords, from the recording: the app recommends their shapes
    expect(withoutShape(OUT).sort()).toEqual(['F/G', 'G7'])
    expect(song.shapes).toEqual({
      Gm9: '3-5-3-3-3-5', C6: 'x-3-5-5-5-5', Cm7: 'x-3-5-3-4-3', Cm6: 'x-3-7-5-4-3', Gm: '3-5-5-3-3-3', Dsus4: 'x-5-7-7-3-3',
    })
  })
})

describe('Father Figure in bars (songbook no. 15)', () => {
  const FF = 'Father Figure'
  const VAMP = '|  Bbsus2  |  %  |  Absus2  |  Absus2  Bbsus2  |'
  const CHORUS = '|  Bbadd9  |  %  |  Abadd9  |  %  |'
  it('writes every line of every section in bars', () => everyLineInBars(FF))

  it("has the book's bars, with the vamp before the first verse from the recording", () => {
    expect(sectionBars(FF)).toEqual({ Intro: 8, Verse: 16, Chorus: 8, Instrumental: 8, Bridge: 8, 'Bridge 2': 8, Outro: 9 })
    const chords = chordsIn(FF)
    expect(chords.Intro).toBe(`${VAMP}  (x2)`)
    expect(chords.Verse).toBe(`${VAMP}  (x2)\n|  Gbsus2  |  Abadd9  |  Bb  |  %  |\n|  Gbsus2  |  Absus2  |  Fsus4  |  F  |`)
    expect(chords.Chorus).toBe(`${CHORUS}  (x2)`)
    expect(chords.Instrumental).toBe(`${VAMP}  (x2)`)
    expect(chords.Bridge).toBe('|  Gbadd9  |  Abadd9  |  Gbadd9  |  Abadd9  |\n|  Gbadd9  |  Abadd9  |  Bbadd9  |  %  |')
    expect(chords['Bridge 2']).toBe('|  Gbadd9  |  Abadd9  |  Gbadd9  |  Abadd9  |\n|  Gbadd9  |  Abadd9  |  Fsus4  |  F  |')
    expect(chords.Outro).toBe(`${CHORUS}  (x2)\n|  Abadd9  |`)
  })

  it('opens with the vamp, plays the instrumental after the first chorus and the bridge twice', () => {
    expect(by(FF).form).toEqual([
      'Intro', 'Verse', 'Verse', 'Chorus', 'Instrumental', 'Verse', 'Chorus', 'Bridge', 'Bridge 2', 'Verse', 'Chorus', 'Outro',
    ])
  })

  it('comes to the length of the recording, from the guitar coming in to the last chord (0:19 to 5:22)', () => {
    expect(Math.abs(formBars(FF) - recordingBars(FF, 18.6, 322.3))).toBeLessThanOrEqual(2)
  })

  it('stays in Bb with a songbook shape for every chord and its sound', () => {
    const song = by(FF)
    expect(song.key).toBe('Bb')
    expect(song.transpose).toBeUndefined()
    expect(withoutShape(FF)).toEqual([])
    expect(song.shapes).toEqual({
      Bbsus2: 'x-1-3-3-1-1', Absus2: '4-x-1-3-4-x', Gbsus2: '2-4-4-1-x-x', Abadd9: '4-x-1-3-1-x', Bb: 'x-1-3-3-3-1',
      Fsus4: '1-3-3-3-1-1', F: '1-3-3-2-1-1', Bbadd9: 'x-1-3-5-3-1', Gbadd9: '2-x-4-3-2-4',
    })
  })
})

describe('Wake Me Up Before You Go-Go in bars (published chords, bars and form from the recording)', () => {
  const WMU = 'Wake Me Up Before You Go-Go'
  it('writes every line of every section in bars', () => everyLineInBars(WMU))

  it('keeps the published chords, placed in the bar as the recording plays them', () => {
    expect(sectionBars(WMU)).toEqual({ Intro: 4, Verse: 4, 'Pre-Chorus': 4, Chorus: 8, Link: 4, Instrumental: 4, Bridge: 4 })
    const chords = chordsIn(WMU)
    expect(chords.Intro).toBe('|  C  |  %  |  %  |  %  |')
    expect(chords['Pre-Chorus']).toBe('|  Em  F  |  Em  Dm  |  Em  F  |  G  |')
    expect(chords.Bridge).toBe('|  Dm  Em  |  F  Em  |  Dm  Em  |  F  G  |')
  })

  it('reads the verse and the chorus from the recording, bar by bar (2026-11-23)', () => {
    // Bass, guitar and keys stems, a beat at a time. Verse: the Dm sits on the
    // third beat of bars 1 and 3 and C is back on the fourth; bar 2 stays on C
    // and bar 4 is Dm (the chart had C Dm in all four). Chorus: every second
    // bar is Dm for two beats and C again for the other two, the last one too
    // (the chart had a whole bar of Dm, and C for the last bar).
    const chords = chordsIn(WMU)
    expect(chords.Verse).toBe('|  C  .  Dm  C  |  C  |  C  .  Dm  C  |  Dm  |')
    expect(chords.Chorus).toBe('|  C  |  Dm  C  |  C  |  Dm  C  |  (x2)')
    expect(by(WMU).evidence?.Verse?.from).toBe('Record')
    expect(by(WMU).evidence?.Chorus?.from).toBe('Record')
  })

  it('writes the organ link after the first two choruses, not the opening vamp again', () => {
    // 1:02 to 1:14 and 2:01 to 2:13 on the recording: the keys play F and C7,
    // two bars each time round, and the last bar comes home to C. The chart
    // repeated the 4 bars of C from the start there.
    const chords = chordsIn(WMU)
    expect(chords.Link).toBe('|  F  C7  |  C7  |  F  C7  |  C7  C  |')
    expect(by(WMU).evidence?.Link?.from).toBe('Record')
  })

  it('has the verse chords without the voice before the bridge, ending on C', () => {
    // 2:13 to 2:22: the band plays the verse once with no singing. Its last
    // bar is C, and only half as long (a sentence in the notes): the bridge
    // comes in two beats early.
    const chords = chordsIn(WMU)
    expect(chords.Instrumental).toBe('|  C  .  Dm  C  |  C  |  C  .  Dm  C  |  C  |')
    expect(by(WMU).evidence?.Instrumental?.from).toBe('Record')
    expect(by(WMU).notes).toMatch(/half as long/)
  })

  it('plays the link after the first two choruses, the instrumental and the bridge, and the chorus three times to the end', () => {
    expect(by(WMU).form).toEqual([
      'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Link', 'Verse', 'Pre-Chorus', 'Chorus',
      'Link', 'Instrumental', 'Bridge', 'Chorus', 'Chorus', 'Chorus',
    ])
  })

  it('comes to the length of the recording, to where the fade has gone (3:46)', () => {
    expect(Math.abs(formBars(WMU) - recordingBars(WMU, 2.32, 226.1))).toBeLessThanOrEqual(2)
  })

  it("stays a semitone down in the band's key B, with its sound", () => {
    const song = by(WMU)
    expect(song.key).toBe('C')
    expect(song.transpose).toBe(-1)
    expect(song.lowerKey).toBe(true)
    expect(song.capo).toBeNull()
    expect(song.shapes).toBeUndefined()
  })
})

describe('Somebody to Love in bars (songbook no. 52)', () => {
  const STL = 'Somebody to Love'
  const VERSE = '|  G  D/F#  Em  .  |  G  A  D  .  |\n|  G  D/F#  Em  .  |  A7  D7  |  G  A7  D  .  |'
  const CHORUS = '|  D  A/C#  D  C  |  G  |  G  D/F#  Em  C  |'
  // Six bars in the song order are 6/8, half a 12/8 bar each: two in each
  // Turnaround, one in the Chorus end and one in the Bridge.
  const HALF_BARS = 3
  it('writes every line of every section in bars', () => everyLineInBars(STL))

  it("has the book's bars, with the long ending from the recording", () => {
    expect(sectionBars(STL)).toEqual({
      Intro: 2, Verse: 5, Chorus: 3, Turnaround: 4, 'Chorus end': 3, Bridge: 8, Solo: 8,
      Coda: 3, Break: 5, Riff: 10, Build: 7, Outro: 17,
    })
    const chords = chordsIn(STL)
    expect(chords.Intro).toBe('|  G  D/F#  Em  .  |  C  D  |')
    expect(chords.Verse).toBe(VERSE)
    expect(chords.Chorus).toBe(CHORUS)
    expect(chords.Turnaround).toBe('|  C/D  |  G  G/F#  |  Em  |  C  D  |')
    expect(chords['Chorus end']).toBe('|  C/D  |  G  |  %  |')
    expect(chords.Bridge).toBe('|  C  |  %  |  F  |  Fm  |\n|  A7  |  %  |  D  |  G/D  |')
    expect(chords.Solo).toBe(`${VERSE}\n${CHORUS}`)
    expect(chords.Coda).toBe('|  D  A/C#  D  C  |  C  |  %  |')
    expect(chords.Break).toBe('|  N.C.  |  %  |  %  |  %  |  %  |')
    expect(chords.Riff).toBe('|  G5  |  %  |  (x5)')
    expect(chords.Build).toBe('|  G  D/F#  Em  C  |  D  |  %  |  G5  |\n|  N.C.  |  %  |  %  |')
  })

  it('places the ending riff as the recording plays it: two chords in the first bar, three in the second', () => {
    // 4:05 to 4:52, eight times round: G and D/F# share the first bar, Em
    // takes half of the second and C and D the rest. The intro has the same
    // chords in the book's rhythm (G D/F# Em in one bar).
    expect(chordsIn(STL).Outro).toBe('|  G  D/F#  |  Em  .  C  D  |  (x8)\n|  G  |')
  })

  it('plays the solo over a verse and a chorus, then the coda, the riff and the long ending', () => {
    expect(by(STL).form).toEqual([
      'Intro', 'Verse', 'Chorus', 'Turnaround', 'Verse', 'Chorus', 'Chorus end', 'Bridge',
      'Solo', 'Turnaround', 'Verse', 'Coda', 'Break', 'Riff', 'Build', 'Outro',
    ])
  })

  it('comes to the length of the recording, the 6/8 bars at half length (0:09 to the last G at 5:02)', () => {
    expect(Math.abs(formBars(STL) - HALF_BARS - recordingBars(STL, 8.6, 301.8))).toBeLessThanOrEqual(2)
  })

  it('says in the notes which bars are 6/8', () => {
    expect(by(STL).notes).toMatch(/6\/8/)
    expect(by(STL).notes).toMatch(/Turnaround/)
  })

  it('stays in G in 12/8 with a songbook shape for every chord and its sound', () => {
    const song = by(STL)
    expect(song.key).toBe('G')
    expect(song.timeSignature).toBe('12/8')
    expect(song.bpm).toBe(73)
    expect(song.transpose).toBeUndefined()
    expect(withoutShape(STL)).toEqual([])
    expect(song.cue).toBe('12/8 gospel shuffle — NOT straight 4/4. With Queen, Wembley 1992.')
  })
})
