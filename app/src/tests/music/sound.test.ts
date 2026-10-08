import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ChordVoicing } from '../../data/chords-db'

const openC: ChordVoicing = { f: [null, 3, 2, 0, 1, 0], s: 0, l: 'Open' }
const barreB: ChordVoicing = { f: [null, 1, 3, 3, 3, 1], s: 2, l: '2nd fret' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

/** Just enough of an AudioContext to see what would be played. */
function fakeAudio() {
  const started: number[] = []
  class FakeContext {
    sampleRate = 8000
    currentTime = 0
    state = 'suspended'
    destination = {}
    resume = vi.fn()
    createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) })
    createGain = () => ({
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })
    createBufferSource = () => ({ buffer: null, connect: vi.fn(), start: (t: number) => started.push(t), stop: vi.fn() })
  }
  vi.stubGlobal('AudioContext', FakeContext)
  return started
}

describe('chord sound', () => {
  it('knows the notes a shape sounds: open C is C3 E3 G3 C4 E4', async () => {
    const { voicingMidi } = await import('../../music/sound')
    expect(voicingMidi(openC)).toEqual([48, 52, 55, 60, 64])
    // A barre drawn from the 2nd fret: B at the 2nd fret of the A string
    expect(voicingMidi(barreB)).toEqual([47, 54, 59, 63, 66])
  })

  it('sounds a capo shape at the pitch the song is played in', async () => {
    const { voicingMidi } = await import('../../music/sound')
    // A C shape with a capo on 2 sounds as D
    expect(voicingMidi(openC, 2)).toEqual([50, 54, 57, 62, 66])
  })

  it('strums every string, low to high, and wakes the audio on the tap', async () => {
    const started = fakeAudio()
    const { strum } = await import('../../music/sound')
    expect(strum(openC)).toBe(true)
    expect(started).toHaveLength(5)
    expect([...started].sort((a, b) => a - b)).toEqual(started)
  })

  it('says so on a device with no sound', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { strum } = await import('../../music/sound')
    expect(strum(openC)).toBe(false)
  })
})
