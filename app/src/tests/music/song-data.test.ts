import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'
import { transposeInKey } from '../../music/theory'

describe('song notes and cues', () => {
  it('never name chords on a song whose chart is shown in another key', () => {
    // The chart moves to the band key, but notes are plain text and stay put,
    // so a note naming chords would contradict the chart right above it.
    const chordName = /(?:^|[\s(–—,/-])([A-G][#b]?(?:m7|maj7|m|7|sus[24]|dim|aug|6|9|add9)?)(?=$|[\s),.–—/-])/g
    for (const song of DEFAULT_SONGS.filter(s => s.transpose)) {
      const text = `${song.notes ?? ''} ${song.cue ?? ''}`
      const named = Array.from(text.matchAll(chordName), m => m[1]).filter(t => t !== 'A') // "A" is usually the word
      expect(named, song.title).toEqual([])
    }
  })

  it('give every song in the gig set its GX-10 sound, one of the six', () => {
    // Two banks of three, in BANK/NUM mode
    const slots: Record<string, string> = {
      FUNK: 'U01-1', '80s CLEAN': 'U01-2', 'WARM JAZZ': 'U01-3',
      CRUNCH: 'U02-1', LEAD: 'U02-2', ACOUSTIC: 'U02-3',
    }
    for (const title of GIG_SETLIST_2026) {
      const preset = DEFAULT_SONGS.find(s => s.title === title)?.preset
      expect(preset, title).toBeDefined()
      expect(slots[preset!.name], title).toBe(preset!.slot)
    }
  })

  it('keep the sound out of the cue, which is for stage directions', () => {
    // The user asked for the GX-10 memory's name on the title line and nothing
    // about it in the strip: no memory names, slots, pedal switches or tone.
    const gx10 = /GX-10|U0\d-\d|toe switch|\b(FUNK|CRUNCH|LEAD|80s CLEAN|WARM JAZZ)\b|clean tone/
    for (const song of DEFAULT_SONGS) expect(song.cue ?? '', song.title).not.toMatch(gx10)
  })
})

describe('Amazing, as the band plays it in Am (2026-10-09)', () => {
  const song = DEFAULT_SONGS.find(s => s.title === 'Amazing')!
  const inAm = (chords: string) => transposeInKey(chords, song.key, song.transpose ?? 0)

  it('is charted at the recording pitch and played a semitone lower', () => {
    expect(song.key).toBe('Bbm')
    expect(song.transpose).toBe(-1)
  })

  it('reads Am7 Fmaj7 in the verse, Bm7 Am7 G Dm7 F G in the pre-chorus, Am7 Fmaj7 Em7 Dm7 Em7 in the chorus', () => {
    const by = Object.fromEntries(song.sections.map(s => [s.name, inAm(s.chords)]))
    expect(by['Verse']).toBe('Am7  Fmaj7  Am7  Fmaj7  (x2)')
    expect(by['Pre-Chorus']).toBe('Bm7  Am7  G  Dm7  F  G')
    expect(by['Chorus']).toBe('Am7  Fmaj7  Em7  Dm7  Em7  (x2)')
  })
})

describe('song order from the notes (2026-10-09)', () => {
  const by = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

  it('gives every song whose notes spell out its form a song order', () => {
    const missing = DEFAULT_SONGS.filter(s => /Form:/.test(s.notes ?? '') && !s.form?.length).map(s => s.title)
    expect(missing).toEqual([])
  })

  it('leaves the songs with no written order without one', () => {
    for (const title of ['Papa Was a Rolling Stone', 'Outside', 'Last Christmas']) expect(by(title).form, title).toBeUndefined()
  })

  it('Club Tropicana comes back to the chorus after the bass solo and after the last verse walk-up', () => {
    expect(by('Club Tropicana').form).toEqual([
      'Intro', 'Intro 2', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Instrumental', 'Chorus',
      'Bass solo', 'Last verse', 'Walk-up', 'Chorus', 'Outro',
    ])
  })

  it('Somebody to Love plays its solo over the verse and goes straight to the outro', () => {
    expect(by('Somebody to Love').form).toEqual(['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Verse', 'Outro'])
  })

  it("Freedom! '90 goes back to the second pre-chorus after the bridge", () => {
    expect(by("Freedom! '90").form).toEqual([
      'Intro', 'Verse', 'Pre-Chorus', 'Pre-Chorus 2', 'Chorus', 'Verse', 'Pre-Chorus', 'Pre-Chorus 2', 'Chorus',
      'Interlude', 'Bridge', 'Pre-Chorus 2', 'Chorus', 'Outro',
    ])
  })

  it('Father Figure plays the bridge twice, the second ending differently, then the top again', () => {
    expect(by('Father Figure').form).toEqual([
      'Verse', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Bridge 2', 'Verse', 'Chorus', 'Outro',
    ])
  })
})
