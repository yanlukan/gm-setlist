import type { Section } from '../types'
import { isChordToken } from './chord-text'
import { hasBars, isRepeatCount, REPEAT_BAR, BEAT, BAR } from './bars'

/** What the "add a song" tool reads out of a trusted chart's text. Words are never kept. */
export interface ChartDraft {
  title?: string
  artist?: string
  key?: string
  bpm?: number
  timeSignature?: string
  /** From an `Order:` line, names as written; else the sections in playing order. */
  form?: string[]
  /** Barred: chords text as written, one line per bar line. Unbarred: chord lines joined as plain chord text. */
  sections: Section[]
  /** Every section has bar lines. */
  barred: boolean
  /** Each chord line's chords, in playing order: a section played again repeats its lines. */
  chordLines: { section: string; chords: string[] }[]
}

interface Line { raw: string; barred: boolean; chords: string[] }
interface Block { name: string; lines: Line[] }

const HEADER = /^(title|artist|key|bpm|time|order)\s*:\s*(\S.*)$/i
const BRACKET = /^\[\s*([^\]]+?)\s*\]$/
const COLON = /^([A-Z0-9][\w'-]*(?:\s+[A-Z0-9][\w'-]*){0,2})\s*:$/

const isMark = (t: string) => t === 'N.C.' || t === REPEAT_BAR || t === BEAT || isRepeatCount(t)

/** A chord line's tokens, or null when any token is a word. */
function chordTokens(line: string): string[] | null {
  const tokens = line.split(/[\s|]+/).filter(Boolean)
  if (tokens.length === 0) return null
  return tokens.every(t => isMark(t) || isChordToken(t)) ? tokens : null
}

export function readChartText(text: string): ChartDraft {
  const draft: ChartDraft = { sections: [], barred: false, chordLines: [] }
  const blocks: Block[] = []
  let order: string[] | undefined
  let current: Block | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const head = HEADER.exec(line)
    if (head && !current) {
      const value = head[2].trim()
      switch (head[1].toLowerCase()) {
        case 'title': draft.title = value; break
        case 'artist': draft.artist = value; break
        case 'key': draft.key = value; break
        case 'bpm': { const n = parseFloat(value); if (Number.isFinite(n) && n > 0) draft.bpm = n; break }
        case 'time': draft.timeSignature = value; break
        case 'order': order = value.split(',').map(s => s.trim()).filter(Boolean); break
      }
      continue
    }
    const name = BRACKET.exec(line)?.[1] ?? COLON.exec(line)?.[1]?.trim()
    if (name && !chordTokens(line)) {
      current = { name, lines: [] }
      blocks.push(current)
      continue
    }
    if (!current) continue
    const tokens = chordTokens(line)
    if (!tokens) continue
    current.lines.push({
      raw: line,
      barred: line.includes(BAR) || hasBars(line),
      chords: tokens.filter(isChordToken).filter(t => !isMark(t)),
    })
  }

  // A repeated header with the same chords (or none) plays the earlier section again;
  // with different chords it is a section of its own: "Name 2", "Name 3"...
  const kept: Block[] = []
  const playing: string[] = []
  const content = (b: Block) => b.lines.map(l => l.chords.join(' ')).join('\n')
  for (const b of blocks) {
    const same = kept.filter(k => k.name === b.name || k.name.startsWith(b.name + ' '))
    const earlier = same.find(k => b.lines.length === 0 || content(k) === content(b))
    if (earlier) { playing.push(earlier.name); continue }
    const name = same.length ? `${b.name} ${same.length + 1}` : b.name
    kept.push({ name, lines: b.lines })
    playing.push(name)
  }

  draft.barred = kept.length > 0 && kept.every(b => b.lines.length > 0 && b.lines.every(l => l.barred))
  draft.sections = kept.map(b => ({
    name: b.name,
    chords: b.lines.map(l => (draft.barred ? l.raw : l.chords.join(' '))).filter(Boolean).join('\n'),
  }))
  if (kept.length) draft.form = order ?? playing
  // Every play of a section repeats its lines: the Order line when it names only kept sections, else the text's order
  const byName = new Map(kept.map(b => [b.name, b]))
  const plays = order && order.every(n => byName.has(n)) ? order : playing
  for (const name of plays) {
    for (const l of byName.get(name)!.lines) if (l.chords.length) draft.chordLines.push({ section: name, chords: l.chords })
  }
  return draft
}
