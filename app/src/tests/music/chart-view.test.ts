import { describe, it, expect } from 'vitest'
import {
  guitarFor, capoFor, easiestCapo, shapeKey, shapeSections, shapeShift, shownSections, simplifyChord, simplifyText,
} from '../../music/chart-view'
import type { Song } from '../../types'

const song = (over: Partial<Song> = {}): Song => ({
  title: 'Test', artist: '', key: 'D', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  sections: [{ name: 'Verse', chords: 'D  Bm7  Gmaj7  A7sus4' }],
  ...over,
})

describe('simplifyChord', () => {
  it('keeps the plain major or minor chord', () => {
    expect(simplifyChord('Cmaj7')).toBe('C')
    expect(simplifyChord('Am7')).toBe('Am')
    expect(simplifyChord('Am9')).toBe('Am')
    expect(simplifyChord('Ammaj7')).toBe('Am')
    expect(simplifyChord('G7')).toBe('G')
    expect(simplifyChord('Dadd9')).toBe('D')
    expect(simplifyChord('F6')).toBe('F')
    expect(simplifyChord('A13')).toBe('A')
    expect(simplifyChord('A7(b9)')).toBe('A')
  })

  it('drops a slash bass', () => {
    expect(simplifyChord('G/B')).toBe('G')
    expect(simplifyChord('Am7/G')).toBe('Am')
    expect(simplifyChord('D/F#')).toBe('D')
  })

  it('keeps what makes a chord its own: diminished, augmented, suspended', () => {
    expect(simplifyChord('Bm7b5')).toBe('Bdim')
    expect(simplifyChord('Edim7')).toBe('Edim')
    expect(simplifyChord('C+')).toBe('Caug')
    expect(simplifyChord('D7sus4')).toBe('Dsus4')
    expect(simplifyChord('Bbsus2')).toBe('Bbsus2')
    expect(simplifyChord('G5')).toBe('G5')
  })

  it('on electric, keeps the 7ths and 9ths and cuts back only what is past a 9th', () => {
    const electric = (c: string) => simplifyChord(c, 'electric')
    expect(electric('Cmaj7')).toBe('Cmaj7')
    expect(electric('Am7')).toBe('Am7')
    expect(electric('G9')).toBe('G9')
    expect(electric('Dm9')).toBe('Dm9')
    expect(electric('A13')).toBe('A9')
    expect(electric('Am11')).toBe('Am9')
    expect(electric('Cmaj13')).toBe('Cmaj9')
    expect(electric('E7#9')).toBe('E7')
    expect(electric('A7(b9)')).toBe('A7')
    expect(electric('Am7/G')).toBe('Am7')
    expect(electric('D7sus4')).toBe('D7sus4')
    expect(electric('Bm7b5')).toBe('Bm7b5')
    expect(electric('C6')).toBe('C6')
    expect(electric('Eadd9')).toBe('Eadd9')
    expect(electric('G/B')).toBe('G')
    expect(electric('Dsus4')).toBe('Dsus4')
  })

  it('leaves "no chord" and repeat marks alone', () => {
    expect(simplifyChord('N.C.')).toBe('N.C.')
    expect(simplifyChord('(x3)')).toBe('(x3)')
  })

  it('keeps the spacing of a chord line', () => {
    expect(simplifyText('Cmaj7  Am7\nFmaj7   G7')).toBe('C  Am\nF   G')
  })
})

describe('capo', () => {
  it("is the player's own, else the song's, else none", () => {
    expect(capoFor(song())).toBe(0)
    expect(capoFor(song({ capo: 3 }))).toBe(3)
    expect(capoFor(song({ capo: 3 }), { capo: 1 })).toBe(1)
  })

  it('shows the shapes to play: in D with a capo on 2, the chords are C shapes', () => {
    const shapes = shapeSections(song(), { capo: 2 })
    expect(shapes[0].chords).toBe('C  Am7  Fmaj7  G7sus4')
    expect(shapeKey('D', -2)).toBe('C')
  })

  it("adds to the band's key: down a tone, then capo 2, is two tones down", () => {
    expect(shapeShift(song({ transpose: -2 }), { capo: 2 })).toBe(-4)
    expect(shapeSections(song({ transpose: -2 }), { capo: 2 })[0].chords).toBe('Bb  Gm7  Ebmaj7  F7sus4')
  })

  it('shows plain chords only when asked', () => {
    expect(shownSections(song(), { capo: 2 }, { simple: true, guitar: 'acoustic' })[0].chords).toBe('C  Am  F  Gsus4')
    expect(shownSections(song(), undefined, { simple: false, guitar: 'acoustic' })[0].chords).toBe('D  Bm7  Gmaj7  A7sus4')
  })

  it('suggests the capo that leaves the most open chords', () => {
    // Eb Cm Ab Bb: capo 1 makes them D Bm G A (three open), capo 3 C Am F G (three open)
    expect(easiestCapo(['Eb', 'Cm', 'Ab', 'Bb'])).toEqual({ capo: 1, open: 3 })
    // Already open: no capo
    expect(easiestCapo(['G', 'C', 'D', 'Em'])).toEqual({ capo: 0, open: 4 })
  })
})

describe('guitarFor', () => {
  const auto = { simple: false, guitar: 'auto' as const }
  it("follows the song's sound: the acoustic preset is acoustic, any other preset electric, none acoustic", () => {
    expect(guitarFor(song({ preset: { name: 'ACOUSTIC', slot: 'U02-3' } }), undefined, auto)).toBe('acoustic')
    expect(guitarFor(song({ preset: { name: 'FUNK', slot: 'U01-1' } }), undefined, auto)).toBe('electric')
    expect(guitarFor(song(), undefined, auto)).toBe('acoustic')
  })

  it('takes the choice for every song over the sound, and the choice for the song over both', () => {
    const funk = song({ preset: { name: 'FUNK', slot: 'U01-1' } })
    expect(guitarFor(funk, undefined, { simple: false, guitar: 'acoustic' })).toBe('acoustic')
    expect(guitarFor(funk, { guitar: 'electric' }, { simple: false, guitar: 'acoustic' })).toBe('electric')
  })
})
