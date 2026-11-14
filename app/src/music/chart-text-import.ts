import type { Section } from '../types'
import { isChordToken } from './chord-text'
import { barsOf, fromGrid, hasBars, isRepeatCount, REPEAT_BAR, BEAT, BAR } from './bars'

/** What the "add a song" tool reads out of a trusted chart's text. Words are never kept. */
export interface ChartDraft {
  title?: string
  artist?: string
  /** A key name such as C, F#, Bb, Ebm; anything else is left out with a warning. */
  key?: string
  bpm?: number
  /** Such as 4/4, 3/4, 6/8, 12/8; anything else is left out with a warning. */
  timeSignature?: string
  /** From an `Order:` line when it names only the chart's sections; else the sections in playing order. */
  form?: string[]
  /** The part names an `Order:` line gives that are not sections of the chart. */
  unknownOrder: string[]
  /** How many names on the `Order:` line have no part word: counted, never kept as text. */
  orderWithoutPart: number
  /** The sections with a line without bar lines. */
  unbarred: string[]
  /** Barred: chords text as written, one line per bar line. Unbarred: chord lines joined as plain chord text, repeat counts played out. */
  sections: Section[]
  /** Every section has bar lines. */
  barred: boolean
  /** Each chord line's chords, in playing order: a section played again repeats its lines; repeat counts are played out. */
  chordLines: { section: string; chords: string[] }[]
  /** What was left out or changed while reading, in plain words; never a word of the chart's text. */
  warnings: string[]
}

interface Line { raw: string; barred: boolean; chords: string[] }
/** `part` is the part word the name is made from: "Verse" for "Verse 2"; `times` the plays its header asks for. */
interface Block { name: string; part: string; times: number; lines: Line[]; looseCounts: number }

const HEADER = /^(title|artist|key|bpm|time|order)\s*:\s*(\S.*)$/i
const BRACKET = /^\[\s*([^\]]+?)\s*\]$/
/** Up to three capitalised words: a part name the chart made up, kept only as "Part". */
const NAME = /^[A-Z0-9][\w'-]*(?:\s+[A-Z0-9][\w'-]*){0,2}$/
const HEADER_NAMES = /^(title|artist|key|bpm|time|order)$/i
const KEY = /^[A-G][#b]?m?$/
const TIME = /^([1-9]|1[0-6])\/(2|4|8|16)$/
/** The most times a repeat count plays anything. */
export const MAX_REPEAT = 16
/** A repeat count inside a header's text: `Chorus x2`, `Chorus (x2)`. */
const HEADER_COUNT = /(?<![a-z\d])\(?\s*x\s*(\d+)\s*\)?(?![a-z\d])/i
/** A space or any dash: hyphen, non-breaking hyphen, en and em dash, minus. */
const GAP = String.raw`[\s\-‐-―−]`

/** The part words a header may keep, by their spelling with spaces and dashes taken out. */
const PART_WORDS: Record<string, string> = {
  intro: 'Intro', verse: 'Verse', prechorus: 'Pre-Chorus', chorus: 'Chorus', postchorus: 'Post-Chorus',
  bridge: 'Bridge', middle8: 'Middle 8', middleeight: 'Middle 8', solo: 'Solo', interlude: 'Interlude',
  instrumental: 'Instrumental', break: 'Break', breakdown: 'Breakdown', outro: 'Outro', coda: 'Coda',
  ending: 'Ending', refrain: 'Refrain', hook: 'Hook', tag: 'Tag', vamp: 'Vamp', riff: 'Riff',
  turnaround: 'Turnaround', link: 'Link', part: 'Part',
}
const PART = new RegExp(
  String.raw`(?<![a-z])(pre${GAP}?chorus|post${GAP}?chorus|middle${GAP}?(?:8|eight)|breakdown|` +
  Object.keys(PART_WORDS).filter(w => !/chorus|middle|breakdown/.test(w) || w === 'chorus').join('|') +
  String.raw`)(?![a-z])(?:\s*#?\s*(\d{1,2})(?!\d))?`, 'i')

/** The part word (and number) in a header or Order name, the rest dropped; null when it has none. */
export function partName(text: string): { name: string; part: string } | null {
  const m = PART.exec(text)
  if (!m) return null
  const part = PART_WORDS[m[1].toLowerCase().replace(new RegExp(GAP, 'g'), '')]
  return { name: m[2] ? `${part} ${Number(m[2])}` : part, part }
}
/** The text starts with a part word, after any opening bracket. */
const startsWithPart = (text: string) => PART.exec(text.replace(/^[[(\s]+/, ''))?.index === 0

const isMark = (t: string) => t === 'N.C.' || t === REPEAT_BAR || t === BEAT || isRepeatCount(t)
const repeat = <T>(items: T[], n: number): T[] => Array.from({ length: Math.max(n, 1) }, () => items).flat()
const chordsIn = (tokens: string[]) => tokens.filter(t => !isMark(t) && isChordToken(t))

/** A chord line's tokens, or null when any token is a word. */
function chordTokens(line: string): string[] | null {
  const tokens = line.split(/[\s|]+/).filter(Boolean)
  if (tokens.length === 0) return null
  return tokens.every(t => isMark(t) || isChordToken(t)) ? tokens : null
}

/** Reads the chart's lines into blocks, with the warnings it gathers. */
class Reader {
  blocks: Block[] = []
  order?: string[]
  current: Block | null = null
  constructor(private draft: ChartDraft) {}

  warn(message: string) { if (!this.draft.warnings.includes(message)) this.draft.warnings.push(message) }

  /** A repeat count's number of plays, at most MAX_REPEAT. */
  times(count: string): number {
    const n = Number(count.replace(/\D/g, ''))
    if (n > MAX_REPEAT) { this.warn(`a repeat count over ${MAX_REPEAT} was read as ${MAX_REPEAT}`); return MAX_REPEAT }
    return n
  }

  /**
   * The chords a line plays, repeat counts played out. In bars a count goes with the bar before it
   * (as on the chart); without bars it repeats the chords before it, back to the line's start or the last count.
   */
  played(raw: string, barred: boolean): string[] {
    const tokens = fromGrid(raw).split(/\s+/).filter(Boolean)
    if (barred) return barsOf(tokens).flatMap(bar => repeat(chordsIn(bar), this.times(bar.find(isRepeatCount) ?? 'x1')))
    const out: string[] = []
    let run: string[] = []
    for (const t of tokens) {
      if (isRepeatCount(t)) { out.push(...repeat(run, this.times(t))); run = [] } else run.push(...chordsIn([t]))
    }
    return [...out, ...run]
  }

  /** A header's block: its part word and number, or "Part" when it names none; a count in it plays the part again. */
  open(text: string): Block {
    const count = HEADER_COUNT.exec(text)
    const named = count ? text.replace(count[0], ' ').trim() : text.trim()
    const found = partName(named) ?? { name: 'Part', part: 'Part' }
    if (found.name.toLowerCase() !== named.toLowerCase()) this.warn(`a part header had other words: it is named "${found.name}"`)
    const block = { ...found, times: count ? this.times(count[1]) : 1, lines: [], looseCounts: 0 }
    this.blocks.push(block)
    this.current = block
    return block
  }

  /** A chord line into the block; a line with no chords and no bar lines is left out. */
  add(block: Block, raw: string) {
    const tokens = chordTokens(raw)
    if (!tokens) return
    const last = block.lines[block.lines.length - 1]
    if (tokens.length === 1 && isRepeatCount(tokens[0])) {
      // A repeat count on a line of its own plays the line above again
      if (last) { last.chords = repeat(last.chords, this.times(tokens[0])); block.looseCounts++ }
      return
    }
    const barred = raw.includes(BAR) || hasBars(raw)
    const chords = this.played(raw, barred)
    if (chords.length || barred) block.lines.push({ raw, barred, chords })
  }

  header(key: string, value: string) {
    const label = { title: 'Title', artist: 'Artist', key: 'Key', bpm: 'BPM', time: 'Time', order: 'Order' }[key]!
    if (key === 'order') {
      if (this.order) { this.warn('a second Order line was left out'); return }
      const names = value.split(',').map(s => s.trim()).filter(Boolean).map(s => partName(s)?.name ?? null)
      this.draft.orderWithoutPart = names.filter(n => n === null).length
      this.order = names.filter((n): n is string => n !== null)
      return
    }
    if (this.current) { this.warn(`a ${label} line after the first part was left out`); return }
    const d = this.draft
    let ok = true
    if (key === 'title') d.title = value
    else if (key === 'artist') d.artist = value
    else if (key === 'key') ok = KEY.test(value) && Boolean(d.key = value)
    else if (key === 'bpm') { const n = parseFloat(value); ok = Number.isFinite(n) && n > 0; if (ok) d.bpm = n }
    else if (key === 'time') ok = TIME.test(value) && Boolean(d.timeSignature = value)
    if (!ok) this.warn(`the ${label} line is not a ${key === 'bpm' ? 'tempo' : key === 'key' ? 'key name' : 'time signature'}, left out`)
  }

  /**
   * A line with a colon or in brackets as a part header. A header is a bracketed line, or text before a colon
   * that holds a part word or is up to three capitalised words; with words (not chords) after the colon it
   * must start with a part word. True when the line was used (or left out with a warning).
   */
  partHeader(line: string): boolean {
    const bracket = BRACKET.exec(line)
    if (bracket && !chordTokens(line)) { this.open(bracket[1]); return true }
    const colon = line.indexOf(':')
    if (colon <= 0) return false
    const head = line.slice(0, colon).trim()
    const rest = line.slice(colon + 1).trim()
    if (HEADER_NAMES.test(head) || chordTokens(head)) return false
    const named = Boolean(partName(head)) || NAME.test(head)
    if (!rest) {
      if (named) this.open(head)
      else this.warn('a line ending in a colon with no part name in it was left out')
      return true
    }
    const tokens = chordTokens(rest)
    if (tokens ? !named : !startsWithPart(head)) return false
    const block = this.open(head)
    if (!tokens) this.warn('words after a part header were left out')
    else if (tokens.length === 1 && isRepeatCount(tokens[0])) block.times = this.times(tokens[0])
    else this.add(block, rest)
    return true
  }

  read(text: string) {
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line) continue
      const head = HEADER.exec(line)
      if (head) { this.header(head[1].toLowerCase(), head[2].trim()); continue }
      if (this.partHeader(line)) continue
      if (this.current) this.add(this.current, line)
    }
  }
}

/** A line as compared for a repeated header: barred lines by their bars as written, others by their chords. */
const lineText = (l: Line) => (l.barred ? fromGrid(l.raw).split(/\s+/).filter(Boolean).join(' ') : l.chords.join(' '))

/**
 * A repeated header with the same lines (or none) plays the earlier part again; with different lines it is a
 * part of its own with a name not yet taken. A header with no lines and no part of its name before it plays
 * the first later part of its name, or is left out.
 */
function keepBlocks(blocks: Block[], warnings: string[]): { kept: Block[]; playing: string[] } {
  const kept: Block[] = []
  const plays: (string | Block)[] = []
  const content = (b: Block) => b.lines.map(lineText).join('\n')
  const taken = (name: string) => kept.some(k => k.name === name)
  const play = (p: string | Block, times: number) => { for (let i = 0; i < times; i++) plays.push(p) }
  for (const b of blocks) {
    const same = kept.filter(k => k.part === b.part)
    const earlier = b.lines.length === 0
      ? same.find(k => k.name === b.name) ?? same[0]
      : same.find(k => content(k) === content(b))
    if (earlier) { play(earlier.name, b.times); continue }
    if (b.lines.length === 0) { play(b, b.times); continue }
    let name = b.name
    for (let n = 2; taken(name); n++) name = `${b.part} ${n}`
    kept.push({ ...b, name })
    play(name, b.times)
  }
  const playing: string[] = []
  for (const p of plays) {
    if (typeof p === 'string') { playing.push(p); continue }
    const later = kept.find(k => k.part === p.part && k.name === p.name) ?? kept.find(k => k.part === p.part)
    if (later) playing.push(later.name)
    else if (!warnings.includes(`a ${p.name} part with no chords under it was left out`)) warnings.push(`a ${p.name} part with no chords under it was left out`)
  }
  return { kept, playing }
}

export function readChartText(text: string): ChartDraft {
  const draft: ChartDraft = {
    sections: [], barred: false, chordLines: [], unknownOrder: [], orderWithoutPart: 0, unbarred: [], warnings: [],
  }
  const reader = new Reader(draft)
  reader.read(text)
  const order = reader.order
  const { kept, playing } = keepBlocks(reader.blocks, draft.warnings)

  draft.unbarred = kept.filter(b => !b.lines.every(l => l.barred)).map(b => b.name)
  draft.barred = kept.length > 0 && draft.unbarred.length === 0
  if (draft.barred) {
    for (const b of kept) if (b.looseCounts) draft.warnings.push(`${b.name}: a repeat count on a line of its own is not kept in bars; write it after the bar it repeats`)
  }
  draft.sections = kept.map(b => ({
    name: b.name,
    chords: b.lines.map(l => (draft.barred ? l.raw : l.chords.join(' '))).filter(Boolean).join('\n'),
  }))
  // Every play of a section repeats its lines: the Order line when it names only kept sections, else the text's order
  const byName = new Map(kept.map(b => [b.name, b]))
  draft.unknownOrder = (order ?? []).filter((n, i, all) => !byName.has(n) && all.indexOf(n) === i)
  const plays = order && draft.unknownOrder.length === 0 && draft.orderWithoutPart === 0 ? order : playing
  if (kept.length) draft.form = plays
  for (const name of plays) {
    for (const l of byName.get(name)!.lines) if (l.chords.length) draft.chordLines.push({ section: name, chords: l.chords })
  }
  return draft
}
