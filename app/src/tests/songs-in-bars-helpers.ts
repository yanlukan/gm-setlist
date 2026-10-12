import { expect } from 'vitest'
import { DEFAULT_SONGS } from '../data/songs'
import { barsOf, hasBars, REPEAT_BAR, isRepeatCount } from '../music/bars'

// The songs charted in bars from the songbook, each checked against the
// recording: the bars of the song order, played through, must come to the
// recording's length at its tempo. Shared by the songs-in-bars tests.

export const by = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!
export const tokens = (line: string) => line.split(/\s+/).filter(Boolean)
/** How many times a line is played: once, or as its repeat count says. */
const timesPlayed = (line: string) => Number(tokens(line).find(isRepeatCount)?.match(/\d+/)?.[0] ?? 1)
export const barsIn = (chords: string) =>
  chords.split('\n').reduce((n, line) => n + barsOf(tokens(line)).length * timesPlayed(line), 0)
export const sectionBars = (title: string) => Object.fromEntries(by(title).sections.map(s => [s.name, barsIn(s.chords)]))

/** The recording's bars at its tempo, leaving out an opening in free time and,
 * for a long fade, what comes after the music has gone (both in seconds). */
export function recordingBars(title: string, freeTime = 0, end = by(title).duration!) {
  const song = by(title)
  const [top, bottom] = (song.timeSignature ?? '4/4').split('/').map(Number)
  // In 6/8 or 12/8 the tempo counts dotted quarters, three eighths a beat
  const beatsPerBar = bottom === 8 && top % 3 === 0 ? top / 3 : top
  return ((end - freeTime) * song.bpm!) / 60 / beatsPerBar
}
export const chordsOf = (title: string) =>
  [...new Set(by(title).sections.flatMap(s => tokens(s.chords)).filter(t => t !== '|' && t !== REPEAT_BAR && !isRepeatCount(t) && t !== 'N.C.'))]
export function everyLineInBars(title: string) {
  for (const section of by(title).sections) {
    for (const line of section.chords.split('\n')) expect(hasBars(line), `${section.name}: ${line}`).toBe(true)
  }
}
export function formBars(title: string) {
  const bars = sectionBars(title)
  return by(title).form!.reduce((n, name) => n + bars[name], 0)
}
/** A section's lines as played: each % written out as the bar it repeats. */
export function playedLines(chords: string) {
  let before: string[] = []
  return chords.split('\n').map(line =>
    barsOf(tokens(line).filter(t => !isRepeatCount(t)))
      .map(bar => (before = bar[0] === REPEAT_BAR ? before : bar).join(' '))
      .join(' | '),
  )
}
