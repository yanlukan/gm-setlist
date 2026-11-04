// The songs written as JSON in src/data/added, for Node scripts (Node has no import.meta.glob).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ADDED = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'added')

/** The parsed *.json files of the folder, sorted by name; a file that is not JSON is skipped with a warning. */
export function readAddedSongs(dir = ADDED) {
  if (!existsSync(dir)) return []
  const songs = []
  for (const name of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
    try {
      songs.push(JSON.parse(readFileSync(join(dir, name), 'utf8')))
    } catch {
      console.error(`added-songs: skipping ${name}, it is not valid JSON`)
    }
  }
  return songs
}
