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
