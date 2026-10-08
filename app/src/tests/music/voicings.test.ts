import { describe, it, expect } from 'vitest'
import { chordNotes, voicingsFor, bandPositions, hasShapes, shapeToShow, shapeText, fretSpan, researchedStart, SHAPES_RELEASED } from '../../music/voicings'
import { bandPlanFor } from '../../hooks/use-band-positions'
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
      // Only the app's own generated shapes: book and lesson shapes are checked below
      const researched = new Set(DEFAULT_SONGS.flatMap(song => (song.shapes?.[name] ? [song.shapes[name]] : [])))
      for (const v of voicingsFor(name).slice(library).filter(v => !researched.has(shapeText(v)))) {
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
      // A shape marked wrong keeps its place too
      const kept = voicingsFor(name).slice(0, library.length).map(({ wrong: _wrong, ...v }) => v)
      expect(kept, name).toEqual(library)
    }
  })

  it('give a slash chord its bass: C/D has D at the bottom', () => {
    const library = (lookupChord('C/D') ?? []).length
    for (const v of voicingsFor('C/D').slice(library)) expect(sounding(v)[0].pitch).toBe(2)
  })
})

describe('band positions', () => {

  it("recommend Faith's chords as the songbook prints them: the riff's B barre at the 7th fret, E over the open low E", () => {
    const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
    const { picks } = bandPlanFor(faith, undefined)
    const shown = Object.fromEntries(Object.entries(picks).map(([name, i]) => [name, shapeText(voicingsFor(name)[i])]))
    expect(shown).toEqual({ B: '7-9-9-8-7-7', E: '0-7-9-9-9-x', 'G#m': '4-6-6-4-4-4', 'C#m': 'x-4-6-6-5-4', 'F#': '2-4-4-3-2-2' })
  })

  it('recommend every researched shape, each for a chord the song plays in the band\'s key', () => {
    const wrong: string[] = []
    for (const song of DEFAULT_SONGS.filter(s => s.shapes)) {
      const { picks, researched } = bandPlanFor(song, undefined, { simple: false, shapes: 'band' })
      for (const [name, shape] of Object.entries(song.shapes!)) {
        if (picks[name] === undefined) wrong.push(`${song.title} ${name}: not a chord of the song as the band plays it`)
        else if (shapeText(voicingsFor(name)[picks[name]]) !== shape || researched[name] !== picks[name]) wrong.push(`${song.title} ${name}: not recommended`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('in full chords, recommend whole chords: no two- or three-string fragment where a fuller shape exists', () => {
    const thin: string[] = []
    for (const song of DEFAULT_SONGS) {
      const { picks } = bandPlanFor(song, undefined, { simple: false, shapes: 'full' })
      for (const [name, i] of Object.entries(picks)) {
        const strings = voicingsFor(name)[i].f.filter(f => f !== null).length
        const fuller = voicingsFor(name).some(v => !v.wrong && v.f.filter(f => f !== null).length >= 4)
        if (strings < 4 && fuller) thin.push(`${song.title} ${name}: ${shapeText(voicingsFor(name)[i])}`)
      }
    }
    expect(thin).toEqual([])
  })

  it('in full chords, keep a full researched shape from the songbook', () => {
    const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
    const { picks } = bandPlanFor(faith, undefined, { simple: false, shapes: 'full' })
    expect(shapeText(voicingsFor('B')[picks.B])).toBe('7-9-9-8-7-7')
  })

  it('choose shapes afresh when a song is moved to another key', () => {
    // Down two, Faith's F# is an E: the book's E for the verse is not its shape
    const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
    const { picks, researched } = bandPlanFor(faith, { transpose: -2 })
    expect(researched).toEqual({})
    expect(Object.keys(picks)).toEqual(['A', 'D', 'F#m', 'Bm', 'E'])
  })

  it('call a song with barres up the neck by its frets, even with an open bass string', () => {
    const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
    expect(bandPlanFor(faith, undefined).span).toEqual({ min: 2, max: 9, open: false })
    expect(fretSpan([voicingsFor('E')[0], voicingsFor('B')[2]])).toEqual({ min: 1, max: 9, open: true })
  })

  it('have every researched shape in its chord\'s list, playing only that chord', () => {
    const wrong: string[] = []
    for (const song of DEFAULT_SONGS) {
      for (const [name, shape] of Object.entries(song.shapes ?? {})) {
        const v = voicingsFor(name).find(x => shapeText(x) === shape)
        if (!v) { wrong.push(`${song.title} ${name} ${shape}: not in the list`); continue }
        // A book or lesson shape may leave a note out (the songbook's Em11 has
        // no G), but a misread dot shows up as a wrong note or a wrong bass.
        // Only a shape that leaves out both bass strings may leave the root to
        // the bass player (the book's jazz voicings: Roxanne's E and Bm7,
        // Kissing a Fool's C6(b5)).
        const notes = chordNotes(name)!
        const s = sounding(v)
        const pitches = new Set(s.map(n => n.pitch))
        if ([...pitches].some(p => !notes.tones.includes(p) && p !== notes.bass)) wrong.push(`${song.title} ${name}: a note outside the chord`)
        if (s[0].pitch !== (notes.bass ?? notes.root) && s[0].string < 2) wrong.push(`${song.title} ${name}: not rooted`)
        if (pitches.size < 2) wrong.push(`${song.title} ${name}: too few notes`)
      }
    }
    expect(wrong).toEqual([])
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

describe('the songbook shapes', () => {
  it("recommend I Can't Make You Love Me exactly as the book prints it, the Em11 included", () => {
    const song = DEFAULT_SONGS.find(s => s.title === "I Can't Make You Love Me")!
    const { picks } = bandPlanFor(song, undefined)
    for (const [name, shape] of Object.entries(song.shapes!)) {
      expect(shapeText(voicingsFor(name)[picks[name]]), name).toBe(shape)
    }
    expect(shapeText(voicingsFor('Em11')[picks.Em11])).toBe('0-2-4-2-3-2')
  })
})

describe('the list of shapes', () => {
  // The shapes built here: after the library's, before any added from research
  const shapes = (name: string) =>
    voicingsFor(name)
      .slice((lookupChord(name) ?? []).length, researchedStart(name))
      .map(v => v.f.map((x, i) => (x === null ? 'x' : v.s === 0 ? x : v.s + x - 1) + (i < 5 ? '-' : '')).join(''))

  it('stays exactly as it is: a saved pick is a position in this list', () => {
    // If this fails, the generator changed: picks people already saved would
    // now point at different shapes. Keep the old order, or move their picks.
    expect(shapes('C/D')).toEqual(['x-5-x-5-5-3', 'x-5-5-5-5-x', '10-x-10-9-8-x', '10-10-10-9-x-x', 'x-x-12-12-13-12'])
    expect(shapes('Am7').slice(0, 3)).toEqual(['x-x-x-2-1-3', 'x-3-x-2-5-3', 'x-3-5-2-x-x'])
    // Shapes researched later are added after these, never in between
    expect(shapes('Am7').length).toBeGreaterThanOrEqual(23)
  })

  it('keeps every researched shape the library lacks where it was first added', () => {
    // A songbook or lesson shape the library lacks goes at the end of its
    // chord's list. Once released, someone may have picked it: add new ones
    // after it, never before. Extend this list when a song adds one.
    const added: Record<string, Record<number, string>> = {
      Cadd9: { 25: 'x-3-2-0-3-3' }, Em11: { 24: '0-2-4-2-3-2', 25: '0-2-0-2-0-2' }, C: { 26: 'x-3-2-0-1-3' },
      Em7: { 26: '0-2-2-0-3-3', 27: 'x-x-2-0-3-0', 28: '0-5-5-4-3-x', 29: '0-2-0-0-0-3' }, Am7: { 27: 'x-0-2-0-1-3' }, 'G/D': { 14: 'x-x-0-4-3-3' },
      G: { 27: '3-x-0-0-3-3' }, 'G/C': { 11: 'x-3-0-0-3-3' }, 'D/F#': { 15: '2-x-0-2-3-2' },
      Fmaj9: { 10: 'x-8-10-9-8-8', 11: '1-x-2-0-1-0' }, E: { 26: '0-7-9-9-9-x' },
      // 3.26.0
      'Am/D': { 9: 'x-x-0-5-5-5' }, 'C#madd9': { 17: 'x-4-6-8-5-4' }, B: { 26: '7-6-4-4-4-7' },
      'G#m7': { 24: '4-6-6-4-7-4' }, 'A#m7b5': { 20: '6-x-6-6-5-4' }, Eadd9: { 21: 'x-x-2-1-0-2' },
      Am11: { 21: 'x-0-5-4-3-3' }, Cm6: { 28: 'x-3-7-5-4-3' }, Dsus4: { 27: 'x-5-7-7-3-3' },
      Abadd9: { 23: '4-x-1-3-1-x' }, Absus2: { 27: '4-x-1-3-4-x' }, Bbadd9: { 21: 'x-1-3-5-3-1' }, Gbadd9: { 25: '2-x-4-3-2-4' },
      'C/D': { 9: 'x-x-0-0-1-0' }, 'G/F#': { 11: '2-x-0-0-0-3' }, B11: { 22: 'x-2-x-2-2-0' }, Bm7: { 25: 'x-x-x-2-3-2' },
      'D/A': { 15: 'x-0-4-2-3-2' }, Em9: { 11: 'x-x-2-0-3-2', 12: '0-2-0-0-3-2' }, 'F#m7': { 25: 'x-x-4-2-2-0' }, 'G/A': { 9: 'x-0-5-4-3-x' },
      'C/B': { 13: 'x-2-2-0-1-0' }, Dmaj9: { 11: 'x-5-4-6-3-0' }, 'Edim7/D': { 12: 'x-x-0-3-2-3' }, Em: { 25: '0-2-2-0-0-3' },
      // 3.27.0
      F6: { 27: 'x-x-3-2-3-1' }, 'G/B': { 16: 'x-2-0-0-0-x' },
      // 3.30.0's Abm7 and Db/Gb (and 3.29.0's D/G) went with their chords, which no song has any more
      // 3.32.0
      'Gb/Db': { 16: 'x-4-4-3-2-2' },
    }
    const found: Record<string, Record<number, string>> = {}
    for (const song of DEFAULT_SONGS) {
      for (const [name, shape] of Object.entries(song.shapes ?? {})) {
        const index = voicingsFor(name).findIndex(v => shapeText(v) === shape)
        if (index >= researchedStart(name)) found[name] = { ...found[name], [index]: shape }
      }
    }
    expect(found).toEqual(added)
  })

  it('registers every song with researched shapes in the order they were released', () => {
    const withShapes = DEFAULT_SONGS.filter(s => s.shapes).map(s => s.title)
    expect([...SHAPES_RELEASED].sort()).toEqual([...withShapes].sort())
  })
})

describe('shapes with wrong notes', () => {
  const pitches = (v: ChordVoicing) => sounding(v).map(n => n.pitch)

  it("are never shown: the library's C#aug is an F#sus4, its Dmaj9 has D# for E", () => {
    // C#aug is C# F A
    for (const v of voicingsFor('C#aug').filter(v => !v.wrong)) {
      expect(pitches(v).every(p => [1, 5, 9].includes(p)), shapeText(v)).toBe(true)
    }
    expect(voicingsFor('C#aug').some(v => v.wrong)).toBe(true)
    // Dmaj9 is D F# A C# E
    for (const v of voicingsFor('Dmaj9').filter(v => !v.wrong)) {
      expect(pitches(v).every(p => [2, 6, 9, 1, 4].includes(p)), shapeText(v)).toBe(true)
    }
  })

  it('keep their place, so a saved pick still means the same shape', () => {
    const list = voicingsFor('Dmaj9')
    expect(list.findIndex(v => v.wrong)).toBe(1)
    expect(shapeToShow('Dmaj9', 1, 0)).toBe(0)
    expect(shapeToShow('Dmaj9', 2, 0)).toBe(2)
  })

  it('leave the 3rd of an 11th chord alone', () => {
    expect(voicingsFor('C11').filter(v => !v.wrong).length).toBeGreaterThan(0)
    expect(hasShapes('C11')).toBe(true)
  })
})
