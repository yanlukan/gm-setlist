import { describe, it, expect } from 'vitest'
import { formatSetlist, playedKey } from '../../music/setlist-text'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'

const inGigOrder = GIG_SETLIST_2026.map(t => DEFAULT_SONGS.find(s => s.title === t)!)

describe('playedKey', () => {
  it('is the song key when nothing is transposed', () => {
    const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
    expect(playedKey(faith)).toEqual({ key: 'B', original: 'B', semitones: 0 })
  })

  it('applies the transpose, spelled sensibly', () => {
    const careless = DEFAULT_SONGS.find(s => s.title === 'Careless Whisper')! // Dm
    expect(playedKey(careless, { transpose: -2 }).key).toBe('Cm')
  })
})

describe('formatSetlist', () => {
  it('lists the running order with keys, ready to send to the band', () => {
    const text = formatSetlist('GM Tribute', inGigOrder, {})
    const lines = text.split('\n')
    expect(lines[0]).toBe('GM Tribute')
    expect(lines[2]).toBe('1. Faith (B)')
    expect(lines[19]).toBe('18. Roxanne (Bm)')
    expect(lines).toHaveLength(2 + 21)
  })

  it('flags a lower-key song whose key is not settled yet', () => {
    const unsettled = inGigOrder.map(song =>
      song.title === "I'm Your Man" ? { ...song, transpose: undefined } : song)
    expect(formatSetlist('GM', unsettled, {})).toContain("2. I'm Your Man (D, lower key TBC)")
  })

  it('has every lower key settled for the September set', () => {
    const text = formatSetlist('GM', inGigOrder, {})
    expect(text).not.toContain('TBC')
    expect(text).toContain("2. I'm Your Man (C, orig. D)")
    expect(text).toContain('3. Club Tropicana (A, orig. B)')
    expect(text).toContain('14. Wake Me Up Before You Go-Go (B, orig. C)')
    expect(text).toContain('16. Careless Whisper (Cm, orig. Dm)')
  })

  it('shows the new key and the original once transposed', () => {
    const text = formatSetlist('GM', inGigOrder, { "I'm Your Man": { transpose: -2 } })
    expect(text).toContain("2. I'm Your Man (C, orig. D)")
  })
})

describe('band keys in the shared setlist', () => {
  it('lists Amazing in the key the band plays it', () => {
    const text = formatSetlist('GM', inGigOrder, {})
    expect(text).toContain('4. Amazing (Am, orig. Bbm)')
    expect(text).not.toContain('4. Amazing (Bbm, lower key TBC)')
  })
})
