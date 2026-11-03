import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { settleBar } from '../../store/evidence'
import { replaceBar, openUnsure } from '../../music/evidence'
import { db, resetDb } from '../../store/persistence'
import { whenHistorySaved } from '../../store/song-history'
import { getSongHistory } from '../../store/persistence'
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

describe('settling a bar', () => {
  it("settling on the chart's own chords keeps the chart and records the bar as heard", () => {
    settleBar('T', 'Pre-Chorus', 5, disputed)
    expect(useStore.getState().edits.T?.sections).toBeUndefined()
    expect(useStore.getState().edits.T?.heard).toEqual({ 'Pre-Chorus': { 5: disputed } })
  })
  it('settling on another reading writes it into the chart', () => {
    settleBar('T', 'Pre-Chorus', 5, 'B G#m')
    expect(useStore.getState().getEditedSections('T')[0].chords).toBe(replaceBar(text, 5, 'B G#m'))
    expect(openUnsure(song, useStore.getState().edits.T)).toEqual([])
  })
  it('the chart before a settle is kept as an earlier version', async () => {
    settleBar('T', 'Pre-Chorus', 5, 'B G#m')
    await whenHistorySaved()
    const versions = await getSongHistory('T')
    expect(versions).toHaveLength(1)
    expect(versions[0].reason).toBe('Before your changes')
    expect(versions[0].sections[0].chords).toBe(text)
  })
  it('settles every section of that name', () => {
    settleBar('T', 'Verse', 5, 'B G#m')
    const [, a, b] = useStore.getState().getEditedSections('T')
    expect(a.chords).toBe(replaceBar(text, 5, 'B G#m'))
    expect(b.chords).toBe(a.chords)
  })
})
