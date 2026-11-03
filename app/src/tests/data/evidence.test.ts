import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/library'
import { barsOfSection, barChords } from '../../music/evidence'

describe('where each shipped song came from', () => {
  it.each(DEFAULT_SONGS.map(s => [s.title, s] as const))('%s says where its chords came from', (_, song) => {
    expect(['Ear', 'Book', 'Record', 'Chart']).toContain(song.chordsFrom)
    for (const [name, ev] of Object.entries(song.evidence ?? {})) {
      // Every section of that name reads the evidence's chords, not only the first
      const sections = song.sections.filter(s => s.name === name)
      expect(sections.length, `section ${name}`).toBeGreaterThan(0)
      for (const b of ev.bars ?? []) {
        for (const section of sections) {
          expect(barChords(barsOfSection(section.chords)[b.bar] ?? []), `${name} bar ${b.bar}`).toBe(b.chords)
        }
        if (b.from === 'Unsure') {
          expect(b.readings!.length).toBeGreaterThanOrEqual(2)
          expect(new Set(b.readings!.map(r => r.chords)).size).toBe(b.readings!.length)
        } else expect(b.readings).toBeUndefined()
      }
    }
  })
})
