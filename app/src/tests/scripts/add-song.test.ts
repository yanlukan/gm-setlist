import { describe, it, expect, beforeEach, afterEach } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { spawnSync } from 'node:child_process'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { tmpdir } from 'node:os'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { join } from 'node:path'
import { isAddedSong } from '../../data/added-songs'

// add-song.mjs run for real, with --python pointing at a stub that saves the request and prints a fixed answer.

const recordAnswer = {
  recording: 'la-song.m4a', duration: 200.4, key: 'C', bpm: 100, timeSignature: '4/4', tuning: 0, route: 'record',
  sections: [{ name: 'Part 1', chords: '| C | G | Am | F |' }], form: ['Part 1', 'Part 1'],
  evidence: { 'Part 1': { bars: ['C', 'G', 'Am', 'F'].map((chords, bar) => ({ bar, chords, from: 'Unsure', readings: [{ from: 'Record', chords }] })) } },
}

let dir: string
let out: string
let recording: string

function stub(answer: unknown, exit = 0) {
  writeFileSync(join(dir, 'answer.json'), JSON.stringify(answer))
  const path = join(dir, 'python')
  writeFileSync(path, `#!/bin/sh\ncat > "${dir}/request.json"\ncat "${dir}/answer.json"\nexit ${exit}\n`)
  chmodSync(path, 0o755)
  return path
}

function run(args: string[], answer: unknown = recordAnswer, exit = 0) {
  const python = stub(answer, exit)
  // From app/, where vitest runs
  return spawnSync('node', ['scripts/add-song.mjs', '--artist', 'Nobody', '--recording', recording, '--out', out, '--python', python, ...args], { encoding: 'utf8' })
}

const request = () => JSON.parse(readFileSync(join(dir, 'request.json'), 'utf8'))

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'add-song-'))
  out = join(dir, 'out')
  recording = join(dir, 'la-song.m4a')
  writeFileSync(recording, '')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('add-song.mjs', () => {
  it('writes the song file into --out and says how many bars are unsure', () => {
    const r = run(['--title', 'La Song'])
    expect(r.status, r.stderr).toBe(0)
    expect(readdirSync(out)).toEqual(['la-song.json'])
    const song = JSON.parse(readFileSync(join(out, 'la-song.json'), 'utf8'))
    expect(isAddedSong(song)).toBe(true)
    expect(song.chordsFrom).toBe('Record')
    expect(song.notes).toContain('Recording: la-song.m4a.')
    expect(r.stdout).toContain('4 unsure bars')
    expect(request()).toEqual({ title: 'La Song', recording })
  })

  it('never writes the recording folder into the file', () => {
    run(['--title', 'La Song'])
    expect(readFileSync(join(out, 'la-song.json'), 'utf8')).not.toContain(dir)
  })

  it('refuses a title already in the library', () => {
    const r = run(['--title', 'Faith'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('already in the library')
    expect(existsSync(out)).toBe(false)
  })

  it('overwrites its own file', () => {
    expect(run(['--title', 'La Song']).status).toBe(0)
    expect(run(['--title', 'La Song'], { ...recordAnswer, bpm: 120 }).status).toBe(0)
    expect(readdirSync(out)).toEqual(['la-song.json'])
    expect(JSON.parse(readFileSync(join(out, 'la-song.json'), 'utf8')).bpm).toBe(120)
  })

  it('a barred chart goes as an exported chart, the key and tempo left for the record', () => {
    writeFileSync(join(dir, 'chart.txt'), '[Verse]\n| C | G | Am | F |\n')
    const check = { recording: 'la-song.m4a', checked: '2026-11-04', shift: 0, verdict: 'lined up', bars: [], unchecked: [] }
    const r = run(['--title', 'La Song', '--chart', join(dir, 'chart.txt'), '--time', '3/4'], { ...recordAnswer, route: 'chart', check, timeSignature: '3/4' })
    expect(r.status, r.stderr).toBe(0)
    const req = request()
    expect(req.chordLines).toBeUndefined()
    expect(req.chart.sections[0].bars).toHaveLength(4)
    expect(req.chart.played).toHaveLength(4)
    expect(req.chart.key).toBeUndefined()
    expect(req.key).toBeUndefined()
    expect(req.timeSignature).toBe('3/4')
    const song = JSON.parse(readFileSync(join(out, 'la-song.json'), 'utf8'))
    expect(song.sections).toEqual([{ name: 'Verse', chords: '| C | G | Am | F |' }])
    expect(song.key).toBe('C')
  })

  it('a chart of chords over words goes as chord lines, never the words', () => {
    writeFileSync(join(dir, 'chart.txt'), 'Key: G\n[Verse]\nG  C\nla la la\n[Chorus]\nD G\n[Verse]\n')
    const r = run(['--title', 'La Song', '--chart', join(dir, 'chart.txt')], { ...recordAnswer, route: 'words' })
    expect(r.status, r.stderr).toBe(0)
    const req = request()
    expect(req.chart).toBeUndefined()
    expect(req.key).toBe('G')
    expect(req.chordLines.map((l: { section: string }) => l.section)).toEqual(['Verse', 'Chorus', 'Verse'])
    expect(JSON.stringify(req)).not.toContain('la la')
  })

  it('a malformed answer writes nothing', () => {
    const r = run(['--title', 'La Song'], { ...recordAnswer, sections: [] })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('malformed answer')
    expect(existsSync(out)).toBe(false)
  })

  it('an answer for another route writes nothing', () => {
    const r = run(['--title', 'La Song'], { ...recordAnswer, route: 'words' })
    expect(r.status).toBe(1)
    expect(existsSync(out)).toBe(false)
  })

  it('add_song.py stopping writes nothing', () => {
    const r = run(['--title', 'La Song'], recordAnswer, 2)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('exit 2')
    expect(existsSync(out)).toBe(false)
  })
})
