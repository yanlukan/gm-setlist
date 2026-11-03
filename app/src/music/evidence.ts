import { barsOf, hasBars, isRepeatCount, BAR, REPEAT_BAR } from './bars'
import type { BarEvidence, Song, SongEdits, Source } from '../types'

/** The words for each source, as More shows them. */
export const SOURCE_LABEL: Record<Source, string> = {
  Ear: 'By ear',
  Book: 'Songbook',
  Record: 'The recording',
  Chart: 'A published chart',
  Unsure: 'Unsure',
}

const tokensOf = (line: string) => line.split(/\s+/).filter(Boolean)

/** A section's bars in reading order, across every line written in bars. */
export function barsOfSection(chords: string): string[][] {
  return chords.split('\n').flatMap(line => (hasBars(line) ? barsOf(tokensOf(line)) : []))
}

/** A bar's chords without repeat counts, one space apart. */
export function barChords(bar: string[]): string {
  return bar.filter(t => !isRepeatCount(t)).join(' ')
}

/** Which bar each token of a line belongs to (-1 for bar lines), numbered like barsOf. */
function barIndexes(tokens: string[]): number[] {
  const out: number[] = []
  let count = 0
  let open = false
  for (const token of tokens) {
    if (token === BAR) {
      if (open) count++
      open = false
      out.push(-1)
    } else if (token === REPEAT_BAR) {
      if (open) count++
      open = false
      out.push(count++)
    } else if (isRepeatCount(token) && !open && count > 0) out.push(count - 1)
    else {
      open = true
      out.push(count)
    }
  }
  return out
}

/**
 * The section text with one bar's chords replaced. Its repeat count stays;
 * the line holding it is rewritten with two spaces between tokens, every
 * other line as written. A bar past the end changes nothing.
 */
export function replaceBar(chords: string, bar: number, next: string): string {
  let first = 0
  const lines = chords.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!hasBars(lines[i])) continue
    const tokens = tokensOf(lines[i])
    const here = barsOf(tokens).length
    if (bar < first + here) {
      const index = barIndexes(tokens)
      const target = bar - first
      const out: string[] = []
      let placed = false
      tokens.forEach((token, t) => {
        if (index[t] !== target || isRepeatCount(token)) return void out.push(token)
        if (!placed) out.push(...tokensOf(next))
        placed = true
      })
      lines[i] = out.join('  ')
      return lines.join('\n')
    }
    first += here
  }
  return chords
}

/** An Unsure bar still waiting for the player. `section` is its index in the stored sections. */
export interface UnsureBar {
  section: number
  name: string
  bar: number
  evidence: BarEvidence
}

export const squash = (chords: string) => tokensOf(chords).join(' ')

/** A section's evidence bars that are well formed; saved or pasted evidence may be anything. */
function goodBars(bars: unknown): BarEvidence[] {
  if (!Array.isArray(bars)) return []
  return bars.filter(b => b && typeof b.bar === 'number' && typeof b.chords === 'string')
}

/** The Unsure bars that still read the disputed chords and that the player has not settled on them. */
export function openUnsure(song: Song, edits: SongEdits | undefined): UnsureBar[] {
  const found: UnsureBar[] = []
  ;(edits?.sections ?? song.sections).forEach((section, index) => {
    const unsure = goodBars(song.evidence?.[section.name]?.bars).filter(b => b.from === 'Unsure')
    if (unsure.length === 0) return
    const bars = barsOfSection(section.chords)
    for (const evidence of unsure) {
      const disputed = squash(evidence.chords)
      const reads = bars[evidence.bar] && barChords(bars[evidence.bar])
      const settled = edits?.heard?.[section.name]?.[evidence.bar]
      if (reads === disputed && (settled === undefined || squash(settled) !== disputed)) {
        found.push({ section: index, name: section.name, bar: evidence.bar, evidence })
      }
    }
  })
  return found
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
const bars = (count: number) => `${count} ${count === 1 ? 'bar' : 'bars'}`

/** One line for More: where the song's chords came from, or null when that is not known. */
export function chordsFromText(song: Song, edits: SongEdits | undefined): string | null {
  if (!song.chordsFrom) return null
  const parts = [`${SOURCE_LABEL[song.chordsFrom]}.`]
  const names = [...new Set(song.sections.map(s => s.name))]
  for (const name of names) {
    const from = song.evidence?.[name]?.from
    if (from && from !== song.chordsFrom) parts.push(`${name}: ${lowerFirst(SOURCE_LABEL[from])}.`)
  }
  const ear = new Set<string>()
  for (const [name, section] of Object.entries(song.evidence ?? {})) {
    if (!names.includes(name)) continue
    for (const b of goodBars(section?.bars)) if (b.from === 'Ear') ear.add(`${name}:${b.bar}`)
  }
  // A settled bar that reads its disputed chords again is unsure, not by ear
  const open = openUnsure(song, edits)
  for (const [name, settled] of Object.entries(edits?.heard ?? {})) {
    if (!names.includes(name)) continue
    for (const bar of Object.keys(settled)) if (!open.some(u => u.name === name && u.bar === Number(bar))) ear.add(`${name}:${bar}`)
  }
  if (ear.size > 0) parts.push(`${bars(ear.size)} by ear.`)
  const unsure = open.length
  if (unsure > 0) parts.push(`${bars(unsure)} unsure.`)
  return parts.join(' ')
}
