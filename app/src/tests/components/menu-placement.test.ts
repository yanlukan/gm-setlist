import { describe, it, expect } from 'vitest'
// @ts-expect-error -- the project has no Node types; the tests only ever run under Node
import { readFileSync } from 'node:fs'

// jsdom lays nothing out, so the placement of the menu is checked on the
// stylesheet itself. On an iPad held upright the top bar wraps and the ⋮
// button lands on a second row: without this rule it sits at the far left
// and its menu, which hangs from the button's right edge, drops off the screen.
describe('the ⋮ menu on a wrapped top bar', () => {
  const css: string = readFileSync('src/styles/layout.css', 'utf8')
  const base = css.slice(0, css.indexOf('@media'))

  it('keeps the menu button at the right end of its row at every width', () => {
    expect(base).toMatch(/\.tb-menu\s*\{[^}]*margin-left:\s*auto/)
  })
})
