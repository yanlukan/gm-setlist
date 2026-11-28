import { describe, it, expect } from 'vitest'
import { by } from '../songs-in-bars-helpers'

// A bar written without dots draws its chords evenly across the bar. On
// 2026-11-28, after Roxanne, every bar with two or more chords in the other
// songs was laid on the separated instruments an eighth at a time (bass note,
// then keys and guitar). Where the recording plays the chords on other beats,
// the bar gives its beats with dots.
const chords = (title: string, name: string) => by(title).sections.find(s => s.name === name)!.chords

describe('chords on the beats the recording plays them', () => {
  it('Careless Whisper: the Am7 is a passing chord on beat 4', () => {
    for (const name of ['Intro (sax)', 'Verse', 'Chorus', 'Sax riff', 'Outro (sax)']) {
      expect(chords('Careless Whisper', name), name).toContain('|  Gm7  .  .  Am7  |')
    }
  })

  it('Everything She Wants: the C#aug comes on beat 4, after three beats of Bm', () => {
    for (const name of ['Pre-Chorus', 'Chorus', 'Outro']) {
      expect(chords('Everything She Wants', name), name).toContain('|  Bm  .  .  C#aug  |')
    }
  })

  it('Somebody to Love: a beat, a beat, then two beats on the last chord', () => {
    expect(chords('Somebody to Love', 'Intro')).toBe('|  G  D/F#  Em  .  |  C  D  |')
    const verse = '|  G  D/F#  Em  .  |  G  A  D  .  |\n|  G  D/F#  Em  .  |  A7  D7  |  G  A7  D  .  |'
    expect(chords('Somebody to Love', 'Verse')).toBe(verse)
    expect(chords('Somebody to Love', 'Solo').startsWith(verse)).toBe(true)
    // the chorus's four-chord bars are a beat each, as written
    expect(chords('Somebody to Love', 'Chorus')).toBe('|  D  A/C#  D  C  |  G  |  G  D/F#  Em  C  |')
  })

  it('Faith: the F# lasts three beats before the stop', () => {
    expect(chords('Faith', 'Pre-Chorus').endsWith('|  C#m  |  F#  .  .  N.C.  |')).toBe(true)
  })

  it("Faith: the verse's third bar is E all through, both times round", () => {
    // Bass, keys and guitar hold E for the whole bar; the B comes with the next bar.
    for (const name of ['Verse', 'Solo']) expect(chords('Faith', name), name).toBe('|  B  |  %  |  E  |  B  |  (x2)')
  })

  it('Club Tropicana: D#m7 for three beats, the slide down on beat 4', () => {
    expect(chords('Club Tropicana', 'Chorus').endsWith('|  D#m7  .  .  .  .  .  Dm7  C#m7  |')).toBe(true)
  })
})
