import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { settleBar, unsettleSong } from '../../store/evidence'
import { replaceBar, openUnsure, chordsFromText, type UnsureBar } from '../../music/evidence'
import { db, resetDb, getSongHistory } from '../../store/persistence'
import { whenHistorySaved } from '../../store/song-history'
import type { Song } from '../../types'

const text = '|  E  |  B  |  E  |  B  |\n|  E  |  B  F#/A#  G#m  .  |  C#m  |  F#  N.C.  |'
const disputed = 'B F#/A# G#m .'
const song: Song = {
  title: 'T', artist: 'A', key: 'E', bpm: 100, timeSignature: '4/4', capo: null, notes: '',
  sections: [{ name: 'Pre-Chorus', chords: text }, { name: 'Verse', chords: text }, { name: 'Verse', chords: text }],
  evidence: {
    'Pre-Chorus': { bars: [{ bar: 5, chords: disputed, from: 'Unsure', readings: [{ from: 'Book', chords: 'B G#m' }, { from: 'Record', chords: disputed }] }] },
  },
}

beforeEach(async () => {
  await whenHistorySaved()
  useStore.setState(useStore.getInitialState())
  useStore.setState({ songs: [song] })
  resetDb()
  const d = await db()
  await d.clear('settings')
  await d.clear('songEdits')
})

const first = (s: Song = song, name = 'Pre-Chorus') => openUnsure(s, undefined).find(u => u.name === name)!
const stray = (bar: number, name = 'Pre-Chorus'): UnsureBar => ({ ...first(), bar, name })

describe('settling a bar', () => {
  it("settling on the chart's own chords keeps the chart and records the bar as heard", () => {
    settleBar('T', first(), disputed)
    expect(useStore.getState().edits.T?.sections).toBeUndefined()
    expect(useStore.getState().edits.T?.heard).toEqual({ 'Pre-Chorus': { 5: disputed } })
  })
  it('settling on another reading writes it into the chart', () => {
    settleBar('T', first(), 'B G#m')
    expect(useStore.getState().getEditedSections('T')[0].chords).toBe(replaceBar(text, 5, 'B G#m'))
    expect(openUnsure(song, useStore.getState().edits.T)).toEqual([])
  })
  it('the chart before a settle is kept as an earlier version', async () => {
    settleBar('T', first(), 'B G#m')
    await whenHistorySaved()
    const versions = await getSongHistory('T')
    expect(versions).toHaveLength(1)
    expect(versions[0].reason).toBe('Before your changes')
    expect(versions[0].sections[0].chords).toBe(text)
  })
  it('settles every section of that name that still reads the disputed chords', () => {
    const verses = { ...song, evidence: { Verse: song.evidence!['Pre-Chorus'] } }
    useStore.setState({ songs: [verses] })
    settleBar('T', first(verses, 'Verse'), 'B G#m')
    const [, a, b] = useStore.getState().getEditedSections('T')
    expect(a.chords).toBe(replaceBar(text, 5, 'B G#m'))
    expect(b.chords).toBe(a.chords)
  })
  it('leaves a same-name section alone when it reads something else at that bar', () => {
    const other = text.replace('B  F#/A#  G#m  .', 'C')
    const verses = {
      ...song,
      sections: [{ name: 'Verse', chords: text }, { name: 'Verse', chords: other }],
      evidence: { Verse: song.evidence!['Pre-Chorus'] },
    }
    useStore.setState({ songs: [verses] })
    settleBar('T', first(verses, 'Verse'), 'B G#m')
    const [a, b] = useStore.getState().getEditedSections('T')
    expect(a.chords).toBe(replaceBar(text, 5, 'B G#m'))
    expect(b.chords).toBe(other)
  })
  it('does nothing when no section of that name has that bar', () => {
    settleBar('T', stray(99), 'B G#m')
    expect(useStore.getState().edits.T).toBeUndefined()
    settleBar('T', stray(5, 'Nope'), 'B G#m')
    expect(useStore.getState().edits.T).toBeUndefined()
  })
  it('does nothing for empty chords', () => {
    settleBar('T', first(), '')
    settleBar('T', first(), '   ')
    expect(useStore.getState().edits.T).toBeUndefined()
  })
})

describe('settling again', () => {
  it('unsettleSong removes heard and leaves no empty edit behind', () => {
    settleBar('T', first(), disputed)
    unsettleSong('T')
    expect(useStore.getState().edits.T).toBeUndefined()
  })
  it('unsettleSong keeps the other edits', () => {
    useStore.setState({ edits: { T: { transpose: 2 } } })
    settleBar('T', first(), disputed)
    unsettleSong('T')
    expect(useStore.getState().edits.T).toEqual({ transpose: 2 })
  })
  it('More does not count a bar twice', () => {
    const marked = { ...song, chordsFrom: 'Book' as const }
    settleBar('T', first(), 'B G#m')
    const edits = useStore.getState().edits.T
    expect(chordsFromText(marked, edits)).toBe('Songbook. 1 bar by ear.')
    // Back to the built-in chart: the bar is disputed again, so it is unsure, not by ear
    expect(chordsFromText(marked, { ...edits, sections: undefined })).toBe('Songbook. 1 bar unsure.')
  })
  it('More counts Ear bars only for sections the song has', () => {
    const odd = { ...song, chordsFrom: 'Book' as const, evidence: { Ghost: { bars: [{ bar: 1, chords: 'E', from: 'Ear' as const }] } } }
    expect(chordsFromText(odd, undefined)).toBe('Songbook.')
  })
})

describe('broken evidence', () => {
  it('draws no marks and does not throw', () => {
    const bad = {
      ...song, chordsFrom: 'Book',
      evidence: {
        'Pre-Chorus': { bars: 'nope' },
        Verse: { bars: [{ chords: 'E', from: 'Unsure' }, { bar: 1, from: 'Unsure' }, { bar: '1', chords: 'E', from: 'Ear' }, null] },
      },
    } as unknown as Song
    expect(openUnsure(bad, undefined)).toEqual([])
    expect(chordsFromText(bad, undefined)).toBe('Songbook.')
  })
})

describe('replaceBar on a % bar', () => {
  it('writes the chord over the %', () => {
    expect(replaceBar('|  E  |  %  |', 1, 'A')).toBe('|  E  |  A  |')
  })
})
