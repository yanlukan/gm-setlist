import { audioContext } from './sound'

/** How far ahead beats are booked, in seconds, and how often the booking runs. */
const LOOKAHEAD = 0.15
const TICK_MS = 25
/** The first beat lands this long after the tap. */
const FIRST_BEAT = 0.05
/** One click, in seconds. */
const CLICK = 0.04
const ACCENT_HZ = 1500
const BEAT_HZ = 1000

export interface Beat { at: number; accent: boolean }

/**
 * The beats the band taps in a bar: the top number for x/4 time, and a
 * dotted quarter for x/8 (12/8 is four to the bar, 6/8 two), which is how
 * the songs' tempos are marked. Four for anything else.
 */
export function beatsPerBar(timeSignature: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(timeSignature.trim())
  if (!m) return 4
  const top = Number(m[1])
  const bottom = Number(m[2])
  if (top <= 0) return 4
  if (bottom === 8 && top % 3 === 0) return top / 3
  return top
}

function beatAt(bpm: number, beats: number, from: number, i: number): Beat {
  return { at: from + i * (60 / bpm), accent: i % beats === 0 }
}

/** `count` beats from `from` at the tempo, beat one of each bar accented. */
export function clickTimes(bpm: number, beats: number, from: number, count: number): Beat[] {
  return Array.from({ length: count }, (_, i) => beatAt(bpm, beats, from, i))
}

/** A short tick: a sine burst, higher and louder on the accent. */
function tick(ctx: AudioContext, beat: Beat) {
  const osc = ctx.createOscillator()
  osc.frequency.value = beat.accent ? ACCENT_HZ : BEAT_HZ
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(beat.accent ? 1 : 0.6, beat.at)
  gain.gain.exponentialRampToValueAtTime(0.001, beat.at + CLICK)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(beat.at)
  osc.stop(beat.at + CLICK)
}

/**
 * Start a click at the tempo, beat one of each bar accented, and give back
 * the function that stops it. Beats are booked a little ahead on the audio
 * clock from a timer, so a busy screen cannot make them late. Null where
 * the device cannot play sound.
 */
export function startClick(bpm: number, beats: number): (() => void) | null {
  const ctx = audioContext()
  if (!ctx) return null
  // iOS starts audio suspended until a tap asks for it: this is that tap
  if (ctx.state === 'suspended') void ctx.resume()
  const from = ctx.currentTime + FIRST_BEAT
  let next = 0
  const book = () => {
    const horizon = ctx.currentTime + LOOKAHEAD
    for (let beat = beatAt(bpm, beats, from, next); beat.at < horizon; beat = beatAt(bpm, beats, from, next)) {
      tick(ctx, beat)
      next++
    }
  }
  book()
  const timer = setInterval(book, TICK_MS)
  return () => clearInterval(timer)
}
