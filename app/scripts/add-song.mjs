// The one way in for a new song: a recording, and a trusted chart if there is one, to one song file.
// Usage, from app/:
//   node scripts/add-song.mjs --title "T" --artist "A" --recording <file> [--chart <file>]
//     [--key K] [--bpm N] [--time 3/4] [--out <dir>] [--python <path>]
// It reads the chart (src/music/chart-text-import.ts), asks server/add_song.py to read the recording,
// and writes <out>/<slug>.json (default src/data/added). See server/recording_check/README.md.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { runnerImport } from 'vite'
import { exportChart } from './export-charts.mjs'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = dirname(APP)

class Refusal extends Error {}
const refuse = message => { throw new Refusal(message) }

/** An app module, loaded the way Vite loads it (extensionless imports, JSON, import.meta.glob). */
async function appModule(path) {
  const { module } = await runnerImport(join(APP, path), { root: APP, configFile: false, logLevel: 'silent' })
  return module
}

/** $ADD_SONG_PYTHON, else the main checkout's venv beside this worktree, else python3. */
function defaultPython() {
  if (process.env.ADD_SONG_PYTHON) return process.env.ADD_SONG_PYTHON
  const venv = join(dirname(REPO), 'cheetsheetForGuitarPlaying', 'server', '.venv', 'bin', 'python')
  return existsSync(venv) ? venv : 'python3'
}

function options(argv) {
  const { values } = parseArgs({
    args: argv,
    options: Object.fromEntries(['title', 'artist', 'recording', 'chart', 'key', 'bpm', 'time', 'out', 'python'].map(n => [n, { type: 'string' }])),
  })
  for (const need of ['title', 'artist', 'recording']) if (!values[need]?.trim()) refuse(`--${need} is needed`)
  if (values.bpm !== undefined && !(Number(values.bpm) > 0)) refuse(`--bpm ${values.bpm} is not a tempo`)
  if (values.time !== undefined && !/^\d+\/\d+$/.test(values.time)) refuse(`--time ${values.time} is not a time signature`)
  return { ...values, title: values.title.trim(), artist: values.artist.trim() }
}

/** The request for add_song.py: route chart (barred), words (chord lines) or record (no chart). */
function request(opts, draft) {
  const key = opts.key ?? draft?.key
  const bpm = opts.bpm !== undefined ? Number(opts.bpm) : draft?.bpm
  const timeSignature = opts.time ?? draft?.timeSignature
  const req = { title: opts.title, recording: resolve(opts.recording) }
  if (timeSignature) req.timeSignature = timeSignature
  if (key) req.key = key
  if (bpm) req.bpm = bpm
  if (draft?.barred) {
    const draftSong = {
      title: opts.title, artist: opts.artist, key: key ?? '', bpm: bpm ?? 0, timeSignature: timeSignature ?? '4/4',
      capo: null, notes: '', sections: draft.sections, form: draft.form, chordsFrom: 'Chart',
    }
    const chart = exportChart(draftSong)
    if (!key) delete chart.key   // left for the record
    if (!bpm) delete chart.bpm
    req.chart = chart
  } else if (draft) req.chordLines = draft.chordLines
  return req
}

/** add_song.py's answer; its stderr goes straight to the terminal. */
function ask(python, req) {
  const run = spawnSync(python, [join(REPO, 'server', 'add_song.py')], {
    input: JSON.stringify(req), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  })
  if (run.error) refuse(`cannot run ${basename(python)} (${run.error.code ?? run.error.message})`)
  if (run.status !== 0) refuse(`add_song.py stopped (exit ${run.status ?? run.signal}), nothing written`)
  try {
    return JSON.parse(run.stdout)
  } catch {
    refuse('add_song.py did not answer with JSON, nothing written')
  }
}

export async function main(argv = process.argv.slice(2)) {
  const opts = options(argv)
  const { SONGS } = await appModule('src/data/songs.ts')
  if (SONGS.some(s => s.title === opts.title)) refuse(`"${opts.title}" is already in the library`)
  if (!existsSync(opts.recording)) refuse(`no recording at ${basename(opts.recording)}`)

  const { readChartText } = await appModule('src/music/chart-text-import.ts')
  let draft = null
  if (opts.chart) {
    if (!existsSync(opts.chart)) refuse(`no chart at ${basename(opts.chart)}`)
    draft = readChartText(readFileSync(opts.chart, 'utf8'))
    if (draft.sections.length === 0 || draft.chordLines.length === 0) refuse('the chart has no sections with chords')
  }

  const req = request(opts, draft)
  const answer = ask(opts.python ?? defaultPython(), req)
  const { addedSong, answerProblem, songFileName } = await appModule('src/music/added-song.ts')
  const problem = answerProblem(answer)
  if (problem) refuse(`a malformed answer: ${problem}, nothing written`)
  const expected = req.chart ? 'chart' : req.chordLines ? 'words' : 'record'
  if (answer.route !== expected) refuse(`a malformed answer: route ${answer.route}, expected ${expected}, nothing written`)

  const song = addedSong({ title: opts.title, artist: opts.artist, draft }, answer)
  const { isAddedSong } = await appModule('src/data/added-songs.ts')
  if (!isAddedSong(song)) refuse('the song would not open in the app, nothing written')
  const { openUnsure } = await appModule('src/music/evidence.ts')

  const out = resolve(opts.out ?? join(APP, 'src', 'data', 'added'))
  mkdirSync(out, { recursive: true })
  const file = join(out, songFileName(opts.title))
  writeFileSync(file, JSON.stringify(song, null, 2) + '\n')
  console.log(`Wrote ${file}`)
  console.log(`${openUnsure(song, undefined).length} unsure bars (route ${answer.route})`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`add-song: ${error instanceof Refusal ? error.message : error?.message ?? error}`)
    process.exit(1)
  })
}
