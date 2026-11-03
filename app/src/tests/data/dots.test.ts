import { describe, it, expect } from 'vitest'
import { SONGS } from '../../data/songs'
import findings from '../../data/recording-check.json'
import before from './bar-chords.fixture.json'
import { barsOf, hasBars, BEAT } from '../../music/bars'

// bar-chords.fixture.json: every bar of every song as written before the recording check (4.11.0).
const tokensOf = (line: string) => line.split(/\s+/).filter(Boolean)
const barsNow = (chords: string) => chords.split('\n').flatMap(l => (hasBars(l) ? barsOf(tokensOf(l)) : []))
const undotted = (bar: string[]) => bar.filter(t => t !== BEAT).join(' ')

type Finding = { section: string; bar: number; kind: string }
const rhythm = (title: string): Finding[] =>
  ((findings as Record<string, { bars?: Finding[] }>)[title]?.bars ?? []).filter(f => f.kind === 'rhythm')

describe('dots in the shipped charts', () => {
  it('has a fixture for every song', () => {
    expect(Object.keys(before).sort()).toEqual(SONGS.map(s => s.title).sort())
  })

  it.each(SONGS.map(s => [s.title, s] as const))('%s: every bar keeps its chords; only rhythm findings gained dots', (_, song) => {
    const old = (before as Record<string, string[][]>)[song.title]
    expect(song.sections.length).toBe(old.length)
    const named = rhythm(song.title)
    song.sections.forEach((section, si) => {
      const bars = barsNow(section.chords)
      expect(bars.length, `${section.name} bar count`).toBe(old[si].length)
      bars.forEach((bar, bi) => {
        const was = tokensOf(old[si][bi])
        expect(undotted(bar), `${section.name} bar ${bi}`).toBe(undotted(was))
        if (bar.join(' ') !== was.join(' ')) {
          expect(named.some(f => f.section === section.name && f.bar === bi), `${section.name} bar ${bi} gained dots`).toBe(true)
        }
      })
    })
  })
})
