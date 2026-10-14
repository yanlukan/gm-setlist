import { describe, it, expect } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'

// jsdom loads no stylesheets, so the sizes and colours the chart depends on
// are pinned by reading the CSS itself. Paths are from app/, where the tests run.
const css = (name: string): string => readFileSync(`src/styles/${name}`, 'utf8')

/** The text from `from` to the next `to`, or to the end. */
function between(text: string, from: string, to?: string): string {
  const start = text.indexOf(from)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = to ? text.indexOf(to, start + from.length) : text.length
  expect(end).toBeGreaterThan(start)
  return text.slice(start, end)
}

describe('section colours', () => {
  it('has a solo colour in every theme', () => {
    const theme = css('theme.css')
    expect(between(theme, ':root {', '}')).toContain('--section-solo: #f472b6;')
    expect(between(theme, 'body.light {', '}')).toContain('--section-solo: #be185d;')
  })

  it('keeps the section colours on stage, bright on black', () => {
    const stage = between(css('theme.css'), 'body.stage {', '}')
    for (const line of [
      '--section-verse: #6ab4ff;',
      '--section-chorus: #5ff08f;',
      '--section-bridge: #ffa14a;',
      '--section-prechorus: #d6a6ff;',
      '--section-solo: #ff8ad0;',
      '--section-intro: #cccccc;',
      '--section-default: #cccccc;',
    ]) {
      expect(stage).toContain(line)
    }
  })
})

const LANDSCAPE = '@media (orientation: landscape) and (min-width: 900px)'
const PHONE = '@media (max-width: 500px)'

describe('the band chart stylesheet', () => {
  it('has four columns, eight in landscape and two on a phone, and chords from 20 to 44 px', () => {
    const bands = css('bands.css')
    const base = between(bands, '.band-chart {', '}')
    expect(base).toContain('--cols: 4;')
    expect(base).toContain('--chart-min: 20px;')
    expect(base).toContain('--chart-max: 44px;')
    expect(base).toContain('--gutter: 116px;')
    const landscape = between(bands, LANDSCAPE, PHONE)
    expect(landscape).toContain('--cols: 8;')
    expect(landscape).toContain('--chart-max: 36px;')
    expect(landscape).toContain('.stage-screen .band-chart { --gutter: 44px; }')
    const phone = between(bands, PHONE)
    expect(phone).toContain('--cols: 2;')
    expect(phone).toContain('.band-chart .pad-wide { display: none; }')
  })

  it('puts a crowded bar on two lines only where the fit says so', () => {
    const bands = css('bands.css')
    expect(between(bands, '.band-chart .bar {', '}')).toContain('flex-wrap: nowrap;')
    expect(between(bands, ".band-chart .bar[data-lines='2'] {", '}')).toContain('flex-wrap: wrap;')
  })

  it('makes Stage bands compact and leaves Practice at 44 px', () => {
    const bands = css('bands.css')
    expect(between(bands, '.stage-screen .band-chart {', '}')).toContain('--band-gap: 6px; --row-gap: 3px;')
    expect(between(bands, '.stage-screen .band {', '}')).toContain('padding: 3px 6px 3px 0;')
    expect(between(bands, '.stage-screen .band-chart .bar-plain {', '}')).toContain('min-height: 1.45em;')
    expect(between(bands, '.stage-screen .band-chart .bar {', '}')).toContain('line-height: 1.2;')
    expect(between(bands, '.stage-screen .band-head {', '}')).toContain('flex-direction: row;')
    expect(between(bands, '.stage-screen .band-head .chart-label {', '}')).toContain('padding-top: 2px;')
    expect(between(bands, '.band-chart .bar-plain {', '}')).toContain('min-height: 44px;')
    expect(between(bands, '.band-chart .bar,', '}')).toContain('min-height: 44px;')
  })

  it('keeps Practice at four bars a row on its side', () => {
    expect(between(css('practice.css'), LANDSCAPE)).toContain('.practice-screen .band-chart { --cols: 4; }')
  })

  it('is loaded, and the old bar view is gone', () => {
    expect(css('global.css')).toContain("@import './bands.css';")
    expect(css('bars.css')).not.toContain('.bar-grid')
    expect(css('bars.css')).not.toContain('data-narrow')
  })

  it('keeps the title line readable on every chart', () => {
    const layout = css('layout.css')
    expect(layout).toContain('font-size: max(26px, 0.6em);')
    expect(layout.split('max(16px, 0.36em)')).toHaveLength(3)
    expect(layout).toContain('font-size: max(16px, 0.4em);')
  })

  it('scales a bar down by the fit the chart gives it, so a long chord stays inside its bar', () => {
    expect(between(css('bands.css'), '.band-chart .bar {', '}')).toContain('zoom: var(--fit, 1);')
  })
})
