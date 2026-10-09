import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '../../store/use-store'
import { db, resetDb, getSetting } from '../../store/persistence'
import { ownShapesFor, setOwnShapes, shapeText, voicingsFor } from '../../music/voicings'

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
  setOwnShapes({})
})

const toLand = (check: () => Promise<void>) => vi.waitFor(check, { timeout: 5000, interval: 5 })

describe('your own shapes', () => {
  it('are kept, drawn for the chord, and remembered across a relaunch', async () => {
    useStore.getState().addOwnShape('Em11', 'x-x-2-2-3-5')
    expect(useStore.getState().ownShapes).toEqual({ Em11: ['x-x-2-2-3-5'] })
    expect(ownShapesFor('Em11')).toEqual(['x-x-2-2-3-5'])
    expect(voicingsFor('Em11').map(shapeText)).toContain('x-x-2-2-3-5')
    await toLand(async () => expect(await getSetting('ownShapes')).toEqual({ Em11: ['x-x-2-2-3-5'] }))

    useStore.setState(useStore.getInitialState())
    setOwnShapes({})
    expect(voicingsFor('Em11').map(shapeText)).not.toContain('x-x-2-2-3-5')
    await useStore.getState().hydrate()
    expect(useStore.getState().ownShapes).toEqual({ Em11: ['x-x-2-2-3-5'] })
    expect(voicingsFor('Em11').map(shapeText)).toContain('x-x-2-2-3-5')
  })

  it('are tidied, not kept twice, and not kept when they cannot be read', () => {
    const { addOwnShape } = useStore.getState()
    addOwnShape('Em11', 'X X 2 2 3 5')
    addOwnShape('Em11', 'x-x-2-2-3-5')
    addOwnShape('Em11', 'x-x-2')
    addOwnShape('Zz', 'x-x-2-2-3-5')
    expect(useStore.getState().ownShapes).toEqual({ Em11: ['x-x-2-2-3-5'] })
  })

  it('can be taken away again, which empties the chord\'s entry', async () => {
    useStore.getState().addOwnShape('Em11', 'x-x-2-2-3-5')
    useStore.getState().addOwnShape('Em11', 'x-x-7-7-10-x')
    useStore.getState().removeOwnShape('Em11', 'x-x-2-2-3-5')
    expect(useStore.getState().ownShapes).toEqual({ Em11: ['x-x-7-7-10-x'] })
    useStore.getState().removeOwnShape('Em11', 'x-x-7-7-10-x')
    expect(useStore.getState().ownShapes).toEqual({})
    expect(ownShapesFor('Em11')).toEqual([])
    await toLand(async () => expect(await getSetting('ownShapes')).toEqual({}))
  })
})
