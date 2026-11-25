import { describe, it, expect } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'

// jsdom loads no stylesheets, so what the player asked for on 2026-11-25 is
// pinned by reading the CSS itself. Paths are from app/, where the tests run.
const css = (name: string): string => readFileSync(`src/styles/${name}`, 'utf8')
const rule = (text: string, selector: string): string => {
  const start = text.indexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThanOrEqual(0)
  return text.slice(start, text.indexOf('}', start))
}

describe('the song list', () => {
  // "they dont need to be so tall and i need to scroll through 21 songs, and
  // more than half of screen is empty"
  it('lays the songs out in as many columns as fit, read down each column', () => {
    const list = rule(css('sheets.css'), '.set-song-list')
    expect(list).toContain('columns: 300px;')
    expect(list).not.toContain('display: grid')
    expect(rule(css('sheets.css'), '.set-song-list .songtile')).toContain('break-inside: avoid;')
  })

  it('makes each row short: 52 px, the title on one line', () => {
    const sheets = css('sheets.css')
    expect(rule(sheets, '.set-song-list .songtile')).toContain('min-height: 52px;')
    expect(rule(sheets, '.set-song-list .songtile-title')).toContain('-webkit-line-clamp: 1;')
  })
})

describe('the Next button', () => {
  // "the next button is in blue and big and looks like title of current song"
  it('is a button like Previous: the same size, no blue block', () => {
    const bar = css('bottom-bar.css')
    const next = rule(bar, '.bb-next')
    expect(next).not.toContain('background')
    expect(next).toContain('flex: 1 1 0;')
    expect(rule(bar, '.bb-prev')).toContain('flex: 1 1 0;')
  })

  it('says Next in the accent colour, and keeps its amber for Back to the set', () => {
    const bar = css('bottom-bar.css')
    expect(rule(bar, '.bb-next :is(.bb-kicker, .bb-arrow)')).toContain('color: var(--accent);')
    expect(rule(bar, '.bb-next.is-return')).toContain('background: #f59e0b;')
  })
})
