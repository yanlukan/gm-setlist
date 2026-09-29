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
  const shapeOf = (v: ChordVoicing) =>
    v.f.map((x, i) => (x === null ? 'x' : x === 0 ? 0 : v.s === 0 ? x : v.s + x - 1) + (i < 5 ? '-' : '')).join('')

  it('give Faith the chords as a guitarist plays them, not fragments that sit close together', () => {
    const { song, chords } = gigChords().find(g => g.song.title === 'Faith')!
    const picks = bandPositions(chords, song.preset?.name)
    const shapes = Object.fromEntries(chords.map(({ name }) => [name, shapeOf(voicingsFor(name)[picks[name]])]))
    expect(shapes).toEqual({
      B: 'x-2-4-4-4-2', E: '0-2-2-1-0-0', 'G#m': '4-6-6-4-4-4', 'C#m': 'x-4-6-6-5-4', 'F#': '2-4-4-3-2-2',
    })
  })

  it('recommend every chord with its root, or slash bass, at the bottom and nothing but a fifth left out', () => {
    const wrong: string[] = []
    for (const { song, chords } of gigChords()) {
      const picks = bandPositions(chords, song.preset?.name)
      for (const { name } of chords) {
        const notes = chordNotes(name)!
        const s = sounding(voicingsFor(name)[picks[name]])
        const pitches = new Set(s.map(n => n.pitch))
        if (s[0].pitch !== (notes.bass ?? notes.root)) wrong.push(`${song.title} ${name}: not rooted`)
        if (notes.essential.some(p => !pitches.has(p))) wrong.push(`${song.title} ${name}: a chord note missing`)
        if ([...pitches].some(p => !notes.tones.includes(p) && p !== notes.bass)) wrong.push(`${song.title} ${name}: a note not in the chord`)
      }
    }
    expect(wrong).toEqual([])
  })

  it("keep Freedom's line cliche on one Cm barre, the root held on the 3rd fret", () => {
    const { song, chords } = gigChords().find(g => g.song.title === "Freedom! '90")!
    const picks = bandPositions(chords, song.preset?.name)
    for (const name of ['Cm', 'Cm(maj7)', 'Cm7', 'Cm6']) {
      const lowest = sounding(voicingsFor(name)[picks[name]])[0]
      expect({ name, string: lowest.string, fret: lowest.fret }).toEqual({ name, string: 1, fret: 3 })
    }
  })

  it('keep open chords for the acoustic song', () => {
    const { song, chords } = gigChords().find(g => g.song.preset?.name === 'ACOUSTIC')!
    const picks = bandPositions(chords, song.preset?.name)
    for (const { name } of chords) expect(sounding(voicingsFor(name)[picks[name]]).some(n => n.fret === 0), name).toBe(true)
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
