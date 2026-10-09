import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSetting } from '../../store/persistence'

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
