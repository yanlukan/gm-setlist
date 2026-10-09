import type { ChordVoicing } from '../data/chords-db'

/** Standard tuning, low E to high e, as MIDI notes: E2 A2 D3 G3 B3 E4. */
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]
/** Time between strings in a strum, low to high. */
const STRUM_GAP = 0.03
/** How long a note rings. */
const RING = 2.6

/**
 * The notes a shape sounds, low string first, as MIDI numbers. A capo
 * raises every string by its fret, so the shape is heard at the pitch the
 * song is played in.
 */
export function voicingMidi(v: ChordVoicing, capo = 0): number[] {
  return v.f.flatMap((f, string) => {
    if (f === null) return []
    const fret = f === 0 ? 0 : v.s === 0 ? f : v.s + f - 1
    return [OPEN_MIDI[string] + fret + capo]
  })
}

type AudioContextClass = typeof AudioContext
let context: AudioContext | null = null
const plucks = new Map<number, AudioBuffer>()

/**
 * The one AudioContext the app plays through, made on first use. Null where
 * the device has no web audio.
 */
export function audioContext(): AudioContext | null {
  // Sleep, a call or another app's audio leaves iOS sound "interrupted", and
  // it may never come back: start afresh on the tap rather than stay silent
  const state = context?.state as string | undefined
  if (context && state !== 'interrupted' && state !== 'closed') return context
  if (context) void context.close().catch(() => {})
  context = null
  plucks.clear()
  const Ctor: AudioContextClass | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
  if (!Ctor) return null
  // Safari mutes web sound in silent mode unless it is marked as playback,
  // the way a music app's is (iOS 17 and later)
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (session) session.type = 'playback'
  context = new Ctor()
  return context
}

/**
 * One plucked string (Karplus-Strong): a burst of noise fed round a delay
 * line one period long, softened a little each time round, which is how a
 * real string loses its brightness as it rings.
 */
function pluck(ctx: AudioContext, midi: number): AudioBuffer {
  const known = plucks.get(midi)
  if (known) return known
  const rate = ctx.sampleRate
  const length = Math.floor(rate * RING)
  const buffer = ctx.createBuffer(1, length, rate)
  const out = buffer.getChannelData(0)
  const frequency = 440 * 2 ** ((midi - 69) / 12)
  const period = Math.max(2, Math.round(rate / frequency))
  const ring = new Float32Array(period)
  // A pick, not a hammer: the burst is smoothed so the attack is not harsh
  let last = 0
  for (let i = 0; i < period; i++) {
    last = 0.6 * last + 0.4 * (Math.random() * 2 - 1)
    ring[i] = last
  }
  const decay = 0.996
  let at = 0
  for (let i = 0; i < length; i++) {
    const next = (at + 1) % period
    const value = ring[at]
    out[i] = value
    ring[at] = decay * 0.5 * (value + ring[next])
    at = next
  }
  plucks.set(midi, buffer)
  return buffer
}

/**
 * Strum a shape, low string to high, as it sounds with the given capo.
 * False where the device cannot play sound.
 */
export function strum(v: ChordVoicing, capo = 0): boolean {
  const ctx = audioContext()
  if (!ctx) return false
  // iOS starts audio suspended until a tap asks for it: this is that tap
  if (ctx.state === 'suspended') void ctx.resume()
  const notes = voicingMidi(v, capo)
  if (notes.length === 0) return true
  const master = ctx.createGain()
  master.gain.value = 0.9 / Math.sqrt(notes.length)
  master.connect(ctx.destination)
  const start = ctx.currentTime + 0.02
  notes.forEach((midi, i) => {
    const source = ctx.createBufferSource()
    source.buffer = pluck(ctx, midi)
    const gain = ctx.createGain()
    const t = start + i * STRUM_GAP
    gain.gain.setValueAtTime(1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + RING)
    source.connect(gain)
    gain.connect(master)
    source.start(t)
    source.stop(t + RING)
  })
  return true
}
