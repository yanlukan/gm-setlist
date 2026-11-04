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
  /** Unbarred reading: each chord line's chords, in playing order. */
  chordLines: { section: string; chords: string[] }[]
}

interface Line { raw: string; barred: boolean; chords: string[] }
interface Block { name: string; lines: Line[] }

const HEADER = /^(title|artist|key|bpm|time|order)\s*:\s*(\S.*)$/i
const BRACKET = /^\[\s*([^\]]+?)\s*\]$/
const COLON = /^([^:|[\]]+?)\s*:$/

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
  const playing: string[] = []
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
      playing.push(name)
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

  // A header repeated with no lines plays the earlier section again.
  const seen = new Set<string>()
  const kept = blocks.filter(b => {
    const again = seen.has(b.name)
    seen.add(b.name)
    return !(again && b.lines.length === 0)
  })

  draft.barred = kept.length > 0 && kept.every(b => b.lines.length > 0 && b.lines.every(l => l.barred))
  draft.sections = kept.map(b => ({
    name: b.name,
    chords: b.lines.map(l => (draft.barred ? l.raw : l.chords.join(' '))).filter(Boolean).join('\n'),
  }))
  for (const b of kept) {
    for (const l of b.lines) if (l.chords.length) draft.chordLines.push({ section: b.name, chords: l.chords })
  }
  if (kept.length) draft.form = order ?? playing
  return draft
}
