// Exports every song's chart as bars and beats for the recording check (server/recording_check).
// Usage, from app/: node scripts/export-charts.mjs > ../server/recording_check/charts.json
// Node strips the types of the two imports below.
import { fileURLToPath } from 'node:url'
import { SONGS } from '../src/data/songs.ts'
import { loadAddedSongs } from './added-songs.mjs'
import { barsOf, beatsOf, hasBars, isRepeatCount, REPEAT_BAR } from '../src/music/bars.ts'

const tokensOf = line => line.split(/\s+/).filter(Boolean)
const round = x => Math.round(x * 1e6) / 1e6

/** 6/8, 9/8 and 12/8 count three eighths to a beat (server/add_song.py's COMPOUND); 3/8 is three beats. */
const COMPOUND = [6, 9, 12]

/** Beats in a bar: the top number, or top / 3 in 6/8, 9/8, 12/8 (the tempo counts dotted quarters). */
function beatsPerBar(timeSignature) {
  const [top, bottom] = (timeSignature ?? '4/4').split('/').map(Number)
  return bottom === 8 && COMPOUND.includes(top) ? top / 3 : top
}

/** The chords of a bar on its beats, as fractions of the bar. */
function slotsOf(bar) {
  const { beats, chords } = beatsOf(bar)
  return chords.map(c => ({ chord: c.token, start: round(c.start / beats), length: round(c.length / beats) }))
}

/** A section's written lines, each with its bars (as evidence.ts numbers them) and how many times it is played. */
function linesOf(chords) {
  const lines = []
  let first = 0
  for (const line of chords.split('\n')) {
    if (!hasBars(line)) continue
    const tokens = tokensOf(line)
    const bars = barsOf(tokens)
    const count = tokens.find(isRepeatCount)?.match(/\d+/)?.[0]
    lines.push({ first, count: bars.length, times: Number(count ?? 1) })
    first += bars.length
  }
  return lines
}

export function exportChart(song) {
  const sections = song.sections.map(section => {
    let before = []
    const source = song.evidence?.[section.name]
    const barSources = new Map((source?.bars ?? []).map(b => [b.bar, b.from]))
    const bars = section.chords
      .split('\n')
      .flatMap(line => (hasBars(line) ? barsOf(tokensOf(line)) : []))
      .map((bar, i) => {
        const clean = bar.filter(t => !isRepeatCount(t))
        const repeats = clean.length === 1 && clean[0] === REPEAT_BAR
        const written = repeats ? before : clean
        before = written
        return {
          bar: i,
          chords: clean.join(' '),
          slots: slotsOf(written),
          evidence: barSources.get(i) ?? null,
        }
      })
    return { name: section.name, from: source?.from ?? null, bars }
  })

  const played = []
  let skipped = null
  if (!song.form?.length) skipped = 'no song order'
  else if (song.form.some(name => !song.sections.some(s => s.name === name))) skipped = 'song order names a missing part'
  else {
    for (const name of song.form) {
      const section = song.sections.find(s => s.name === name)
      for (const line of linesOf(section.chords)) {
        for (let t = 0; t < line.times; t++) {
          for (let i = 0; i < line.count; i++) played.push({ section: name, bar: line.first + i })
        }
      }
    }
  }

  return {
    title: song.title,
    key: song.key,
    bpm: song.bpm,
    timeSignature: song.timeSignature,
    beatsPerBar: beatsPerBar(song.timeSignature),
    chordsFrom: song.chordsFrom ?? null,
    sections,
    played,
    skipped,
  }
}

/** Every shipped song and every added song that opens; an added file that does not is named on stderr and left out. */
export async function exportAll(dir) {
  const { songs, skipped } = await loadAddedSongs(dir)
  for (const { file, reason } of skipped) console.error(`export-charts: skipping ${file}: ${reason}`)
  return [...SONGS, ...songs].map(exportChart)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(await exportAll(), null, 1) + '\n')
}
