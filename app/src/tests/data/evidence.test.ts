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
          // One reading (one weak source), or two or more that all differ
          expect(b.readings!.length, `${name} bar ${b.bar}`).toBeGreaterThanOrEqual(1)
          expect(new Set(b.readings!.map(r => r.chords)).size, `${name} bar ${b.bar}`).toBe(b.readings!.length)
        } else expect(b.readings).toBeUndefined()
      }
    }
  })
})

describe('the ear wins over the recording check', () => {
  it('no section by ear or from the record carries an Unsure mark', () => {
    for (const song of DEFAULT_SONGS) {
      for (const [name, ev] of Object.entries(song.evidence ?? {})) {
        if (ev.from !== 'Ear' && ev.from !== 'Record') continue
        expect((ev.bars ?? []).filter(b => b.from === 'Unsure'), `${song.title} ${name}`).toEqual([])
      }
    }
  })

  it("Everything She Wants' chorus is the book's chords, settled by ear on 2026-09-29", () => {
    const esw = DEFAULT_SONGS.find(s => s.title === 'Everything She Wants')!
    expect(esw.evidence?.Chorus?.from).toBe('Ear')
    expect(esw.evidence?.Chorus?.bars ?? []).toEqual([])
  })
})
