import { describe, it, expect } from 'vitest'
import {
  capoFor, easiestCapo, shapeKey, shapeSections, shapeShift, shownSections, simplifyChord, simplifyText,
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
    expect(shownSections(song(), { capo: 2 }, { simple: true, shapes: 'full' })[0].chords).toBe('C  Am  F  Gsus4')
    expect(shownSections(song(), undefined, { simple: false, shapes: 'full' })[0].chords).toBe('D  Bm7  Gmaj7  A7sus4')
  })

  it('suggests the capo that leaves the most open chords', () => {
    // Eb Cm Ab Bb: capo 1 makes them D Bm G A (three open), capo 3 C Am F G (three open)
    expect(easiestCapo(['Eb', 'Cm', 'Ab', 'Bb'])).toEqual({ capo: 1, open: 3 })
    // Already open: no capo
    expect(easiestCapo(['G', 'C', 'D', 'Em'])).toEqual({ capo: 0, open: 4 })
  })
})
