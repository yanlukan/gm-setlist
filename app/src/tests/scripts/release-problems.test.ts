import { describe, it, expect } from 'vitest'
import { barChords, barsOfSection } from '../../music/evidence'
// @ts-expect-error -- the release check's saved charts are a plain script with no types
import { CHECK_SONG } from '../../../scripts/release-saved.mjs'
// @ts-expect-error -- the release check's rules are a plain script with no types
import { problems, sortOut } from '../../../scripts/release-problems.mjs'

const box = (left: number, right: number, top = 0, bottom = 20) => ({ left, right, top, bottom })

/** A chord as the release check reads it: text from `left` to `right`, at 40 px. */
function chord(bar: number, name: string, left: number, right: number, row = '', top = 0) {
  const rect = box(left, right, top, top + 20)
  return { bar, name, px: 40, content: rect, text: rect, barRect: box(0, 400, -100, 100), cutOff: false, offScreen: false, staggered: row !== '', row }
}

describe('the release check rules', () => {
  it('passes a staggered bar in playing order, a chord running on under the next on the other line', () => {
    // Faith: B (top), F#/A# (bottom) after B ends, G#m (top) half a size later, over F#/A#'s tail
    const page = { chords: [chord(0, 'B', 0, 30, '1'), chord(0, 'F#/A#', 30, 140, '2', 20), chord(0, 'G#m', 50, 130, '1')], sections: [] }
    expect(problems(page)).toEqual([])
  })

  it('fails a staggered bar out of order', () => {
    const page = {
      chords: [chord(0, 'B', 0, 45, '1'), chord(0, 'F#/A#', 30, 140, '2', 20), chord(0, 'G#m', 40, 120, '1')],
      sections: [],
    }
    const texts = problems(page).map(([, text]: string[]) => text)
    expect(texts).toContain('F#/A# out of order (starts before B ends)')
    expect(texts).toContain('G#m out of order (starts under F#/A#)')
    expect(texts).toContain('G#m out of order (overlaps B on its line)')
  })

  it('lets the second of two staggered chords start under the first one\'s tail, half a size after its start', () => {
    // Too Funky: Am/D (top), G/D (bottom) from 20 px, under Am/D's tail
    const pair = { chords: [chord(0, 'Am/D', 0, 100, '1'), chord(0, 'G/D', 20, 80, '2', 20)], sections: [] }
    expect(problems(pair)).toEqual([])
    const tooSoon = { chords: [chord(0, 'Am/D', 0, 100, '1'), chord(0, 'G/D', 10, 70, '2', 20)], sections: [] }
    expect(problems(tooSoon).map(([, text]: string[]) => text)).toEqual(['G/D out of order (starts under Am/D)'])
  })

  it('still fails the second of three staggered chords starting before the first ends', () => {
    const page = { chords: [chord(0, 'B', 0, 100, '1'), chord(0, 'F#/A#', 20, 140, '2', 20), chord(0, 'G#m', 110, 140, '1')], sections: [] }
    expect(problems(page).map(([, text]: string[]) => text)).toEqual(['F#/A# out of order (starts before B ends)'])
  })

  it('fails a bar drawn differently from an earlier bar of its section with the same chords', () => {
    const bar = (section: number, chords: string, lines: string) => ({ section, chords, lines })
    const page = {
      chords: [],
      sections: [],
      // Too Funky's Keyboard row: bar 3 on one line, bar 1 staggered; the next section may differ
      bars: [bar(0, 'Dm G/D', '2'), bar(0, 'Am/D G/D', '2'), bar(0, 'Dm G/D', '1'), bar(0, 'Am/D G/D', '2'), bar(1, 'Dm G/D', '1')],
    }
    expect(problems(page)).toEqual([['bar 3', 'drawn differently from bar 1']])
  })

  it('makes a row too wide for the phone at 20 px a warning, not a failure', () => {
    const found = [['section 9', 'runs past its width', 'width'], ['bar 53', 'C6/9 off the screen', 'width'], ['bar 2', 'G cut off']]
    const phone = sortOut('phone-390x844', 20, found)
    expect(phone.warnings.map(([where]: string[]) => where)).toEqual(['section 9', 'bar 53'])
    expect(phone.failures.map(([where]: string[]) => where)).toEqual(['bar 2'])
  })

  it('fails a row too wide on the phone above 20 px, and at every other size', () => {
    const found = [['section 9', 'runs past its width', 'width']]
    expect(sortOut('phone-390x844', 24, found).failures).toHaveLength(1)
    expect(sortOut('820x1180', 20, found).failures).toHaveLength(1)
    expect(sortOut('820x1180', 20, found).warnings).toHaveLength(0)
  })

  it('a chord diagram on a fresh page is a problem', () => {
    const found = problems({ chords: [], sections: [], diagrams: 2 })
    expect(found).toHaveLength(1)
    expect(found[0][1]).toContain('chord diagram')
    expect(problems({ chords: [], sections: [], diagrams: 0 })).toEqual([])
  })

  it('fails a chord diagram at every size, the phone too', () => {
    const found = problems({ chords: [], sections: [], diagrams: 1 })
    expect(sortOut('phone-390x844', 20, found).failures).toHaveLength(1)
    expect(sortOut('820x1180', 24, found).failures).toHaveLength(1)
  })

  describe('the unsure mark', () => {
    const page = (marks: unknown[]) => ({ chords: [chord(0, 'B', 0, 30), chord(0, 'F#', 40, 80)], sections: [], marks })
    const mark = (left: number, right: number, offScreen = false) => ({ rect: box(left, right, 0, 20), offScreen })

    it('fails a mark over a chord', () => {
      expect(problems(page([mark(20, 35)]))).toEqual([['mark 1', 'unsure mark covers B']])
    })
    it('passes a mark beside the chords, or touching by a pixel', () => {
      expect(problems(page([mark(31, 39)]))).toEqual([])
      expect(problems(page([mark(30, 45)]))).toEqual([['mark 1', 'unsure mark covers F#']])
      expect(problems(page([mark(30, 40.5)]))).toEqual([])
    })
    it('fails a mark off the screen, as a width problem', () => {
      expect(problems(page([mark(31, 39, true)]))).toEqual([['mark 1', 'unsure mark off the screen', 'width']])
    })
    it('numbers marks from 1 and needs none', () => {
      expect(problems(page([mark(31, 39), mark(0, 10)]))).toEqual([['mark 2', 'unsure mark covers B']])
      expect(problems({ chords: [], sections: [] })).toEqual([])
    })
  })

  it("the check's own song writes its unsure bars as the evidence says", () => {
    const bars = barsOfSection(CHECK_SONG.sections[0].chords).map(barChords)
    for (const b of CHECK_SONG.evidence.Marks.bars) expect(bars[b.bar]).toBe(b.chords)
  })
})
