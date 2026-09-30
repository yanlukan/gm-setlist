import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSongHistory, getSongEdits } from '../../store/persistence'
import { whenHistorySaved, VERSION_GAP_MS } from '../../store/song-history'
import { DEFAULT_SONGS } from '../../data/songs'

const faith = DEFAULT_SONGS.find(s => s.title === 'Faith')!
const start = new Date('2026-09-30T12:00:00Z').getTime()

/** Faith with its verse changed. */
const withVerse = (chords: string) => faith.sections.map((s, i) => (i === 1 ? { ...s, chords } : s))

beforeEach(async () => {
  await whenHistorySaved() // anything a test before this one left to write
  // Only the clock is faked: the database must keep running
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(start)
  useStore.setState(useStore.getInitialState())
  resetDb()
  const d = await db()
  await d.clear('settings')
  await d.clear('songEdits')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('earlier versions', () => {
  it('keeps the built-in chart before the first change to a song', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    await whenHistorySaved()
    const versions = await getSongHistory('Faith')
    expect(versions).toHaveLength(1)
    expect(versions[0].reason).toBe('Before your changes')
    expect(versions[0].sections).toEqual(faith.sections)
    expect(versions[0].notes).toBe(faith.notes)
  })

  it('keeps the notes as they were when the notes change', async () => {
    useStore.getState().saveNotes('Faith', 'Watch the pause')
    await whenHistorySaved()
    const [version] = await getSongHistory('Faith')
    expect(version.notes).toBe(faith.notes)
  })

  it('keeps one version for a burst of changes', async () => {
    const { saveSections } = useStore.getState()
    saveSections('Faith', withVerse('B  A'))
    saveSections('Faith', withVerse('B  A  D'))
    saveSections('Faith', withVerse('B  A  D  E'))
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toHaveLength(1)
  })

  it('keeps another one for a change made a while later: the chart as it then was', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    vi.setSystemTime(start + VERSION_GAP_MS + 1000)
    useStore.getState().saveSections('Faith', withVerse('B  A  D'))
    await whenHistorySaved()
    const versions = await getSongHistory('Faith')
    expect(versions.map(v => v.sections[1].chords)).toEqual(['B  A', faith.sections[1].chords])
  })

  it('keeps a version when going back to the built-in chart too', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    vi.setSystemTime(start + VERSION_GAP_MS + 1000)
    useStore.getState().saveSections('Faith', faith.sections.map(s => ({ ...s })))
    await whenHistorySaved()
    expect((await getSongHistory('Faith'))[0].sections[1].chords).toBe('B  A')
  })

  it('does not keep anything when nothing changed', async () => {
    useStore.getState().saveSections('Faith', faith.sections.map(s => ({ ...s })))
    useStore.getState().saveNotes('Faith', faith.notes)
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toEqual([])
  })
})

describe('Reset', () => {
  it('keeps your chart first, so it is not the end of it', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    vi.setSystemTime(start + 1000)
    useStore.getState().resetEdits('Faith')
    await whenHistorySaved()
    const [newest] = await getSongHistory('Faith')
    expect(newest.reason).toBe('Before you reset it')
    expect(newest.sections[1].chords).toBe('B  A')
    expect(useStore.getState().getEditedSections('Faith')).toEqual(faith.sections)
  })

  it('keeps nothing when there was nothing of yours to lose', async () => {
    useStore.getState().setTranspose('Faith', -2)
    useStore.getState().resetEdits('Faith')
    await whenHistorySaved()
    expect(await getSongHistory('Faith')).toEqual([])
  })
})

describe('going back to an earlier version', () => {
  it('brings its chords back, and keeps the chart it replaces', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    vi.setSystemTime(start + VERSION_GAP_MS + 1000)
    useStore.getState().saveSections('Faith', withVerse('B  A  D'))
    await whenHistorySaved()
    const versions = await getSongHistory('Faith')
    const earlier = versions.find(v => v.sections[1].chords === 'B  A')!

    vi.setSystemTime(start + VERSION_GAP_MS + 2000)
    useStore.getState().restoreVersion('Faith', earlier)
    await whenHistorySaved()

    expect(useStore.getState().getEditedSections('Faith')[1].chords).toBe('B  A')
    const [newest] = await getSongHistory('Faith')
    expect(newest.reason).toBe('Before you went back to an earlier version')
    expect(newest.sections[1].chords).toBe('B  A  D')
  })

  it('leaves the song on the built-in chart when that is the version brought back', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    await whenHistorySaved()
    const [builtIn] = await getSongHistory('Faith')
    vi.setSystemTime(start + 1000)
    useStore.getState().restoreVersion('Faith', builtIn)
    await whenHistorySaved()
    expect(useStore.getState().edits['Faith']).toBeUndefined()
    await vi.waitFor(async () => expect(await getSongEdits('Faith')).toBeUndefined())
  })

  it('brings the notes back too', async () => {
    useStore.getState().saveNotes('Faith', 'First notes')
    vi.setSystemTime(start + VERSION_GAP_MS + 1000)
    useStore.getState().saveNotes('Faith', 'Second notes')
    await whenHistorySaved()
    const versions = await getSongHistory('Faith')
    const first = versions.find(v => v.notes === 'First notes')!
    useStore.getState().restoreVersion('Faith', first)
    expect(useStore.getState().getEditedNotes('Faith')).toBe('First notes')
  })
})

describe('notes going back to the built-in ones', () => {
  it('are not an edit any more, so the song follows later note fixes', () => {
    useStore.getState().saveNotes('Faith', 'Mine')
    expect(useStore.getState().edits['Faith']).toBeDefined()
    useStore.getState().saveNotes('Faith', faith.notes)
    expect(useStore.getState().edits['Faith']).toBeUndefined()
  })
})

describe('whether your edits are safe', () => {
  it('says saving at once, then saved once written', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    expect(useStore.getState().saveStatus).toBe('saving')
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('saved'))
    expect((await getSongEdits('Faith'))?.sections?.[1].chords).toBe('B  A')
  })

  it('says not saved when the write fails, and saved again once a write works', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetDb()
    const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('storage is full') })
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('failed'))

    open.mockRestore()
    resetDb()
    useStore.getState().saveSections('Faith', withVerse('B  A  D'))
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('saved'))
  })

  it('does not say saved for one song while another song failed to save', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetDb()
    const open = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('storage is full') })
    useStore.getState().saveSections('Faith', withVerse('B  A'))
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('failed'))
    open.mockRestore()
    resetDb()
    useStore.getState().saveNotes('Roxanne', 'A note')
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('failed')) // Faith is still not saved
    useStore.getState().saveSections('Faith', withVerse('B  A  D'))
    await vi.waitFor(() => expect(useStore.getState().saveStatus).toBe('saved'))
  })
})

describe('going back to the built-in chart', () => {
  it('shows the built-in chords again and keeps what else you saved', async () => {
    useStore.getState().saveNotes('Faith', 'Mine')
    useStore.getState().saveBpm('Faith', 101)
    useStore.getState().saveSections('Faith', withVerse('B  DE'))
    useStore.getState().useBuiltInChart('Faith')
    expect(useStore.getState().getEditedSections('Faith')).toEqual(faith.sections)
    expect(useStore.getState().edits['Faith']).toEqual({ notes: 'Mine', bpm: 101 })
  })

  it('keeps the chords you had as an earlier version first', async () => {
    useStore.getState().saveSections('Faith', withVerse('B  DE'))
    vi.setSystemTime(start + 1000)
    useStore.getState().useBuiltInChart('Faith')
    await whenHistorySaved()
    const [newest] = await getSongHistory('Faith')
    expect(newest.reason).toBe('Before you went back to the built-in chart')
    expect(newest.sections[1].chords).toBe('B  DE')
  })

  it('does nothing for a song with no chords of its own saved', async () => {
    useStore.getState().saveNotes('Faith', 'Mine')
    useStore.getState().useBuiltInChart('Faith')
    await whenHistorySaved()
    expect(useStore.getState().edits['Faith']).toEqual({ notes: 'Mine' })
  })
})
