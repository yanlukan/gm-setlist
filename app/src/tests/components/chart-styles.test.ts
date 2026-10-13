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
    expect(between(theme, 'body.stage {', '}')).toContain('--section-solo: #ffffff;')
  })
})

const LANDSCAPE = '@media (orientation: landscape) and (min-width: 900px)'
const PHONE = '@media (max-width: 500px)'

describe('the band chart stylesheet', () => {
  it('has four columns, eight in landscape and two on a phone', () => {
    const bands = css('bands.css')
    const base = between(bands, '.band-chart {', '}')
    expect(base).toContain('--cols: 4;')
    expect(base).toContain('--chart-base: 32px;')
    expect(between(bands, LANDSCAPE, PHONE)).toContain('--cols: 8;')
    const phone = between(bands, PHONE)
    expect(phone).toContain('--cols: 2;')
    expect(phone).toContain('.band-chart .pad-wide { display: none; }')
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
})
