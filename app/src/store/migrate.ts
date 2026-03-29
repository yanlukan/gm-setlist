import type { Song, SongEdits, SetlistData } from '../types'
import * as persistence from './persistence'
import { DEFAULT_SONGS } from '../data/songs'

export async function migrateFromLocalStorage(): Promise<boolean> {
  const migrated = localStorage.getItem('playbook-migrated-to-idb')
  if (migrated) return false

  // Migrate custom songs
  const customRaw = localStorage.getItem('cheatsheet-songs-custom')
  if (customRaw) {
    const customSongs: Song[] = JSON.parse(customRaw)
    await persistence.saveCustomSongs(customSongs)
  }

  // Migrate setlist data
  const setlistRaw = localStorage.getItem('cheatsheet-setlists')
  if (setlistRaw) {
    const data: SetlistData = JSON.parse(setlistRaw)
    await persistence.saveSetlistData(data)
  }

  // Migrate per-song edits
  const allSongs = [...DEFAULT_SONGS, ...(customRaw ? JSON.parse(customRaw) : [])]
  for (const song of allSongs) {
    const edits: SongEdits = {}
    const sections = localStorage.getItem('cheatsheet-sections-' + song.title)
    if (sections) edits.sections = JSON.parse(sections)
    const notes = localStorage.getItem('cheatsheet-notes-' + song.title)
    if (notes) edits.notes = notes
    const key = localStorage.getItem('cheatsheet-key-' + song.title)
    if (key) edits.key = key
    const bpm = localStorage.getItem('cheatsheet-bpm-' + song.title)
    if (bpm) edits.bpm = parseInt(bpm)

    if (Object.keys(edits).length > 0) {
      await persistence.saveSongEdits(song.title, edits)
    }
  }

  // Migrate theme
  const theme = localStorage.getItem('cheatsheet-theme')
  if (theme === 'light' || theme === 'dark') {
    await persistence.saveTheme(theme)
  }

  localStorage.setItem('playbook-migrated-to-idb', '1')
  return true
}
