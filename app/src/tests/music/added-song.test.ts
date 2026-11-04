import { describe, it, expect } from 'vitest'
import { addedSong, answerProblem, songFileName, type AddAnswer } from '../../music/added-song'
import { readChartText } from '../../music/chart-text-import'
import { isAddedSong } from '../../data/added-songs'
import { openUnsure } from '../../music/evidence'

const base = { recording: 'la-song.m4a', duration: 241.6, key: 'C', bpm: 96, timeSignature: '4/4' }
const input = { title: 'La Song', artist: 'Nobody', draft: null }
const barred = readChartText('[Verse]\n| C | G | Am | F |\n[Chorus]\n| F | C |\n[Verse]\n')
const check = (verdict: string) => ({
  recording: 'la-song.m4a', checked: '2026-11-04', shift: 0, verdict, unchecked: [],
  bars: [{ section: 'Verse', bar: 2, chords: 'Am', kind: 'chord' as const, record: 'C', confidence: 0.9, at: [12.5] }],
})

describe('addedSong', () => {
  it('route chart: the chart, with a check finding as one Unsure bar read by the chart and the record', () => {
    const song = addedSong({ ...input, draft: barred }, { ...base, route: 'chart', check: check('lined up') })
    expect(song.sections).toEqual(barred.sections)
    expect(song.form).toEqual(['Verse', 'Chorus', 'Verse'])
    expect(song.chordsFrom).toBe('Chart')
    expect(song.evidence?.Verse?.bars).toEqual([{
      bar: 2, chords: 'Am', from: 'Unsure', readings: [{ from: 'Chart', chords: 'Am' }, { from: 'Record', chords: 'C' }],
    }])
    expect(song.notes).toBe('Recording: la-song.m4a. From your chart, lined up with the recording; 1 bar to check.')
    expect(isAddedSong(song)).toBe(true)
  })

  it('route chart that would not line up keeps the chart and marks nothing', () => {
    const song = addedSong({ ...input, draft: barred }, { ...base, route: 'chart', check: check('not lined up') })
    expect(song.evidence).toBeUndefined()
    expect(song.notes).toContain('the recording could not be lined up, so nothing is marked')
  })

  it("route words keeps the answer's bars, order and evidence", () => {
    const evidence = { Verse: { from: 'Chart' as const, bars: [{ bar: 1, chords: 'E', from: 'Unsure' as const, readings: [{ from: 'Chart' as const, chords: 'G' }, { from: 'Record' as const, chords: 'E' }] }] } }
    const answer: AddAnswer = { ...base, route: 'words', sections: [{ name: 'Verse', chords: '| C | E |' }], form: ['Verse', 'Verse'], evidence }
    const song = addedSong({ ...input, draft: readChartText('[Verse]\nC G\nla la la') }, answer)
    expect(song.chordsFrom).toBe('Chart')
    expect(song.evidence).toEqual(evidence)
    expect(song.form).toEqual(['Verse', 'Verse'])
    expect(song.notes).toBe("Recording: la-song.m4a. From your chart, its chords placed on the recording's bars; 1 bar to check.")
    expect(isAddedSong(song)).toBe(true)
  })

  it('route record has every bar Unsure, from the record', () => {
    const sections = [{ name: 'Part 1', chords: '| C | G | Am | F |' }]
    const evidence = { 'Part 1': { bars: ['C', 'G', 'Am', 'F'].map((chords, bar) => ({ bar, chords, from: 'Unsure' as const, readings: [{ from: 'Record' as const, chords }] })) } }
    const song = addedSong(input, { ...base, route: 'record', sections, form: ['Part 1'], evidence })
    expect(song.chordsFrom).toBe('Record')
    expect(openUnsure(song, undefined)).toHaveLength(4)
    expect(song.notes).toBe('Recording: la-song.m4a. Bars and chords read off the recording; every bar is unsure until you hear it (4 bars).')
    expect(isAddedSong(song)).toBe(true)
  })

  it('every song has no capo and a whole-second length', () => {
    const song = addedSong({ ...input, draft: barred }, { ...base, route: 'chart', check: check('lined up') })
    expect(song.capo).toBeNull()
    expect(song.duration).toBe(242)
  })

  it('route chart without a chart is refused', () => {
    expect(() => addedSong(input, { ...base, route: 'chart', check: check('lined up') })).toThrow()
  })
})

describe('answerProblem', () => {
  it('a good answer has none', () => {
    expect(answerProblem({ ...base, route: 'chart', check: check('lined up') })).toBeNull()
  })
  it('a recording named with its folder is refused', () => {
    expect(answerProblem({ ...base, recording: 'folder/la-song.m4a', route: 'chart', check: check('lined up') })).toMatch(/file name/)
  })
  it('a route without its parts is refused', () => {
    expect(answerProblem({ ...base, route: 'record' })).toMatch(/sections/)
    expect(answerProblem({ ...base, route: 'chart' })).toMatch(/check/)
    expect(answerProblem({ ...base, route: 'other' })).toMatch(/route/)
    expect(answerProblem('nonsense')).not.toBeNull()
  })
  it('route record with a bar that is not Unsure is refused', () => {
    const sections = [{ name: 'Part 1', chords: '| C | G |' }, { name: 'Part 2', chords: '| Am | F |' }]
    const unsure = (chords: string, bar: number) => ({ bar, chords, from: 'Unsure' as const, readings: [{ from: 'Record' as const, chords }] })
    const all = { 'Part 1': { bars: [unsure('C', 0), unsure('G', 1)] }, 'Part 2': { bars: [unsure('Am', 0), unsure('F', 1)] } }
    const record = { ...base, route: 'record', sections, form: ['Part 1', 'Part 2'] }
    expect(answerProblem({ ...record, evidence: all })).toBeNull()
    expect(answerProblem({ ...record, evidence: { ...all, 'Part 2': { bars: [unsure('Am', 0)] } } })).toBe('route record: bar 4 of 4 is not Unsure')
    expect(answerProblem({ ...record, evidence: { ...all, 'Part 1': { bars: [{ ...unsure('C', 0), from: 'Record' }, unsure('G', 1)] } } })).toBe('route record: bar 1 of 4 is not Unsure')
    expect(answerProblem(record)).toBe('route record: bar 1 of 4 is not Unsure')
  })
})

describe('songFileName', () => {
  it("follows Python's slug rule", () => {
    expect(songFileName("Freedom! '90")).toBe('freedom-90.json')
  })
})
