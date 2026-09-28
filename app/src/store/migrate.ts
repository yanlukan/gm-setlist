import type { Song, SongEdits, SetlistData } from '../types'
import * as persistence from './persistence'
import { DEFAULT_SONGS } from '../data/songs'

const FLAG = 'playbook-migrated-to-idb'

function parse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined // one damaged old record must not stop the rest
  }
}

/**
 * One-time move of data saved by the old (pre-React) app in localStorage.
 *
 * It only ever fills in what the new app does not have yet — it never
 * replaces existing setlists, songs or edits. The previous version wrote the
 * old copy over the new data unconditionally and only marked itself done
 * after fully succeeding, so a single unreadable old record made it run on
 * every launch, each time overwriting current setlists with the stale copy.
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  if (localStorage.getItem(FLAG)) return false
  // Marked up front: this must never become an every-launch job.
  localStorage.setItem(FLAG, '1')

  const customSongs = parse<Song[]>(localStorage.getItem('cheatsheet-songs-custom'))
  const validCustom = Array.isArray(customSongs)
    ? customSongs.filter(s => s && typeof s.title === 'string' && Array.isArray(s.sections))
    : []
  if (validCustom.length > 0 && (await persistence.getCustomSongs()).length === 0) {
    await persistence.saveCustomSongs(validCustom)
  }

  const setlists = parse<SetlistData>(localStorage.getItem('cheatsheet-setlists'))
  if (
    setlists &&
    !(await persistence.getSetlistData()) &&
    persistence.validateBackup({ version: 1, setlists }) === null
  ) {
    await persistence.saveSetlistData(setlists)
  }

  for (const song of [...DEFAULT_SONGS, ...validCustom]) {
    if (await persistence.getSongEdits(song.title)) continue
    const edits: SongEdits = {}
    const sections = parse<SongEdits['sections']>(localStorage.getItem('cheatsheet-sections-' + song.title))
    if (Array.isArray(sections)) edits.sections = sections
    const notes = localStorage.getItem('cheatsheet-notes-' + song.title)
    if (notes) edits.notes = notes
    const key = localStorage.getItem('cheatsheet-key-' + song.title)
    if (key) edits.key = key
    const bpm = parseInt(localStorage.getItem('cheatsheet-bpm-' + song.title) ?? '', 10)
    if (Number.isFinite(bpm)) edits.bpm = bpm
    if (Object.keys(edits).length > 0) await persistence.saveSongEdits(song.title, edits)
  }

  const theme = localStorage.getItem('cheatsheet-theme')
  if ((theme === 'light' || theme === 'dark') && !(await persistence.getTheme())) {
    await persistence.saveTheme(theme)
  }
  return true
}
