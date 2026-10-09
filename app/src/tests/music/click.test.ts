import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

/** Just enough of an AudioContext to see which clicks would sound, and when. */
function fakeAudio() {
  const clicks: { at: number; hz: number }[] = []
  const ctx = { currentTime: 0 }
  class FakeContext {
    sampleRate = 8000
    get currentTime() { return ctx.currentTime }
    state = 'running'
    destination = {}
    resume = vi.fn(() => Promise.resolve())
    close = vi.fn(() => Promise.resolve())
    createGain = () => ({
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })
    createOscillator = () => {
      const osc = { frequency: { value: 440 }, connect: vi.fn(), start: (t: number) => clicks.push({ at: t, hz: osc.frequency.value }), stop: vi.fn() }
      return osc
    }
  }
  vi.stubGlobal('AudioContext', FakeContext)
  return { clicks, ctx }
}

describe('beats in a bar', () => {
  it('counts the beats the band taps: four in 4/4, three in 3/4, four dotted quarters in 12/8', async () => {
    const { beatsPerBar } = await import('../../music/click')
    expect(beatsPerBar('4/4')).toBe(4)
    expect(beatsPerBar('3/4')).toBe(3)
    expect(beatsPerBar('12/8')).toBe(4)
    expect(beatsPerBar('6/8')).toBe(2)
    expect(beatsPerBar('')).toBe(4)
  })
})

describe('click times', () => {
  it('spaces the beats by the tempo, with the accent on one of each bar', async () => {
    const { clickTimes } = await import('../../music/click')
    expect(clickTimes(120, 4, 10, 6)).toEqual([
      { at: 10, accent: true }, { at: 10.5, accent: false }, { at: 11, accent: false },
      { at: 11.5, accent: false }, { at: 12, accent: true }, { at: 12.5, accent: false },
    ])
  })

  it('accents every third beat in 3/4', async () => {
    const { clickTimes } = await import('../../music/click')
    expect(clickTimes(60, 3, 0, 4).map(b => b.accent)).toEqual([true, false, false, true])
  })
})

describe('the click', () => {
  it('schedules the beats a little ahead of time, the accent higher, until it is stopped', async () => {
    vi.useFakeTimers()
    const { clicks, ctx } = fakeAudio()
    const { startClick } = await import('../../music/click')
    const stop = startClick(120, 4)
    expect(stop).not.toBeNull()
    // The first beat is booked at once, from the tap
    expect(clicks.length).toBe(1)
    const first = clicks[0].at
    // Time passes: the beats up to the lookahead are booked, half a second apart
    ctx.currentTime = 1
    vi.advanceTimersByTime(100)
    expect(clicks.map(c => +(c.at - first).toFixed(3))).toEqual([0, 0.5, 1])
    expect(clicks[0].hz).toBeGreaterThan(clicks[1].hz)
    expect(clicks[1].hz).toBe(clicks[2].hz)
    // Beat one of the second bar is accented again
    ctx.currentTime = 2.2
    vi.advanceTimersByTime(100)
    expect(clicks.length).toBe(5)
    expect(clicks[4].hz).toBe(clicks[0].hz)
    // Stopped: nothing more is booked however long passes
    stop!()
    ctx.currentTime = 10
    vi.advanceTimersByTime(1000)
    expect(clicks.length).toBe(5)
  })

  it('reports that it cannot click where there is no sound', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { startClick } = await import('../../music/click')
    expect(startClick(120, 4)).toBeNull()
  })
})
