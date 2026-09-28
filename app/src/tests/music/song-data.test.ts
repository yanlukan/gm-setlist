import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'

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
})
