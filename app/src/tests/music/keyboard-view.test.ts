import { describe, it, expect } from 'vitest'
import { DEFAULT_VIEW, capoFor, shapeSections, shownSections, simplifyRuleFor, type ChartView } from '../../music/chart-view'
import { DEFAULT_SONGS } from '../../data/songs'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const KEYBOARD: ChartView = { ...DEFAULT_VIEW, instrument: 'keyboard' }

describe('the keyboard view', () => {
  it('is not the default: the guitar is', () => {
    expect(DEFAULT_VIEW.instrument).toBe('guitar')
  })

  it('ignores the capo: a keyboard plays what sounds', () => {
    expect(capoFor(faith, { capo: 2 })).toBe(2)
    expect(capoFor(faith, { capo: 2 }, KEYBOARD)).toBe(0)
  })

  it('shows the chords at the sounding pitch even with a capo on', () => {
    // Faith is in B; with a capo on 2 the guitar plays A shapes
    expect(shapeSections(faith, { capo: 2 })[1].chords).toBe('A  D  A  D  A')
    expect(shapeSections(faith, { capo: 2 }, KEYBOARD)[1].chords).toBe('B  E  B  E  B')
  })

  it('simplifies to plain chords, whatever sound the song has on the guitar', () => {
    // Faith is an electric (FUNK) song: on the guitar the 7ths and 9ths would stay
    expect(simplifyRuleFor(faith, undefined, DEFAULT_VIEW)).toBe('electric')
    expect(simplifyRuleFor(faith, undefined, KEYBOARD)).toBe('acoustic')
    const edits = { sections: [{ name: 'Verse', chords: 'Bmaj7  E7/G#  C#m9' }] }
    expect(shownSections(faith, edits, { ...DEFAULT_VIEW, simple: true })[0].chords).toBe('Bmaj7  E7  C#m9')
    expect(shownSections(faith, edits, { ...KEYBOARD, simple: true })[0].chords).toBe('B  E  C#m')
  })
})
