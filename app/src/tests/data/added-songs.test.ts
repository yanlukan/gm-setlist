import { describe, it, expect } from 'vitest'
import { SONGS } from '../../data/songs'
import { ADDED_SONGS, addedSongProblem, addedSongs, addedSongsReport, isAddedSong } from '../../data/added-songs'
import { DEFAULT_SONGS } from '../../data/library'
import { RECORD_CHECK, withRecordCheck } from '../../music/record-check'
import type { Song } from '../../types'

const song = (title: string): Song => ({
  title, artist: 'Nobody', key: 'C', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  sections: [{ name: 'Part 1', chords: '| C | G | Am | F |' }],
})
const unsureBar = (bar: number, chords: string) => ({ bar, chords, from: 'Unsure' as const, readings: [{ from: 'Record' as const, chords }] })
/** Every bar of song()'s one part Unsure, as the record route writes it. */
const allUnsure = { 'Part 1': { bars: ['C', 'G', 'Am', 'F'].map((c, i) => unsureBar(i, c)) } }

describe('songs added as data', () => {
  it('an added song joins the library', () => {
    const added = song('Made Up One')
    expect(addedSongs({ './added/x.json': added }, SONGS)).toEqual([added])
    const titles = DEFAULT_SONGS.map(s => s.title)
    for (const s of ADDED_SONGS) expect(titles).toContain(s.title)
  })

  it('a malformed added file is skipped', () => {
    const { sections: _s, ...noSections } = song('A')
    const files = {
      './added/a.json': noSections,
      './added/b.json': { ...song('B'), sections: 'nope' },
      './added/c.json': { ...song('C'), sections: [{ name: 'Part 1' }] },
      './added/d.json': null,
      './added/e.json': { ...song('E'), sections: [] },
      './added/f.json': song('F'),
      './added/g.json': { ...song('G'), form: 'Verse' },
      './added/h.json': { ...song('H'), form: ['Part 1', 2] },
      './added/i.json': { ...song('I'), chordsFrom: 'Unsure' },
      './added/j.json': { ...song('J'), chordsFrom: 'Guess' },
      './added/k.json': song('   '),
      './added/l.json': { ...song('L'), timeSignature: '0/4' },
      './added/m.json': { ...song('M'), timeSignature: '4/0' },
      './added/n.json': { ...song('N'), form: ['Part 1', 'Part 1'], chordsFrom: 'Record', evidence: allUnsure },
    }
    expect(addedSongs(files, SONGS).map(s => s.title)).toEqual(['F', 'N'])
    expect(isAddedSong(null)).toBe(false)
  })

  it('a tempo of zero or less is skipped', () => {
    expect(addedSongProblem({ ...song('A'), bpm: 0 })).toMatch(/tempo/)
    expect(addedSongProblem({ ...song('A'), bpm: -96 })).toMatch(/tempo/)
  })

  it('a song order naming a part the song lacks is skipped', () => {
    expect(addedSongProblem({ ...song('A'), form: ['Part 1', 'Part 2'] })).toMatch(/"Part 2"/)
  })

  it('two parts with one name are skipped', () => {
    const twice = { ...song('A'), sections: [{ name: 'Part 1', chords: '| C |' }, { name: 'Part 1', chords: '| G |' }] }
    expect(addedSongProblem(twice)).toMatch(/"Part 1"/)
  })

  it('evidence of the wrong shape is skipped', () => {
    const bad = [
      'nope',
      [],
      { 'Part 1': 'nope' },
      { 'Part 9': { from: 'Book' } },
      { 'Part 1': { from: 'Guess' } },
      { 'Part 1': { from: 'Unsure' } },
      { 'Part 1': { bars: 'nope' } },
      { 'Part 1': { bars: [{ bar: '1', chords: 'G', from: 'Book' }] } },
      { 'Part 1': { bars: [{ bar: -1, chords: 'G', from: 'Book' }] } },
      { 'Part 1': { bars: [{ bar: 1, chords: 7, from: 'Book' }] } },
      { 'Part 1': { bars: [{ bar: 1, chords: 'G', from: 'Guess' }] } },
      { 'Part 1': { bars: [{ bar: 1, chords: 'G', from: 'Unsure', readings: 'nope' }] } },
      { 'Part 1': { bars: [{ bar: 1, chords: 'G', from: 'Unsure', readings: [{ from: 'Unsure', chords: 'G' }] }] } },
      { 'Part 1': { bars: [{ bar: 1, chords: 'G', from: 'Unsure', readings: [{ from: 'Record' }] }] } },
    ]
    for (const evidence of bad) expect(addedSongProblem({ ...song('A'), evidence }), JSON.stringify(evidence)).toMatch(/evidence/)
    expect(addedSongProblem({ ...song('A'), evidence: { 'Part 1': { from: 'Book', bars: [unsureBar(1, 'G')] } } })).toBeNull()
  })

  it('a song from the record has every bar Unsure when it opens', () => {
    expect(addedSongProblem({ ...song('A'), chordsFrom: 'Record', evidence: allUnsure })).toBeNull()
    expect(addedSongProblem({ ...song('A'), chordsFrom: 'Record' })).toMatch(/bar 1 of 4 is not Unsure/)
    const three = { 'Part 1': { bars: allUnsure['Part 1'].bars.slice(0, 3) } }
    expect(addedSongProblem({ ...song('A'), chordsFrom: 'Record', evidence: three })).toMatch(/bar 4 of 4 is not Unsure/)
  })

  it('says which files were skipped and why', () => {
    const files = { './added/a.json': song('A'), './added/b.json': { ...song('B'), bpm: 0 }, './added/c.json': song(SONGS[0].title), './added/d.json': song('A') }
    const { songs, skipped } = addedSongsReport(files, SONGS)
    expect(songs.map(s => s.title)).toEqual(['A'])
    expect(skipped.map(s => s.file)).toEqual(['./added/b.json', './added/c.json', './added/d.json'])
    expect(skipped[0].reason).toMatch(/tempo/)
    expect(skipped[1].reason).toMatch(/already/)
    expect(skipped[2].reason).toMatch(/already/)
  })

  it('every file in the added folder opens', () => {
    const files = import.meta.glob('../../data/added/*.json', { eager: true, import: 'default' })
    expect(addedSongsReport(files, SONGS).skipped).toEqual([])
  })

  it('a title already shipped is skipped', () => {
    expect(addedSongs({ './added/x.json': song(SONGS[0].title) }, SONGS)).toEqual([])
  })

  it('two files with one title keep the first by file name', () => {
    const first = { ...song('Same'), artist: 'First' }
    const second = { ...song('Same'), artist: 'Second' }
    const out = addedSongs({ './added/b.json': second, './added/a.json': first }, SONGS)
    expect(out).toEqual([first])
  })

  it('its own evidence survives the recording check merge', () => {
    const own: Song = { ...song('Evidence Song'), chordsFrom: 'Record', evidence: allUnsure }
    const finding = (bar: number, chords: string, record: string) => ({ section: 'Part 1', bar, chords, kind: 'chord' as const, record, confidence: 0.9, at: [1] })
    // A lined-up check of the song, finding its own Unsure bar and a bar it has no mark on
    const check = {
      ...RECORD_CHECK,
      'Evidence Song': { recording: 'x.m4a', checked: '2026-11-14', shift: 0, verdict: 'lined up', unchecked: [], bars: [finding(1, 'G', 'Em'), finding(2, 'Am', 'C')] },
    }
    expect(withRecordCheck([own], check)).toEqual([own])
    // The same check does mark a song from a chart, so the merge did run
    const charted = { ...song('Evidence Song'), chordsFrom: 'Chart' as const }
    expect(withRecordCheck([charted], check)[0].evidence?.['Part 1']?.bars?.map(b => b.bar)).toEqual([1, 2])
  })

  it('a file without notes or capo opens with defaults', () => {
    const { notes: _n, capo: _c, ...bare } = song('Bare')
    expect(addedSongs({ './added/a.json': bare }, SONGS)).toEqual([song('Bare')])
    const bad = { './added/b.json': { ...song('B'), notes: 3 }, './added/c.json': { ...song('C'), capo: '2' } }
    expect(addedSongs(bad, SONGS)).toEqual([])
  })

  it('a bad time signature is skipped', () => {
    const files = { './added/a.json': { ...song('A'), timeSignature: 'four' }, './added/b.json': { ...song('B'), timeSignature: '4/' } }
    expect(addedSongs(files, SONGS)).toEqual([])
  })
})
