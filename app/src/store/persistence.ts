import { openDB, type IDBPDatabase } from 'idb'
import type { Song, SongEdits, SetlistData, Snapshot, Theme } from '../types'

const DB_NAME = 'playbook'
const DB_VERSION = 2
/** How many auto-snapshots to keep. Roughly a week of heavy editing. */
const MAX_SNAPSHOTS = 30

let dbPromise: Promise<IDBPDatabase> | null = null

export function db(): Promise<IDBPDatabase> {
  // Cache the PROMISE, not the resolved value: concurrent callers during the
  // first open would otherwise each start their own openDB and race.
  if (dbPromise) return dbPromise
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('songEdits', { keyPath: 'title' })
        db.createObjectStore('setlists')
        db.createObjectStore('customSongs')
        db.createObjectStore('settings')
      }
      if (oldVersion < 2) {
        db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true })
      }
    },
  })
  return dbPromise
}

export function resetDb(): void {
  const pending = dbPromise
  dbPromise = null
  if (pending) pending.then(d => d.close()).catch(() => {})
}

export async function saveSongEdits(title: string, edits: SongEdits): Promise<void> {
  const d = await db()
  await d.put('songEdits', { title, ...edits })
}

export async function getSongEdits(title: string): Promise<SongEdits | undefined> {
  const d = await db()
  const result = await d.get('songEdits', title)
  if (!result) return undefined
  const { title: _, ...edits } = result
  return edits as SongEdits
}

export async function deleteSongEdits(title: string): Promise<void> {
  const d = await db()
  await d.delete('songEdits', title)
}

export async function saveSetlistData(data: SetlistData): Promise<void> {
  const d = await db()
  await d.put('setlists', data, 'current')
}

export async function getSetlistData(): Promise<SetlistData | undefined> {
  const d = await db()
  return d.get('setlists', 'current')
}

export async function saveCustomSongs(songs: Song[]): Promise<void> {
  const d = await db()
  await d.put('customSongs', songs, 'all')
}

export async function getCustomSongs(): Promise<Song[]> {
  const d = await db()
  return (await d.get('customSongs', 'all')) ?? []
}

export async function saveTheme(theme: Theme): Promise<void> {
  const d = await db()
  await d.put('settings', theme, 'theme')
}

export async function getTheme(): Promise<Theme | undefined> {
  const d = await db()
  return d.get('settings', 'theme')
}

/** Small UI preferences that should survive a relaunch. */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const d = await db()
  await d.put('settings', value, key)
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const d = await db()
  return d.get('settings', key)
}

export async function saveDiagramsVisible(visible: boolean): Promise<void> {
  const d = await db()
  await d.put('settings', visible, 'diagramsVisible')
}

export async function getDiagramsVisible(): Promise<boolean | undefined> {
  const d = await db()
  return d.get('settings', 'diagramsVisible')
}

export async function saveSelectedVoicings(voicings: Record<string, number>): Promise<void> {
  const d = await db()
  await d.put('settings', voicings, 'selectedVoicings')
}

export async function getSelectedVoicings(): Promise<Record<string, number> | undefined> {
  const d = await db()
  return d.get('settings', 'selectedVoicings')
}

// ---- Automatic snapshots ----
//
// Every setlist change writes a snapshot first. Setlists are the thing that
// took hours to build and the thing that was lost at the gig, so they get a
// rolling undo history that survives reloads and bad edits.

export async function takeSnapshot(
  reason: string,
  /**
   * The setlists to record. Pass the state held in memory BEFORE the change:
   * reading it back from disk misses changes that have not been flushed yet,
   * which would silently store a snapshot that restores to the wrong thing.
   */
  setlistsOverride?: SetlistData,
): Promise<void> {
  try {
    const payload =
      setlistsOverride === undefined
        ? await exportAllData()
        : JSON.stringify({
            ...JSON.parse(await exportAllData()),
            setlists: setlistsOverride,
          })
    const d = await db()
    await d.add('snapshots', { at: new Date().toISOString(), reason, payload })
    // Trim oldest beyond MAX_SNAPSHOTS
    const keys = await d.getAllKeys('snapshots')
    if (keys.length > MAX_SNAPSHOTS) {
      const tx = d.transaction('snapshots', 'readwrite')
      for (const k of keys.slice(0, keys.length - MAX_SNAPSHOTS)) {
        await tx.store.delete(k)
      }
      await tx.done
    }
  } catch (e) {
    // A snapshot must never break the write it was protecting.
    console.warn('Snapshot failed:', e)
  }
}

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const d = await db()
    const all = (await d.getAll('snapshots')) as Snapshot[]
    return all.sort((a, b) => b.id - a.id)
  } catch {
    return []
  }
}

export async function restoreSnapshot(id: number): Promise<void> {
  const d = await db()
  const snap = (await d.get('snapshots', id)) as Snapshot | undefined
  if (!snap) throw new Error('Snapshot not found')
  // Snapshot the current state first, so restoring is itself undoable.
  await takeSnapshot('before restore')
  await importAllData(snap.payload)
}

// ---- Export / Import all data ----

export async function exportAllData(): Promise<string> {
  const d = await db()
  const allEdits = await d.getAll('songEdits')
  const setlists = await d.get('setlists', 'current')
  const customSongs = await d.get('customSongs', 'all')
  const theme = await d.get('settings', 'theme')
  const voicings = await d.get('settings', 'selectedVoicings')

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    songEdits: allEdits ?? [],
    setlists: setlists ?? null,
    customSongs: customSongs ?? [],
    theme: theme ?? null,
    selectedVoicings: voicings ?? null,
  }
  return JSON.stringify(backup, null, 2)
}

/**
 * Checks a backup's shape before anything is written, so a wrong or damaged
 * file is refused outright instead of half-replacing the user's data.
 * Returns a message to show, or null if the file is usable.
 */
export function validateBackup(backup: any): string | null {
  const notABackup = 'This is not a PlayBook backup file.'
  if (!backup || typeof backup !== 'object' || typeof backup.version !== 'number') return notABackup

  if (backup.songEdits !== undefined) {
    if (!Array.isArray(backup.songEdits)) return 'The backup file is damaged (song edits).'
    if (backup.songEdits.some((e: { title?: unknown } | null) => !e || typeof e.title !== 'string')) {
      return 'The backup file is damaged (song edits).'
    }
  }

  if (backup.setlists != null) {
    const { lists, activeId } = backup.setlists
    if (!lists || typeof lists !== 'object' || typeof activeId !== 'string' || !(activeId in lists)) {
      return 'The backup file is damaged (setlists).'
    }
    for (const list of Object.values(lists) as { name?: unknown; songTitles?: unknown }[]) {
      if (!list || typeof list.name !== 'string' || !Array.isArray(list.songTitles)
        || list.songTitles.some(t => typeof t !== 'string')) {
        return 'The backup file is damaged (setlists).'
      }
    }
  }

  if (backup.customSongs !== undefined) {
    if (!Array.isArray(backup.customSongs)) return 'The backup file is damaged (songs).'
    if (backup.customSongs.some((song: { title?: unknown; sections?: unknown } | null) =>
      !song || typeof song.title !== 'string' || !Array.isArray(song.sections))) {
      return 'The backup file is damaged (songs).'
    }
  }
  return null
}

export async function importAllData(json: string): Promise<void> {
  let backup
  try {
    backup = JSON.parse(json)
  } catch {
    throw new Error('This is not a PlayBook backup file.')
  }
  const problem = validateBackup(backup)
  if (problem) throw new Error(problem)

  const d = await db()

  // Song edits
  if (Array.isArray(backup.songEdits)) {
    const tx = d.transaction('songEdits', 'readwrite')
    await tx.objectStore('songEdits').clear()
    for (const edit of backup.songEdits) {
      await tx.objectStore('songEdits').put(edit)
    }
    await tx.done
  }

  // Setlists
  if (backup.setlists) {
    await d.put('setlists', backup.setlists, 'current')
  }

  // Custom songs
  if (Array.isArray(backup.customSongs)) {
    await d.put('customSongs', backup.customSongs, 'all')
  }

  // Theme
  if (backup.theme) {
    await d.put('settings', backup.theme, 'theme')
  }

  // Voicings
  if (backup.selectedVoicings) {
    await d.put('settings', backup.selectedVoicings, 'selectedVoicings')
  }
}
