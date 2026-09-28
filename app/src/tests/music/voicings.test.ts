import { describe, it, expect } from 'vitest'
import { chordNotes, voicingsFor, bandPositions } from '../../music/voicings'
import { lookupChord, type ChordVoicing } from '../../data/chords-db'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'
import { transposeInKey, isChartMark } from '../../music/theory'

const OPEN = [4, 9, 2, 7, 11, 4] // E A D G B E

/** Sounding strings, low to high, as { string, fret, pitch }. */
function sounding(v: ChordVoicing) {
  return v.f.flatMap((f, string) => {
    if (f === null) return []
    const fret = f === 0 ? 0 : v.s === 0 ? f : v.s + f - 1
    return [{ string, fret, pitch: (OPEN[string] + fret) % 12 }]
  })
}

/** Each gig song's chords as the band plays them, with how often each appears. */
function gigChords() {
  return GIG_SETLIST_2026.map(title => {
    const song = DEFAULT_SONGS.find(s => s.title === title)!
    const counts = new Map<string, number>()
    for (const sec of song.sections)
      for (const t of transposeInKey(sec.chords, song.key, song.transpose ?? 0).split(/\s+/))
        if (t && !isChartMark(t)) counts.set(t, (counts.get(t) ?? 0) + 1)
    return { song, chords: [...counts].map(([name, weight]) => ({ name, weight })) }
  })
}
const allGigChords = [...new Set(gigChords().flatMap(g => g.chords.map(c => c.name)))]

describe('band shapes', () => {
  it('exist for every chord in the set, as the band plays it', () => {
    const without = allGigChords.filter(name => voicingsFor(name).length === (lookupChord(name) ?? []).length)
    expect(without).toEqual([])
  })

  it('play only the chord, with every note it cannot do without, and a slash bass at the bottom', () => {
    const wrong: string[] = []
    for (const name of allGigChords) {
      const notes = chordNotes(name)!
      const library = (lookupChord(name) ?? []).length
      for (const v of voicingsFor(name).slice(library)) {
        const s = sounding(v)
        const pitches = new Set(s.map(n => n.pitch))
        const frets = s.map(n => n.fret)
        const problems = [
          [...pitches].some(p => !notes.tones.includes(p) && p !== notes.bass) && 'a note outside the chord',
          notes.essential.some(p => !pitches.has(p)) && 'a missing chord note',
          notes.bass !== null && s[0].pitch !== notes.bass && 'the wrong bass',
          frets.some(f => f === 0) && 'an open string',
          Math.max(...frets) - Math.min(...frets) > 3 && 'too wide a stretch',
          (s.length < 3 || s.length > 4) && 'not three or four strings',
        ].filter(Boolean)
        if (problems.length) wrong.push(`${name} ${JSON.stringify(v.f)}@${v.s}: ${problems.join(', ')}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('come after the chord library, so a position you picked before keeps its meaning', () => {
    for (const name of allGigChords) {
      const library = lookupChord(name) ?? []
      expect(voicingsFor(name).slice(0, library.length), name).toEqual(library)
    }
  })

  it('give a slash chord its bass: C/D has D at the bottom', () => {
    const library = (lookupChord('C/D') ?? []).length
    for (const v of voicingsFor('C/D').slice(library)) expect(sounding(v)[0].pitch).toBe(2)
  })
})

describe('band positions', () => {
  it('put every song on compact shapes, except the acoustic one on open chords', () => {
    for (const { song, chords } of gigChords()) {
      const picks = bandPositions(chords, song.preset?.name)
      for (const { name } of chords) {
        const v = voicingsFor(name)[picks[name]]
        const s = sounding(v)
        if (song.preset?.name === 'ACOUSTIC') expect(picks[name], `${song.title} ${name}`).toBe(0)
        else expect(s.length <= 4 && s.every(n => n.fret > 0), `${song.title} ${name}`).toBe(true)
      }
    }
  })

  it("keep each song's shapes in one area of the neck", () => {
    for (const { song, chords } of gigChords()) {
      if (song.preset?.name === 'ACOUSTIC') continue
      const picks = bandPositions(chords, song.preset?.name)
      const frets = chords.flatMap(({ name }) => sounding(voicingsFor(name)[picks[name]]).map(n => n.fret))
      expect(Math.max(...frets) - Math.min(...frets), song.title).toBeLessThanOrEqual(7)
    }
  })

  it("move Freedom's line cliche a finger or two at a time, on the same strings", () => {
    const { song, chords } = gigChords().find(g => g.song.title === "Freedom! '90")!
    const picks = bandPositions(chords, song.preset?.name)
    const line = ['Cm', 'Cm(maj7)', 'Cm7', 'Cm6'].map(name => sounding(voicingsFor(name)[picks[name]]))
    for (let i = 1; i < line.length; i++) {
      expect(line[i].map(n => n.string)).toEqual(line[i - 1].map(n => n.string))
      const travel = line[i].reduce((sum, n, k) => sum + Math.abs(n.fret - line[i - 1][k].fret), 0)
      expect(travel).toBeLessThanOrEqual(4)
    }
  })
})

describe('the list of shapes', () => {
  const shapes = (name: string) =>
    voicingsFor(name)
      .slice((lookupChord(name) ?? []).length)
      .map(v => v.f.map((x, i) => (x === null ? 'x' : v.s === 0 ? x : v.s + x - 1) + (i < 5 ? '-' : '')).join(''))

  it('stays exactly as it is: a saved pick is a position in this list', () => {
    // If this fails, the generator changed: picks people already saved would
    // now point at different shapes. Keep the old order, or move their picks.
    expect(shapes('C/D')).toEqual(['x-5-x-5-5-3', 'x-5-5-5-5-x', '10-x-10-9-8-x', '10-10-10-9-x-x', 'x-x-12-12-13-12'])
    expect(shapes('Am7').slice(0, 3)).toEqual(['x-x-x-2-1-3', 'x-3-x-2-5-3', 'x-3-5-2-x-x'])
    expect(shapes('Am7')).toHaveLength(23)
  })
})
