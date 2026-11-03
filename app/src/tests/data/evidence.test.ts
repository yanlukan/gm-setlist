import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { barsOfSection, barChords } from '../../music/evidence'

describe('where each shipped song came from', () => {
  it.each(DEFAULT_SONGS.map(s => [s.title, s] as const))('%s says where its chords came from', (_, song) => {
    expect(['Ear', 'Book', 'Record', 'Chart']).toContain(song.chordsFrom)
    for (const [name, ev] of Object.entries(song.evidence ?? {})) {
      const section = song.sections.find(s => s.name === name)
      expect(section, `section ${name}`).toBeDefined()
      const bars = barsOfSection(section!.chords)
      for (const b of ev.bars ?? []) {
        expect(barChords(bars[b.bar] ?? []), `${name} bar ${b.bar}`).toBe(b.chords)
        if (b.from === 'Unsure') {
          expect(b.readings!.length).toBeGreaterThanOrEqual(2)
          expect(new Set(b.readings!.map(r => r.chords)).size).toBe(b.readings!.length)
        } else expect(b.readings).toBeUndefined()
      }
    }
  })
})
