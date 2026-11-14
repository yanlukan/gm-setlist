// The songs written as JSON in src/data/added, for Node scripts (Node has no import.meta.glob).
// The app's own rules decide which open (src/data/added-songs.ts, loaded the way Vite loads it).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const ADDED = join(APP, 'src', 'data', 'added')

/** The songs the app opens from the folder's *.json files, by file name, and the files it skips with why:
 *  { songs, skipped: [{ file, reason }] }. */
export async function loadAddedSongs(dir = ADDED) {
  if (!existsSync(dir)) return { songs: [], skipped: [] }
  const files = {}
  const unread = []
  for (const name of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
    try {
      files[name] = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    } catch {
      unread.push({ file: name, reason: 'not valid JSON' })
    }
  }
  const { module } = await runnerImport(join(APP, 'src', 'data', 'added-songs.ts'), { root: APP, configFile: false, logLevel: 'silent' })
  const { songs, skipped } = module.addedSongsReport(files, module.SHIPPED_SONGS)
  return { songs, skipped: [...unread, ...skipped].sort((a, b) => a.file.localeCompare(b.file)) }
}
