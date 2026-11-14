import { describe, it, expect } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { spawnSync } from 'node:child_process'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { tmpdir } from 'node:os'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { join } from 'node:path'
import { DEFAULT_SONGS } from '../../data/library'
import { SONGS } from '../../data/songs'
import { barsOfSection, barChords } from '../../music/evidence'
import { by, formBars } from '../songs-in-bars-helpers'
// @ts-expect-error -- the chart export is a plain script with no types
import { exportChart } from '../../../scripts/export-charts.mjs'

const song = (over: object) => ({ title: 'T', key: 'C', bpm: 100, timeSignature: '4/4', capo: null, notes: '', shapes: {}, sections: [{ name: 'A', chords: '|  E  B  |' }], ...over })

describe('exporting charts for the recording check', () => {
  it('numbers bars as the evidence does and writes the beats as fractions', () => {
    const faith = exportChart(by('Faith'))
    const pre = faith.sections.find((s: { name: string }) => s.name === 'Pre-Chorus')
    expect(pre.bars[5]).toEqual({
      bar: 5, chords: 'B F#/A# G#m .', evidence: 'Ear',
      slots: [{ chord: 'B', start: 0, length: 0.25 }, { chord: 'F#/A#', start: 0.25, length: 0.25 }, { chord: 'G#m', start: 0.5, length: 0.5 }],
    })
    expect(pre.bars[0].slots).toEqual([{ chord: 'E', start: 0, length: 1 }])
    expect(faith.chordsFrom).toBe('Book')
  })

  it('a bar of % is the bar it repeats', () => {
    const intro = exportChart(by('Faith')).sections[0]
    expect(intro.bars[1]).toEqual({ bar: 1, chords: '%', evidence: null, slots: [{ chord: 'B', start: 0, length: 1 }] })
  })

  it('plays the song order through, lines as many times as their (xN)', () => {
    const played = exportChart(by("I'm Your Man")).played
    expect(played.slice(0, 8).map((p: { section: string }) => p.section)).toEqual(Array(8).fill('Intro'))
    expect(played.slice(8, 16)).toEqual([0, 1, 2, 3, 0, 1, 2, 3].map(bar => ({ section: 'Verse', bar })))
  })

  it('a % with a repeat count after it is still the bar it repeats', () => {
    const out = exportChart(song({ sections: [{ name: 'A', chords: '|  A  |  %  |  (x2)\n|  %  |' }], form: ['A'] }))
    const [a, rep, next] = out.sections[0].bars
    expect(rep.chords).toBe('%')
    expect(rep.slots).toEqual(a.slots)
    expect(next.slots).toEqual(a.slots)
    expect(out.played.length).toBe(5)
  })

  it('a % that opens a section has no slots', () => {
    const out = exportChart(song({ sections: [{ name: 'B', chords: '|  G  |' }, { name: 'A', chords: '|  %  |' }] }))
    expect(out.sections[1].bars[0].slots).toEqual([])
  })

  it('an undotted bar shares equally', () => {
    const out = exportChart(song({ sections: [{ name: 'A', chords: '|  E  B  |' }], form: ['A'] }))
    expect(out.sections[0].bars[0].slots).toEqual([{ chord: 'E', start: 0, length: 0.5 }, { chord: 'B', start: 0.5, length: 0.5 }])
  })

  it('a song without an order, or with a missing part, is skipped with the reason', () => {
    const none = exportChart(song({}))
    expect(none.played).toEqual([])
    expect(none.skipped).toBe('no song order')
    const missing = exportChart(song({ form: ['A', 'Z'] }))
    expect(missing.played).toEqual([])
    expect(missing.skipped).toBe('song order names a missing part')
    expect(exportChart(song({ form: ['A'] })).skipped).toBeNull()
  })

  it('beats per bar: 4 in 4/4, 2 in 6/8, 4 in 12/8', () => {
    expect(exportChart(song({})).beatsPerBar).toBe(4)
    expect(exportChart(song({ timeSignature: '6/8' })).beatsPerBar).toBe(2)
    expect(exportChart(song({ timeSignature: '12/8' })).beatsPerBar).toBe(4)
    expect(exportChart(song({ timeSignature: '3/4' })).beatsPerBar).toBe(3)
    expect(exportChart(song({ timeSignature: '9/8' })).beatsPerBar).toBe(3)
  })

  it('only 6/8, 9/8 and 12/8 count dotted quarters: 3/8 is 3 beats, as add_song.py counts it', () => {
    expect(exportChart(song({ timeSignature: '3/8' })).beatsPerBar).toBe(3)
    expect(exportChart(song({ timeSignature: '15/8' })).beatsPerBar).toBe(15)
  })

  it('every shipped song exports, numbered like the evidence, and its order matches its length', () => {
    for (const s of DEFAULT_SONGS) {
      const out = exportChart(s)
      s.sections.forEach((section, i) => {
        const bars = barsOfSection(section.chords)
        expect(out.sections[i].bars.map((b: { bar: number; chords: string }) => [b.bar, b.chords]), s.title).toEqual(bars.map((b, n) => [n, barChords(b)]))
        for (const bar of out.sections[i].bars as { bar: number; chords: string; slots: { chord: string; length: number }[] }[]) {
          if (bar.chords.split(' ').every(t => t === 'N.C.' || t === '.')) continue
          const label = `${s.title} ${section.name} bar ${bar.bar}`
          expect(bar.slots.length, label).toBeGreaterThan(0)
          expect(bar.slots.reduce((n, x) => n + x.length, 0), label).toBeCloseTo(1, 5)
        }
      })
      if (s.form) {
        expect(out.skipped, s.title).toBeNull()
        expect(out.played.length, s.title).toBe(formBars(s.title))
      } else {
        expect(out.played, s.title).toEqual([])
      }
    }
  })

  // Node with Vite's loader, as the script runs: slow when the machine is busy, so 20 s, not 5
  it('an added file that is not a song is left out and named, never a crash', { timeout: 20_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'export-charts-'))
    try {
      writeFileSync(join(dir, 'a-note.json'), JSON.stringify({ hello: 1 }))
      writeFileSync(join(dir, 'broken.json'), '{')
      const good = { title: 'Made Up Tune', artist: 'Nobody', key: 'C', bpm: 100, timeSignature: '4/4', sections: [{ name: 'A', chords: '| C | G |' }], form: ['A'] }
      writeFileSync(join(dir, 'made-up-tune.json'), JSON.stringify(good))
      const code = `const { exportAll } = await import('./scripts/export-charts.mjs'); const out = await exportAll(${JSON.stringify(dir)}); console.log(JSON.stringify(out.map(c => c.title)))`
      const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' })
      expect(r.status, r.stderr).toBe(0)
      const titles = JSON.parse(r.stdout)
      expect(titles.at(-1)).toBe('Made Up Tune')
      expect(titles).toHaveLength(SONGS.length + 1)
      expect(r.stderr).toContain('skipping a-note.json')
      expect(r.stderr).toContain('skipping broken.json: not valid JSON')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
