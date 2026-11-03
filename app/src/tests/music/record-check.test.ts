import { describe, it, expect } from 'vitest'
import { withRecordCheck, recordCheckText, type RecordCheck, type CheckBar } from '../../music/record-check'
import { openUnsure } from '../../music/evidence'
import type { Song } from '../../types'

const song = (over: Partial<Song> = {}): Song =>
  ({
    title: 'Test',
    artist: 'A',
    key: 'C',
    bpm: 100,
    timeSignature: '4/4',
    chordsFrom: 'Book',
    sections: [{ name: 'Verse', chords: '| C | F G | Am | G |' }],
    ...over,
  }) as Song

const finding = (over: Partial<CheckBar> = {}): CheckBar => ({
  section: 'Verse', bar: 1, chords: 'F G', kind: 'chord', record: 'F Am', confidence: 0.8, at: [8], ...over,
})
const check = (bars: CheckBar[], over: Partial<RecordCheck[string]> = {}): RecordCheck => ({
  Test: { recording: 'test.m4a', checked: '2026-11-03', shift: 0, verdict: 'lined up', bars, unchecked: [], ...over },
})

describe('withRecordCheck', () => {
  it('a chord finding becomes an Unsure bar with both readings', () => {
    const [out] = withRecordCheck([song()], check([finding()]))
    expect(out.evidence?.Verse?.bars).toEqual([
      { bar: 1, chords: 'F G', from: 'Unsure', readings: [{ from: 'Book', chords: 'F G' }, { from: 'Record', chords: 'F Am' }] },
    ])
    expect(openUnsure(out, undefined).map(u => [u.name, u.bar])).toEqual([['Verse', 1]])
  })

  it("a section by ear or from the record gets no mark: the ear wins", () => {
    for (const from of ['Ear', 'Record'] as const) {
      const s = song({ evidence: { Verse: { from } } })
      const [out] = withRecordCheck([s], check([finding()]))
      expect(out).toEqual(s)
    }
  })

  it("uses the section's own source for the chart reading", () => {
    const s = song({ evidence: { Verse: { from: 'Chart' } } })
    const [out] = withRecordCheck([s], check([finding()]))
    expect(out.evidence?.Verse?.bars?.[0].readings?.[0].from).toBe('Chart')
  })

  it('compares and stores the chords squashed', () => {
    const [out] = withRecordCheck([song()], check([finding({ chords: 'F  G' })]))
    expect(out.evidence?.Verse?.bars?.[0].chords).toBe('F G')
    expect(out.evidence?.Verse?.bars?.[0].readings?.[0].chords).toBe('F G')
  })

  it('a repeated section where one copy reads other chords drops the finding', () => {
    const sections = [{ name: 'Verse', chords: '| C | F G | Am | G |' }, { name: 'Verse', chords: '| C | F Em | Am | G |' }]
    const [out] = withRecordCheck([song({ sections })], check([finding()]))
    expect(out.evidence).toBeUndefined()
  })

  it("a finding about other chords than the bar's is dropped", () => {
    const [out] = withRecordCheck([song()], check([finding({ chords: 'F Em' }), finding({ bar: 9, chords: 'C' })]))
    expect(out.evidence).toBeUndefined()
  })

  it('a finding whose record reading is the same chords is dropped', () => {
    const [out] = withRecordCheck([song()], check([finding({ record: 'F  G' })]))
    expect(out.evidence).toBeUndefined()
  })

  it('hand evidence wins', () => {
    const s = song({ evidence: { Verse: { bars: [{ bar: 1, chords: 'F G', from: 'Ear' }] } } })
    const [out] = withRecordCheck([s], check([finding()]))
    expect(out).toEqual(s)
  })

  it('a song not lined up gets no marks', () => {
    for (const verdict of ['not lined up', 'no song order', 'no recording']) {
      const [out] = withRecordCheck([song()], check([finding()], { verdict }))
      expect(out.evidence).toBeUndefined()
    }
  })

  it('rhythm findings make no marks', () => {
    const [out] = withRecordCheck([song()], check([finding({ kind: 'rhythm' })]))
    expect(out.evidence).toBeUndefined()
  })

  it('a song with no entry is returned as it is', () => {
    const s = song()
    expect(withRecordCheck([s], {})[0]).toBe(s)
  })

  it('the input is not changed', () => {
    const s = song({ evidence: { Verse: { from: 'Book', bars: [] } } })
    const before = JSON.stringify(s)
    withRecordCheck([s], check([finding()]))
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('the marks against a saved copy', () => {
  const [merged] = withRecordCheck([song()], check([finding()]))
  it('a saved copy that still reads the chords keeps the mark', () => {
    const edits = { sections: [{ name: 'Verse', chords: '| C | F  G | Am | G |\n| C |' }] }
    expect(openUnsure(merged, edits).map(u => [u.name, u.bar])).toEqual([['Verse', 1]])
  })
  it('a saved copy with the bar edited has no mark', () => {
    const edits = { sections: [{ name: 'Verse', chords: '| C | F Am | Am | G |' }] }
    expect(openUnsure(merged, edits)).toEqual([])
  })
  it('a bar the player settled on the chart chords has no mark', () => {
    expect(openUnsure(merged, { heard: { Verse: { 1: 'F  G' } } })).toEqual([])
  })
  it('a bar settled on other chords that still reads the disputed ones stays open', () => {
    expect(openUnsure(merged, { heard: { Verse: { 1: 'F Am' } } }).map(u => u.bar)).toEqual([1])
  })
})

describe('recordCheckText', () => {
  it('says when there is no recording', () => {
    expect(recordCheckText(check([], { recording: null, verdict: 'no recording' })['Test'])).toBe('no recording, 2026-11-03')
  })
  it('More names the recording and the date', () => {
    expect(recordCheckText(check([])['Test'])).toBe('test.m4a, 2026-11-03')
  })
  it('says when the song did not line up', () => {
    expect(recordCheckText(check([], { verdict: 'not lined up' })['Test'])).toBe('test.m4a, 2026-11-03 · not lined up')
    expect(recordCheckText(check([], { verdict: 'no song order' })['Test'])).toBe('test.m4a, 2026-11-03 · no song order')
  })
  it('counts the bars not checked', () => {
    const unchecked = [{ section: 'Verse', bar: 0 }, { section: 'Verse', bar: 2 }]
    expect(recordCheckText(check([], { unchecked })['Test'])).toBe('test.m4a, 2026-11-03 · 2 bars not checked')
    expect(recordCheckText(check([], { unchecked: unchecked.slice(0, 1) })['Test'])).toBe('test.m4a, 2026-11-03 · 1 bar not checked')
  })
})
