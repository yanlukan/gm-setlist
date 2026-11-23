import { describe, it, expect, beforeEach, vi } from 'vitest'
import { openDB } from 'idb'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'
import { useStore } from '../../store/use-store'
import {
  db, resetDb, exportAllData, importAllData, getSongHistory, listSnapshots, getSetlistData, getSetting,
} from '../../store/persistence'
import { CRYER_SETLIST } from '../../data/songs'
import device from './fixtures/device-4.2.8.json'
import backup from './fixtures/backup-4.2.8.json'

/**
 * Switching the live app from 4.2.8 to the rework (build step 7). The iPad's
 * data must come through two ways: left where it is (same address, same
 * database), and through a backup file made by 4.2.8 and loaded into the
 * rework. device-4.2.8.json is a 4.2.8 device's database, store by store;
 * backup-4.2.8.json is what 4.2.8's own Export wrote for that device (made by
 * running main's persistence code, see docs/sessions/switch-live.md).
 */

const STORES = ['songEdits', 'setlists', 'customSongs', 'settings', 'snapshots'] as const

async function wipe() {
  resetDb()
  const d = await db()
  const tx = d.transaction([...STORES], 'readwrite')
  for (const s of STORES) await tx.objectStore(s).clear()
  await tx.done
  useStore.setState(useStore.getInitialState())
}

async function seedDevice() {
  const d = await db()
  for (const e of device.songEdits) await d.put('songEdits', e)
  await d.put('setlists', device.setlists.current, 'current')
  await d.put('customSongs', device.customSongs.all, 'all')
  for (const [k, v] of Object.entries(device.settings)) await d.put('settings', v, k)
  for (const s of device.snapshots) await d.add('snapshots', s)
}

/** Everything in the database, keys and values, to compare before and after. */
async function dump() {
  const d = await db()
  const out: Record<string, unknown> = {}
  for (const s of STORES) {
    const keys = await d.getAllKeys(s)
    out[s] = await Promise.all(keys.map(async k => [k, await d.get(s, k)]))
  }
  return out
}

const title = "I Can't Make You Love Me"

/**
 * Opening adds the Cryer Arts setlist to a device that has its own setlists
 * and opens it (5.1.2). Wait until that is on disk, so a test reads the
 * finished state and leaves no save running into the next test.
 */
const opened = () =>
  vi.waitFor(async () => {
    expect(await getSetting(`seeded:${CRYER_SETLIST.id}`)).toBe(true)
    expect((await getSetlistData())?.activeId).toBe(CRYER_SETLIST.id)
  }, { timeout: 5000, interval: 5 })

/** What the player saved, as the reworked app holds it after opening. */
function expectDeviceLoaded() {
  const s = useStore.getState()
  const edited = device.songEdits.find(e => e.title === title)!
  expect(s.edits[title].sections).toEqual(edited.sections)
  expect(s.edits[title].notes).toBe(edited.notes)
  expect(s.edits[title].form).toEqual(edited.form)
  expect(s.edits[title].shapes).toEqual({ Em11: 2, Cadd9: 'x-3-2-0-3-3' })
  expect(s.edits.Faith).toMatchObject({ bpm: 96, capo: 2, guitar: 'acoustic', transpose: -2, key: 'A' })
  expect(s.edits.Fastlove).toMatchObject({ neck: 5, shapes: { Am7: 1 } })
  expect(s.edits['Our Song'].notes).toBe("Edited note on the player's own song.")
  // The player's setlists as saved, and beside them the new running order, open
  const { [CRYER_SETLIST.id]: cryer, ...own } = s.setlistData.lists
  expect(own).toEqual(device.setlists.current.lists)
  expect(cryer).toEqual({ ...CRYER_SETLIST })
  expect(s.setlistData.activeId).toBe(CRYER_SETLIST.id)
  expect(s.customSongs.map(c => c.title)).toEqual(['Our Song'])
  expect(s.allSongs().some(song => song.title === 'Our Song')).toBe(true)
  expect(s.selectedVoicings).toEqual(device.settings.selectedVoicings)
  expect(s.ownShapes).toEqual(device.settings.ownShapes)
  expect(s.theme).toBe('light')
}

beforeEach(wipe)

describe('the place the data lives stays where 4.2.8 kept it', () => {
  it('same address, home-screen scope and database as 4.2.8', async () => {
    const vite = readFileSync('vite.config.ts', 'utf8')
    expect(vite).toMatch(/base: '\/gm-setlist\/'/)
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'))
    expect(manifest.scope).toBe('./')
    expect(manifest.start_url).toBe('./')
    await db()
    resetDb()
    const raw = await openDB('playbook')
    expect(raw.version).toBe(2)
    expect([...raw.objectStoreNames].sort()).toEqual([...STORES].sort())
    raw.close()
  })
})

describe('a 4.2.8 device opened by the reworked app, no backup used', () => {
  it('shows every saved chart, pick, setlist and setting', async () => {
    await seedDevice()
    await useStore.getState().hydrate()

    expectDeviceLoaded()
    const s = useStore.getState()
    expect(s.viewMode).toBe('stage')
    expect(s.simpleChords).toBe(true)
    expect(s.guitar).toBe('electric')
    expect(s.instrument).toBe('guitar')
    // Each setlist keeps its place; the new one opens at its first song
    expect(s.places).toEqual({ saturday: 1, default: 3 })
    expect(s.currentIndex).toBe(0)
    expect(await getSongHistory(title)).toEqual(device.settings[`history:${title}`])
    await opened()
    expect((await listSnapshots()).map(x => x.reason).sort()).toEqual(
      ['add GM Tribute — Cryer Arts', 'before import', 'switch setlist'],
    )
  })

  it('writes nothing over what 4.2.8 saved: it only adds the new setlist, behind restore points', async () => {
    await seedDevice()
    const before = await dump() as Record<string, [unknown, unknown][]>
    await useStore.getState().hydrate()
    await opened()
    const after = await dump() as Record<string, [unknown, unknown][]>

    expect(after.songEdits).toEqual(before.songEdits)
    expect(after.customSongs).toEqual(before.customSongs)
    expect(after.settings.filter(([key]) => key !== `seeded:${CRYER_SETLIST.id}`)).toEqual(before.settings)
    const lists = (await getSetlistData())!.lists
    const { [CRYER_SETLIST.id]: _added, ...own } = lists
    expect(own).toEqual(device.setlists.current.lists)
    // The restore points 4.2.8 kept are still there, and two came before the change
    expect(after.snapshots.slice(0, before.snapshots.length)).toEqual(before.snapshots)
    expect(after.snapshots).toHaveLength(before.snapshots.length + 2)
  })

  it('exports the same backup 4.2.8 exported', async () => {
    await seedDevice()
    const ours = JSON.parse(await exportAllData())
    expect({ ...ours, exportedAt: backup.exportedAt }).toEqual(backup)
  })
})

describe("a 4.2.8 backup loaded into the reworked app on an empty device", () => {
  it('brings back the charts, picks, setlists, own songs and shapes', async () => {
    await importAllData(JSON.stringify(backup))
    await useStore.getState().hydrate()
    expectDeviceLoaded()
    await opened()
  })

  it('a second import of the same file changes nothing', async () => {
    await importAllData(JSON.stringify(backup))
    const once = await dump()
    await importAllData(JSON.stringify(backup))
    expect(await dump()).toEqual(once)
  })

  it('does not carry what 4.2.8 never put in a backup: those start at their defaults', async () => {
    // Known gap of the 4.2.8 backup, written in the backup steps: the screen
    // mode, simple chords, guitar, instrument, place in each list and earlier
    // versions of a song are not in the file.
    await importAllData(JSON.stringify(backup))
    await useStore.getState().hydrate()
    const initial = useStore.getInitialState()
    const s = useStore.getState()
    expect(s.viewMode).toBe(initial.viewMode)
    expect(s.guitar).toBe(initial.guitar)
    expect(await getSongHistory(title)).toEqual([])
    await opened()
  })
})
