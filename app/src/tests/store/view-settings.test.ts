import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSetting } from '../../store/persistence'
import { shapesShown } from '../../store/view-settings'

beforeEach(async () => {
  resetDb()
  const database = await db()
  const tx = database.transaction(['songEdits', 'setlists', 'customSongs', 'settings', 'snapshots'], 'readwrite')
  await tx.objectStore('songEdits').clear()
  await tx.objectStore('setlists').clear()
  await tx.objectStore('customSongs').clear()
  await tx.objectStore('settings').clear()
  await tx.objectStore('snapshots').clear()
  await tx.done
  useStore.setState(useStore.getInitialState())
})

const toLand = (check: () => Promise<void>) => vi.waitFor(check, { timeout: 5000, interval: 5 })

describe('instrument', () => {
  it('is the guitar until the player says otherwise', () => {
    expect(useStore.getState().instrument).toBe('guitar')
  })

  it('remembers the keyboard across a relaunch', async () => {
    useStore.getState().setInstrument('keyboard')
    expect(useStore.getState().instrument).toBe('keyboard')
    await toLand(async () => expect(await getSetting('instrument')).toBe('keyboard'))

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()
    expect(useStore.getState().instrument).toBe('keyboard')
  })

  it('ignores a saved value that is not an instrument', async () => {
    const database = await db()
    await database.put('settings', 'banjo', 'instrument')
    await useStore.getState().hydrate()
    expect(useStore.getState().instrument).toBe('guitar')
  })
})

describe('the shapes strip on stage', () => {
  it('starts closed on stage, and the usual setting stays as it was', () => {
    useStore.setState({ viewMode: 'stage' })
    expect(shapesShown(useStore.getState())).toBe(false)
    expect(useStore.getState().diagramsVisible).toBe(true)
  })

  it('is opened on stage on its own, and saved', async () => {
    useStore.setState({ viewMode: 'stage' })
    useStore.getState().toggleDiagrams()
    expect(shapesShown(useStore.getState())).toBe(true)
    expect(useStore.getState().diagramsVisible).toBe(true)
    await toLand(async () => expect(await getSetting('stageDiagramsVisible')).toBe(true))
  })

  it('is still open after a relaunch', async () => {
    useStore.setState({ viewMode: 'stage' })
    useStore.getState().toggleDiagrams()
    await toLand(async () => expect(await getSetting('stageDiagramsVisible')).toBe(true))

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()
    expect(useStore.getState().stageDiagramsVisible).toBe(true)
  })

  it('ignores a saved value that is not yes or no', async () => {
    const database = await db()
    await database.put('settings', 'yes', 'stageDiagramsVisible')
    await useStore.getState().hydrate()
    expect(useStore.getState().stageDiagramsVisible).toBe(false)
  })
})
