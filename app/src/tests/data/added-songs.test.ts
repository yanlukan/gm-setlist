import { describe, it, expect } from 'vitest'
import { SONGS } from '../../data/songs'
import { ADDED_SONGS, addedSongs, isAddedSong } from '../../data/added-songs'
import { DEFAULT_SONGS } from '../../data/library'
import { RECORD_CHECK, withRecordCheck } from '../../music/record-check'
import type { Song } from '../../types'

const song = (title: string): Song => ({
  title, artist: 'Nobody', key: 'C', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  sections: [{ name: 'Part 1', chords: '| C | G | Am | F |' }],
})

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
    }
    expect(addedSongs(files, SONGS).map(s => s.title)).toEqual(['F'])
    expect(isAddedSong(null)).toBe(false)
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
    const own: Song = {
      ...song('Evidence Song'),
      chordsFrom: 'Record',
      evidence: { 'Part 1': { from: 'Record', bars: [{ bar: 1, chords: 'G', from: 'Unsure', readings: [{ from: 'Record', chords: 'G' }] }] } },
    }
    expect(withRecordCheck([own], RECORD_CHECK)).toEqual([own])
  })
})
