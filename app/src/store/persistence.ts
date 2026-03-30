import { openDB, type IDBPDatabase } from 'idb'
import type { Song, SongEdits, SetlistData, Theme } from '../types'

const DB_NAME = 'playbook'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function db(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('songEdits', { keyPath: 'title' })
      db.createObjectStore('setlists')
      db.createObjectStore('customSongs')
      db.createObjectStore('settings')
    },
  })
  return dbInstance
}

export function resetDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
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

export async function saveSelectedVoicings(voicings: Record<string, number>): Promise<void> {
  const d = await db()
  await d.put('settings', voicings, 'selectedVoicings')
}

export async function getSelectedVoicings(): Promise<Record<string, number> | undefined> {
  const d = await db()
  return d.get('settings', 'selectedVoicings')
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

export async function importAllData(json: string): Promise<void> {
  const backup = JSON.parse(json)
  if (!backup.version) throw new Error('Invalid backup file')

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
