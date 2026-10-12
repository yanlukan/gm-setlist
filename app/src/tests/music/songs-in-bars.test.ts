import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { barsOf, hasBars, REPEAT_BAR, isRepeatCount } from '../../music/bars'

// The songs charted in bars from the songbook, each checked against the
// recording: the bars of the song order, played through, must come to the
// recording's length at its tempo.

const by = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
const tokens = (line: string) => line.split(/\s+/).filter(Boolean)
const barsIn = (chords: string) => chords.split('\n').reduce((n, line) => n + barsOf(tokens(line)).length, 0)
const sectionBars = (title: string) => Object.fromEntries(by(title).sections.map(s => [s.name, barsIn(s.chords)]))

function recordingBars(title: string) {
  const song = by(title)
  const beatsPerBar = Number(song.timeSignature?.split('/')[0] ?? 4)
  return (song.duration! * song.bpm!) / 60 / beatsPerBar
}
function formBars(title: string) {
  const bars = sectionBars(title)
  return by(title).form!.reduce((n, name) => n + bars[name], 0)
}

describe("I Can't Make You Love Me in bars (songbook no. 25)", () => {
  const LOVE = "I Can't Make You Love Me"

  it('writes every line of every section in bars', () => {
    for (const section of by(LOVE).sections) {
      for (const line of section.chords.split('\n')) expect(hasBars(line), `${section.name}: ${line}`).toBe(true)
    }
  })

  it('has the bars the book has, with the piano intro from the recording', () => {
    expect(sectionBars(LOVE)).toEqual({ Intro: 8, Verse: 11, Chorus: 15, 'Chorus end': 1, Outro: 15 })
  })

  it('plays the whole chorus both times, the first going back to the verse, the second into the outro', () => {
    expect(by(LOVE).form).toEqual(['Intro', 'Verse', 'Chorus', 'Chorus end', 'Verse', 'Chorus', 'Outro'])
  })

  it('comes to the length of the recording at its tempo, give or take the slowing down at the end', () => {
    expect(Math.abs(formBars(LOVE) - recordingBars(LOVE))).toBeLessThanOrEqual(3)
  })

  it('stays in G with a shape for every chord, and keeps the Em11 as the player plays it', () => {
    const song = by(LOVE)
    expect(song.key).toBe('G')
    const chords = song.sections.flatMap(s => tokens(s.chords)).filter(t => t !== '|' && t !== REPEAT_BAR && !isRepeatCount(t))
    const missing = [...new Set(chords)].filter(c => !song.shapes?.[c])
    expect(missing).toEqual([])
    expect(song.playerShapes).toEqual({ Em11: 'x-x-2-2-3-5' })
  })
})
