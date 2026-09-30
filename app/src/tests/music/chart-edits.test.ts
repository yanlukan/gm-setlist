import { describe, it, expect } from 'vitest'
import { sameSections, hasEditedChart } from '../../music/chart-edits'
import { DEFAULT_SONGS } from '../../data/songs'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!

describe('same sections', () => {
  const a = [{ name: 'Verse', chords: 'B  E' }, { name: 'Chorus', chords: 'B' }]

  it('are the same when every name and every chord matches, in order', () => {
    expect(sameSections(a, a.map(s => ({ ...s })))).toBe(true)
  })

  it('differ by a chord, a name, the order or the count', () => {
    expect(sameSections(a, [{ name: 'Verse', chords: 'B  A' }, a[1]])).toBe(false)
    expect(sameSections(a, [{ name: 'Verse 1', chords: 'B  E' }, a[1]])).toBe(false)
    expect(sameSections(a, [a[1], a[0]])).toBe(false)
    expect(sameSections(a, [a[0]])).toBe(false)
  })
})

describe('a song with its own chart', () => {
  it('is not edited when nothing was saved for it', () => {
    expect(hasEditedChart(faith, undefined)).toBe(false)
    expect(hasEditedChart(faith, {})).toBe(false)
  })

  it('is not edited when only notes, tempo or transpose were saved', () => {
    expect(hasEditedChart(faith, { notes: 'x', bpm: 100, transpose: -2 })).toBe(false)
  })

  it('is not edited when the saved chart is the built-in one', () => {
    expect(hasEditedChart(faith, { sections: faith.sections.map(s => ({ ...s })) })).toBe(false)
  })

  it('is edited when the chords are different', () => {
    expect(hasEditedChart(faith, { sections: [{ name: 'Verse', chords: 'B  A' }] })).toBe(true)
  })
})
