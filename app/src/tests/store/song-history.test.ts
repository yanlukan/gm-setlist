import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db, resetDb, getSongHistory } from '../../store/persistence'
import { keepVersion, whenHistorySaved, VERSIONS_KEPT, VERSION_GAP_MS } from '../../store/song-history'

const chart = (chords: string) => ({ sections: [{ name: 'Verse', chords }], notes: '' })
const start = new Date('2026-09-30T12:00:00Z').getTime()

beforeEach(async () => {
  // Only the clock is faked: the database must keep running
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(start)
  resetDb()
  const d = await db()
  await d.clear('settings')
})
afterEach(() => {
  vi.useRealTimers()
})

describe('earlier versions of a song', () => {
  it('keeps a version with when and why', async () => {
    keepVersion('Faith', chart('B  E'), 'Before your changes')
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toEqual([
      { at: start, reason: 'Before your changes', sections: [{ name: 'Verse', chords: 'B  E' }], notes: '' },
    ])
  })

  it('does not keep another while you are still in the same burst of changes', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    vi.setSystemTime(start + VERSION_GAP_MS - 1000)
    keepVersion('Faith', chart('B  E'), 'Before your changes')
    await whenHistorySaved()
    expect((await getSongHistory('Faith')).map(v => v.sections[0].chords)).toEqual(['B'])
  })

  it('keeps the next one once enough time has passed, newest first', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    vi.setSystemTime(start + VERSION_GAP_MS + 1000)
    keepVersion('Faith', chart('B  E'), 'Before your changes')
    await whenHistorySaved()
    expect((await getSongHistory('Faith')).map(v => v.sections[0].chords)).toEqual(['B  E', 'B'])
  })

  it('keeps one whenever asked to, however soon', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    keepVersion('Faith', chart('B  E'), 'Before you reset it', true)
    await whenHistorySaved()
    expect((await getSongHistory('Faith')).map(v => v.reason)).toEqual(['Before you reset it', 'Before your changes'])
  })

  it('never keeps the same chart twice in a row', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    vi.setSystemTime(start + VERSION_GAP_MS * 3)
    keepVersion('Faith', chart('B'), 'Before your changes')
    keepVersion('Faith', chart('B'), 'Before you reset it', true)
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toHaveLength(1)
  })

  it('keeps the notes of each version with it', async () => {
    keepVersion('Faith', { sections: [{ name: 'Verse', chords: 'B' }], notes: 'Watch the pause' }, 'Before your changes')
    await whenHistorySaved()
    expect((await getSongHistory('Faith'))[0].notes).toBe('Watch the pause')
  })

  it(`keeps the newest ${VERSIONS_KEPT} and lets the oldest go`, async () => {
    for (let i = 0; i < VERSIONS_KEPT + 5; i++) {
      vi.setSystemTime(start + (i + 1) * (VERSION_GAP_MS + 1000))
      keepVersion('Faith', chart(`B${i}`), 'Before your changes')
    }
    await whenHistorySaved()
    const kept = await getSongHistory('Faith')
    expect(kept).toHaveLength(VERSIONS_KEPT)
    expect(kept[0].sections[0].chords).toBe(`B${VERSIONS_KEPT + 4}`)
    expect(kept[VERSIONS_KEPT - 1].sections[0].chords).toBe('B5')
  })

  it('is kept for each song on its own', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    keepVersion('Roxanne', chart('Bm'), 'Before your changes')
    await whenHistorySaved()
    expect((await getSongHistory('Faith'))[0].sections[0].chords).toBe('B')
    expect((await getSongHistory('Roxanne'))[0].sections[0].chords).toBe('Bm')
    expect(await getSongHistory('Amazing')).toEqual([])
  })

  it('is still there after the app is closed and opened again', async () => {
    keepVersion('Faith', chart('B  E'), 'Before your changes')
    await whenHistorySaved()
    resetDb()
    expect((await getSongHistory('Faith'))[0].sections[0].chords).toBe('B  E')
  })

  it('two changes at once still keep one version', async () => {
    keepVersion('Faith', chart('B'), 'Before your changes')
    keepVersion('Faith', chart('B  E'), 'Before your changes')
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toHaveLength(1)
  })
})
