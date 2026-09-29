import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'

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
