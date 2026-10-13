# Chart readability: colour bands and letters (3.64.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A chart written in bars is drawn as colour bands. Each section is lettered A, B, C in chart order and its bars sit in one grid: four columns in portrait, eight in landscape, two on a phone. The song order uses the same letters. Text sizes have floors, and the shapes strip starts closed on stage.

**Architecture:**
- **Choosing the look.** `SongSheet` decides once per song: if any section has a line in bars, the chart is a band chart (`.chart.band-chart`). Otherwise it is drawn as today.
- **Components.** `BandChart` draws the sections as bands; inside each band, `BandBars` draws the bars as cells of one CSS grid. Every written line is padded with blank cells to a multiple of four, so bar 1 of every line stays in column 1. The column count, sizes and gaps live in a new `styles/bands.css`, as custom properties set per screen shape by two media queries.
- **Fitting the text.** `useFitText` reads its size range from those properties on every fit, so turning the iPad picks up the other range. When not even the bands fit, the text goes back to the base size and the chart scrolls.
- **Stage.** Stage gets its own saved "shapes strip open" setting, which starts closed.

**Tech Stack:** React 19, Vite and TypeScript PWA in `app/`; zustand store; idb persistence; Vitest with jsdom and Testing Library; plain CSS files under `app/src/styles/`.

**Spec:** `docs/superpowers/specs/2026-10-13-chart-readability-design.md` (commit 82b54b6, approved by the user 2026-10-13)

## Global Constraints

**Release**
- One version: `3.64.0` in `app/src/version.ts`, bumped in Task 6 only.
- Run every command from `app/`:
  - tests: `npx vitest run`
  - types: `npx tsc -b --noEmit`
  - build: `npm run build`
- Never quote lyrics, anywhere, including test names and commit messages.

**File sizes**
- Code files stay at 800 lines or fewer.
- `app/src/styles/layout.css` (1133 lines) must not grow. Its four edits in this plan replace lines one for one.
- `app/src/store/use-store.ts` (816 lines) must not grow. Task 5 brings it to 797.
- New styles go in `app/src/styles/bands.css`, imported from `global.css` after `bars.css`.

**Data**
- No change to `app/src/data/songs.ts` and no data conversion: saved charts are read as they are.
- A chart with no line in bars looks exactly as it does today, except the title-line floors in Task 2.

**Layout values** (copy them exactly)
- Media queries in `bands.css`:
  - Portrait is the default.
  - Landscape: `@media (orientation: landscape) and (min-width: 900px)`.
  - Phone: `@media (max-width: 500px)`, last in the file.

| | Portrait | Landscape | Phone |
|---|---|---|---|
| Columns (`--cols`) | 4 | 8 | 2 |
| Chord base / min / max | 32 / 28 / 45 px | 26 / 24 / 36 px | 24 / 24 / 34 px |
| Band gap / row gap | 14 / 5 px | 10 / 4 px | 12 / 4 px |
| Header text | `max(0.6em, 16px)` | 16px | 16px |
| Header letter box | `max(1.34em, 26px)` of the header | 22px | 22px |
| Song-order chip text | 17px | 16px | 16px |
| Side padding | 16px | 12px | 12px |
| Title | `max(0.8em, 26px)` | 24px | 22px |

**Size floors**
- No chord text under 24px. Shared-bar chord `max(0.85em, 24px)`. `%`, N.C. and `(xN)` `max(0.75em, 24px)`. Alteration `max(0.8em, 24px)`.
- No header, chip or title-line pill text under 16px.
- Bar cells, header rows and plain rows are at least 44px tall.

**Colours**

| Part | Stage | Dark | Light |
|---|---|---|---|
| Verse | `#6ab4ff` | unchanged | unchanged |
| Chorus | `#5ff08f` | unchanged | unchanged |
| Bridge | `#ffa14a` | unchanged | unchanged |
| Pre-chorus | `#d6a6ff` | unchanged | unchanged |
| Solo (new) | `#ff8ad0` | `#f472b6` | `#be185d` |
| Intro / default | `#cccccc` (unchanged) | unchanged | unchanged |

**Git**
- Other sessions may edit this repo. Run `git status` before every commit and add only the files named in the task.
- Never add `app/tsconfig.tsbuildinfo` or `demo-form-pdf/`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tasks 1–5 commit locally. Task 6 pushes them all together with the version bump.

## Review Focus

1. **Moving from a song not in bars to a song in bars.** The chart element is reused. If `data-wrap="off"` from the earlier song stayed on it, two chords in one bar could never wrap. The band chart must have no `data-wrap`. Tests in Task 3: a hook test and a SongSheet test.
2. **Tapping the smaller alteration `(b9)`.** It must open the whole chord `Bb7(b9)` in the shape picker, the same as tapping `Bb7`. Test in Task 2.
3. **An empty section, or a blank line between lines of bars.** These must give a header with no bars and one empty full-width row. Never a crash, and never stray blank cells. Tests in Task 2.
4. **The keyboard view of a band chart.** It keeps the letters and bands, with plain headers (not buttons) and no chord taps. Test in Task 2.
5. **Turning the iPad.** The fit must read the new range (26–36 in landscape, 28–45 in portrait) when the screen changes shape, not keep the old one. Test in Task 3.

## Decisions taken in this plan

These are small departures from the spec, or details the spec left open.

**Song-order strip**
- The lettered strip is drawn on band charts only. A chart with no bars keeps today's short tags (V, PC, C). So of the song-order tests, only the Papa case (a song in bars) changes.
- The form-strip base rules stay in `layout.css`, because charts with no bars still use them. The lettered look is added in `bands.css`. (The spec said to move them.)

**Fit**
- When the whole chart cannot fit, the size is the largest at which the bands alone fit (as today's essential step does). Only when not even the bands fit does it go back to the base size.
- The hook removes `data-wrap` for band charts instead of setting it to `on`.

**Sizes and colours**
- The header letter box is `max(1.34em, 26px)` of the header text. At the portrait base that equals the spec's `max(0.8em, 26px)` of the chart text, because the header is 0.6em.
- The stage solo colour is `#ffffff` in Task 1 (like the other stage parts today) and becomes `#ff8ad0` in Task 4 with the rest.

**Stage setting**
- Reading the saved view settings moves into `readViewSettings()` in `view-settings.ts`. This brings `use-store.ts` from 816 to 797 lines, under the 800-line rule.
- The new setting is saved with the generic `saveSetting('stageDiagramsVisible', …)`, so `persistence.ts` does not change.
- The 16px stage handle rule goes in `bands.css`, because `layout.css` may not grow.
- The relaunch test for the stage setting lives in `view-settings.test.ts`, next to the instrument one.

**Phone on its side**
- A phone on its side (wider than 500px, narrower than 900px) gets the portrait layout: four columns.

## File map

| File | Job | Task |
|---|---|---|
| `app/src/music/letters.ts` (new) | Section letters A..Z, then AA.. | 1 |
| `app/src/music/theory.ts` | `sectionColor` by the kind of part | 1 |
| `app/src/styles/theme.css` | `--section-solo`; stage colours | 1, 4 |
| `app/src/music/bars.ts` | `padsAfter` | 2 |
| `app/src/music/chord-text.ts` | `splitAlteration` | 2 |
| `app/src/components/song/BandBars.tsx` (new) | One section's bars as grid cells | 2 |
| `app/src/components/song/BandChart.tsx` (new) | The sections as lettered bands | 2 |
| `app/src/components/song/FormStrip.tsx` | Lettered chips | 2 |
| `app/src/components/song/SongSheet.tsx` | Bands or the usual chart; fit options; strip setting | 2, 3, 5 |
| `app/src/components/song/BarGrid.tsx` | Deleted | 2 |
| `app/src/styles/bands.css` (new) | The band chart's look | 2, 5 |
| `app/src/styles/bars.css` | The old bar view removed | 2 |
| `app/src/styles/layout.css` | Title-line floors (one-for-one line edits) | 2 |
| `app/src/styles/global.css` | Imports `bands.css` | 2 |
| `app/src/hooks/use-fit-text.ts` | Range from CSS, fallback, cramped option; narrow mode removed | 3 |
| `app/src/store/view-settings.ts` | `stageDiagramsVisible`, `shapesShown`, `readViewSettings` | 5 |
| `app/src/store/use-store.ts` | `hydrate` uses `readViewSettings` | 5 |
| `app/src/components/diagrams/DiagramsBar.tsx`, `app/src/components/layout/TopBar.tsx` | Read `shapesShown` | 5 |
| `app/src/version.ts` | `3.64.0` | 6 |
| `docs/superpowers/specs/2026-10-13-chart-readability-design.md` | Measured fit numbers | 6 |

Tests that must stay green unchanged:

- `chart-integrity`
- `keyboard-view`
- `stage-polish`
- `section-focus`
- `top-bar`
- `chord-finder`
- `move-chords-sheet`
- `original-chart`
- `menu-placement`
- `band-shapes`
- the song-order cases for charts with no bars

`chart-integrity` reads bars through `.bar-grid`, `.bar-plain` and `.bar > span`, which `BandBars` keeps.

---

### Task 1: Section letters and colours by the kind of part

**Files:**
- Create: `app/src/music/letters.ts`, `app/src/tests/music/letters.test.ts`, `app/src/tests/components/chart-styles.test.ts`
- Modify: `app/src/music/theory.ts:179-187` (`sectionColor`), `app/src/styles/theme.css` (after lines 14, 36 and 65), `app/src/tests/music/theory.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `letterAt(index: number): string`
  - `sectionLetters(names: readonly string[]): string[]`
  - `letterByName(names: readonly string[]): Map<string, string>`
  - `sectionColor(name)` now also returns `'var(--section-solo)'`, and matches verse, chorus and bridge by ending (`Last verse` is a verse).
  - CSS variable `--section-solo` in every theme.
  - `chart-styles.test.ts` with the helpers `css(name)` and `between(text, from, to?)`, which Tasks 2, 4 and 5 add to.

- [ ] **Step 1: Write the failing tests**

`app/src/tests/music/letters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { letterAt, letterByName, sectionLetters } from '../../music/letters'
import { DEFAULT_SONGS } from '../../data/songs'

const letters = (title: string) => sectionLetters(DEFAULT_SONGS.find(s => s.title === title)!.sections.map(s => s.name))

describe('section letters', () => {
  it('goes A to Z, then AA, AB', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letterAt)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA'])
  })

  it('gives each section of a song its letter in chart order', () => {
    expect(letters('Kissing a Fool')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(letters('Faith')).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    const longest = letters('Somebody to Love')
    expect(longest[longest.length - 1]).toBe('L')
  })

  it('keeps the first letter for a name used twice', () => {
    expect(Object.fromEntries(letterByName(['Intro', 'Verse', 'Verse', 'Outro']))).toEqual({ Intro: 'A', Verse: 'B', Outro: 'D' })
  })
})
```

`app/src/tests/music/theory.test.ts`: this file uses semicolons.
1. In the `'returns default for unknown sections'` block, delete the line `expect(sectionColor('solo')).toBe('var(--section-default)');`.
2. Add these two tests after that block, in the same `describe`:

```ts
  it('colours a part by its kind: a last verse is a verse, a post-chorus a chorus', () => {
    for (const name of ['Last verse', 'Killer verse 2', 'Post-Verse']) expect(sectionColor(name)).toBe('var(--section-verse)');
    for (const name of ['Post-Chorus', 'Last Chorus']) expect(sectionColor(name)).toBe('var(--section-chorus)');
    expect(sectionColor('Pre-Chorus')).toBe('var(--section-prechorus)');
  });

  it('gives a solo its own colour, but not a solo on one instrument', () => {
    expect(sectionColor('Solo')).toBe('var(--section-solo)');
    expect(sectionColor('solo')).toBe('var(--section-solo)');
    for (const name of ['unknown', 'Bass solo', 'Trumpet solo', 'Stop', 'Chorus end']) {
      expect(sectionColor(name)).toBe('var(--section-default)');
    }
  });
```

`app/src/tests/components/chart-styles.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/tests/music/letters.test.ts src/tests/music/theory.test.ts src/tests/components/chart-styles.test.ts`

Expected: FAIL.
- letters: cannot resolve `../../music/letters`.
- theory: `'Last verse'` gives `var(--section-default)`.
- chart-styles: no `--section-solo`.

- [ ] **Step 3: Write the code**

`app/src/music/letters.ts`:

```ts
/** The letter for a section at this place in chart order: A..Z, then AA, AB. */
export function letterAt(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/** Each section's letter, in chart order. */
export function sectionLetters(names: readonly string[]): string[] {
  return names.map((_, i) => letterAt(i))
}

/** The letter for each section name, for the song-order strip. */
export function letterByName(names: readonly string[]): Map<string, string> {
  // A name used twice keeps its first section's letter
  const letters = new Map<string, string>()
  names.forEach((name, i) => {
    if (!letters.has(name)) letters.set(name, letterAt(i))
  })
  return letters
}
```

`app/src/music/theory.ts`: replace the body of `sectionColor`, keeping its first comment and the file's semicolons:

```ts
export function sectionColor(name: string): string {
  // "Bridge 2" is still a bridge, "Last verse" a verse and "Post-Chorus" a chorus
  const lower = name.toLowerCase().replace(/[\s-_]/g, '').replace(/\d+$/, '');
  if (lower.endsWith('prechorus')) return 'var(--section-prechorus)';
  if (lower.endsWith('verse')) return 'var(--section-verse)';
  if (lower.endsWith('chorus')) return 'var(--section-chorus)';
  if (lower.endsWith('bridge')) return 'var(--section-bridge)';
  // A solo on one instrument (Bass solo) stays plain: only the band's solo gets the colour
  if (lower === 'solo') return 'var(--section-solo)';
  if (lower === 'intro' || lower === 'outro') return 'var(--section-intro)';
  return 'var(--section-default)';
}
```

`app/src/styles/theme.css`: add one line after each `--section-prechorus` line.
- `:root`, after `  --section-prechorus: #c084fc;` (line 14): `  --section-solo: #f472b6;`
- `body.light`, after `  --section-prechorus: #7e22ce;` (line 36): `  --section-solo: #be185d;`
- `body.stage`, after `  --section-prechorus: #ffffff;` (line 65): `  --section-solo: #ffffff;`

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/tests/music/letters.test.ts src/tests/music/theory.test.ts src/tests/components/chart-styles.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc -b --noEmit`
Expected: all pass. The colour change shows only in inline `style` values, which no other test reads.

- [ ] **Step 5: Commit (local)**

```bash
git status --short
git add src/music/letters.ts src/music/theory.ts src/styles/theme.css src/tests/music/letters.test.ts src/tests/music/theory.test.ts src/tests/components/chart-styles.test.ts
git commit -m "feat: section letters, and colours by the kind of part

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The band chart

**Files:**
- Create:
  - `app/src/components/song/BandBars.tsx`
  - `app/src/components/song/BandChart.tsx`
  - `app/src/styles/bands.css`
  - `app/src/tests/components/band-chart.test.tsx`
- Modify:
  - `app/src/music/bars.ts` (add `padsAfter` after `hasBars`)
  - `app/src/music/chord-text.ts` (add `splitAlteration` at the end)
  - `app/src/components/song/FormStrip.tsx`
  - `app/src/components/song/SongSheet.tsx` (imports at lines 12 and 18; `bands` after `readSections`; `renderBody`; `renderChords`; `renderTokens`)
  - `app/src/styles/global.css` (import)
  - `app/src/styles/bars.css` (delete lines 14–50)
  - `app/src/styles/layout.css` (lines 116, 122, 143 and 1081)
- Delete: `app/src/components/song/BarGrid.tsx`
- Test:
  - `app/src/tests/music/bars.test.ts`
  - `app/src/tests/music/chord-text.test.ts`
  - `app/src/tests/components/bar-chart.test.tsx` (rewrite)
  - `app/src/tests/components/band-chart.test.tsx` (new)
  - `app/src/tests/components/song-order.test.tsx:201`
  - `app/src/tests/components/chart-styles.test.ts`

**Interfaces:**
- Consumes from Task 1:
  - `sectionLetters`, `letterByName` from `music/letters`
  - `sectionColor` from `music/theory`
  - `css` and `between` in `chart-styles.test.ts`
- Produces:
  - `padsAfter(count: number): ('pad-both' | 'pad-wide')[]` in `music/bars.ts`
  - `splitAlteration(token: string): [string, string] | null` in `music/chord-text.ts`
  - `BandChart` props: `{ sections: readonly { name: string; chords: string }[]; focusable: boolean; focusedIndex: number | null; onFocus: (index: number | null) => void; renderTokens: (text: string) => ReactNode }`
  - `FormStrip` props: `{ form: readonly string[]; letters?: ReadonlyMap<string, string> }`
  - In `SongSheet`, `const bands: boolean`. Task 3 uses it for the fit options.
  - DOM classes:
    - charts: `.chart.band-chart`
    - bands: `.band` (inline `--band`), `.band-head`, `.band-letter`, `.band-rule`
    - bars: `.bar` with `bar-first`, `bar-last`, `bar-double`, `bar-shared`, `phrase-start`, `phrase-end`
    - pads: `.bar-pad` with `pad-both` or `pad-wide`
    - text: `.chord-alt`, `.form-strip.is-lettered`, `.form-name`
  - CSS custom properties on `.band-chart`: `--cols`, `--chart-base`, `--chart-min`, `--chart-max`, `--band-gap`, `--row-gap`, `--head-size`, `--letter-box`, `--chip-size`.

- [ ] **Step 1: Write the failing tests for the two helpers**

`app/src/tests/music/bars.test.ts`: add `padsAfter` to the import from `'../../music/bars'`, and add:

```ts
describe('padsAfter', () => {
  it('pads a line to four cells, the ones past a multiple of two for wide rows only', () => {
    expect(padsAfter(1)).toEqual(['pad-both', 'pad-wide', 'pad-wide'])
    expect(padsAfter(2)).toEqual(['pad-wide', 'pad-wide'])
    expect(padsAfter(3)).toEqual(['pad-both'])
    expect(padsAfter(4)).toEqual([])
    expect(padsAfter(5)).toEqual(['pad-both', 'pad-wide', 'pad-wide'])
    expect(padsAfter(8)).toEqual([])
  })
})
```

`app/src/tests/music/chord-text.test.ts`: add `splitAlteration` to the import from `'../../music/chord-text'`, and add:

```ts
describe('splitAlteration', () => {
  it('takes a trailing alteration in brackets apart from the chord', () => {
    expect(splitAlteration('Bb7(b9)')).toEqual(['Bb7', '(b9)'])
    expect(splitAlteration('E7(#9)')).toEqual(['E7', '(#9)'])
  })

  it('leaves a chord without brackets at its end alone', () => {
    expect(splitAlteration('C(add9)/E')).toBeNull()
    expect(splitAlteration('G')).toBeNull()
    expect(splitAlteration('(x2)')).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and check they fail**

Run: `npx vitest run src/tests/music/bars.test.ts src/tests/music/chord-text.test.ts`
Expected: FAIL with `padsAfter is not a function` and `splitAlteration is not a function`.

- [ ] **Step 3: Write the two helpers**

`app/src/music/bars.ts`, after `hasBars`:

```ts
/** Blank cells after a written line's bars, to the next multiple of four; the ones past a multiple of two are for wide rows only. */
export function padsAfter(count: number): ('pad-both' | 'pad-wide')[] {
  const toFour = (4 - (count % 4)) % 4
  const toTwo = count % 2
  return Array.from({ length: toFour }, (_, i) => (i < toTwo ? 'pad-both' : 'pad-wide'))
}
```

`app/src/music/chord-text.ts`, at the end:

```ts
/** A chord's trailing alteration in brackets, apart: Bb7(b9) is Bb7 and (b9). Null when there is none. */
export function splitAlteration(token: string): [string, string] | null {
  const match = /^(.+?)(\([^()]+\))$/.exec(token)
  return match ? [match[1], match[2]] : null
}
```

Run: `npx vitest run src/tests/music/bars.test.ts src/tests/music/chord-text.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing chart tests**

Replace the whole of `app/src/tests/components/bar-chart.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

// A section written in bars shows as a cell per bar in a grid of four columns
// (eight in landscape, two on a phone). Every line is padded to four cells, so
// bar 1 of every line is in the first column.

beforeEach(() => useStore.setState(useStore.getInitialState()))

const faith = (chords: string) => {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords }])
  return render(<SongSheet />).container
}
/** The grid's cells: a bar by its text, a blank cell by the rows it shows in. */
const cells = (grid: Element) =>
  Array.from(grid.children).map(cell =>
    cell.classList.contains('pad-both') ? 'both' : cell.classList.contains('pad-wide') ? 'wide' : cell.textContent,
  )
const named = (page: Element, cls: string) => Array.from(page.querySelectorAll(`.${cls}`)).map(cell => cell.textContent)

const LINES = [
  '|  D  |',
  '|  G  |  A  |',
  '|  Bm  |  G  |  A  |',
  '|  D  |  %  |  G  |  A  |',
  '|  D  |  G  |  A  |  D  |  E  |',
].join('\n')

describe('a section written in bars', () => {
  it('pads every line to four cells, so bar 1 of every line is in the first column', () => {
    const grid = faith(LINES).querySelector('.bar-grid')!
    expect(cells(grid)).toEqual([
      'D', 'both', 'wide', 'wide',
      'G', 'A', 'wide', 'wide',
      'Bm', 'G', 'A', 'both',
      'D', '%', 'G', 'A',
      'D', 'G', 'A', 'D', 'E', 'both', 'wide', 'wide',
    ])
    expect(grid.querySelectorAll('.bar')).toHaveLength(15)
    expect(Array.from(grid.querySelectorAll('.bar-pad')).every(pad => pad.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(grid.querySelector('.bar-repeat')?.getAttribute('aria-label')).toBe('Repeat the bar before')
  })

  it('marks where the second four bars of an eight-bar row start', () => {
    const page = faith(LINES)
    expect(named(page, 'phrase-start')).toEqual(['G', 'D', 'E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('joins two four-bar lines with one phrase line when they share a row', () => {
    const page = faith('|  A  |  B  |  C  |  D  |\n|  E  |  F  |  G  |  A  |')
    expect(named(page, 'phrase-start')).toEqual(['E'])
    expect(named(page, 'phrase-end')).toEqual(['D'])
  })

  it('keeps a repeat count at the end of its bar, marks shared bars and draws one double bar', () => {
    const page = faith('|  A  |  B  (x2)  |\n|  F#  N.C.  |')
    const bars = page.querySelectorAll('.bar')
    expect(bars[1].textContent).toBe('B(x2)')
    expect(bars[1].lastElementChild!.classList.contains('bar-count')).toBe(true)
    expect(bars[1].classList.contains('bar-shared')).toBe(false)
    expect(bars[2].classList.contains('bar-shared')).toBe(true)
    expect(bars[2].querySelector('.chart-mark')?.textContent).toBe('N.C.')
    expect(page.querySelectorAll('.bar-double')).toHaveLength(1)
    expect(bars[0].classList.contains('bar-double')).toBe(true)
  })

  it('runs a line not in bars across the row, with no double bar after it', () => {
    const page = faith('N.C.\n|  D  |  G  |\nD  G  A')
    expect(named(page, 'bar-plain')).toEqual(['N.C.', 'D  G  A'])
    expect(page.querySelector('.bar-double')).toBeNull()
  })

  it('draws every section of a chart in bars as a band, even one written without bars', () => {
    useStore.getState().saveSections('Faith', [
      { name: 'Intro', chords: '|  B  |' },
      { name: 'Verse', chords: 'D  G\nA  D' },
    ])
    const page = render(<SongSheet />).container
    expect(named(page, 'bar-plain')).toEqual(['D  G', 'A  D'])
  })

  it('leaves a chart without bars as typed lines', () => {
    const page = faith('D  G\nA  D')
    expect(page.querySelector('.bar-grid')).toBeNull()
    expect(page.querySelectorAll('.chart-chords .chart-line')).toHaveLength(2)
  })
})
```

Create `app/src/tests/components/band-chart.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { BandChart } from '../../components/song/BandChart'
import { hasShapes } from '../../music/voicings'
import { faithOneLine } from '../faith-one-line'
import { useStore } from '../../store/use-store'

// A chart written in bars is drawn in bands: each section tinted in its colour
// and lettered A, B, C in chart order, with the song order in the same letters.

beforeEach(() => useStore.setState(useStore.getInitialState()))

/** Moving to a song leaves edit mode. */
function open(title: string) {
  const index = useStore.getState().setlistSongs().findIndex(s => s.title === title)
  act(() => useStore.getState().goToSong(index))
}
const chart = () => document.querySelector('.chart') as HTMLElement
/** Each band's header as it reads: letter and name. */
const heads = () =>
  Array.from(document.querySelectorAll('.band-head')).map(
    head => `${head.querySelector('.band-letter')!.textContent} ${head.querySelector('.chart-label')!.textContent}`,
  )
/** The song-order chips as they read: letter, name and any repeat. */
const lettered = () =>
  Array.from(document.querySelectorAll('.form-strip .form-chip')).map(
    chip =>
      `${chip.querySelector('.band-letter')!.textContent} ${chip.querySelector('.form-name')!.textContent}` +
      (chip.querySelector('.form-times')?.textContent ?? ''),
  )
/** The band with this section name. */
const band = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('.band')).find(b => b.querySelector('.chart-label')!.textContent === name)!

describe('a chart in bands', () => {
  it('letters each section in chart order, in its colour', () => {
    render(<SongSheet />) // Faith, in bars
    expect(chart().classList.contains('band-chart')).toBe(true)
    expect(heads()).toEqual(['A Intro', 'B Verse', 'C Pre-Chorus', 'D Chorus', 'E Solo', 'F Stop'])
    expect(band('Solo').style.getPropertyValue('--band')).toBe('var(--section-solo)')
  })

  it('letters the song order the same way, with the full names', () => {
    render(<SongSheet />)
    expect(screen.getByRole('group', { name: /^Song order:/ }).classList.contains('is-lettered')).toBe(true)
    expect(lettered()).toEqual([
      'A Intro', 'B Verse', 'C Pre-Chorus', 'D Chorus', 'B Verse', 'C Pre-Chorus', 'D Chorus',
      'E Solo', 'C Pre-Chorus', 'F Stop', 'D Chorus',
    ])
  })

  it('colours a last verse as a verse and a second bridge as a bridge', () => {
    render(<SongSheet />)
    open('Kissing a Fool')
    expect(heads()).toEqual(['A Intro', 'B Verse', 'C Chorus', 'D Bridge', 'E Bridge 2', 'F Last verse', 'G Outro'])
    expect(band('Last verse').style.getPropertyValue('--band')).toBe('var(--section-verse)')
    expect(band('Bridge 2').style.getPropertyValue('--band')).toBe('var(--section-bridge)')
  })

  it('shows a part played twice running once, with its count', () => {
    useStore.getState().saveForm('Faith', ['Intro', 'Verse', 'Chorus', 'Chorus'])
    render(<SongSheet />)
    expect(lettered()).toEqual(['A Intro', 'B Verse', 'D Chorus×2'])
  })

  it('shows just one section’s shapes from its header', () => {
    render(<SongSheet />)
    const verse = screen.getByRole('button', { name: 'Verse' })
    expect(verse.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(verse)
    expect(useStore.getState().focusSection).toEqual({ title: 'Faith', index: 1 })
    expect(verse.getAttribute('aria-pressed')).toBe('true')
  })

  it('has plain headers while the shapes are hidden', () => {
    useStore.setState({ diagramsVisible: false })
    render(<SongSheet />)
    expect(document.querySelector('.band-head .chart-label-btn')).toBeNull()
  })

  it('keeps the letters for the keyboard player, with plain headers and no chord taps', () => {
    useStore.setState({ instrument: 'keyboard' })
    render(<SongSheet />)
    expect(document.querySelector('.band-head .chart-label-btn')).toBeNull()
    expect(document.querySelector('.chart-chord-tap')).toBeNull()
    expect(heads()[0]).toBe('A Intro')
  })

  it('leaves a chart without bars as it was', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().classList.contains('band-chart')).toBe(false)
    expect(document.querySelector('.band')).toBeNull()
    expect(document.querySelector('.form-strip.is-lettered')).toBeNull()
  })

  it('draws an alteration a little smaller, and a tap on it still opens the whole chord', () => {
    expect(hasShapes('Bb7(b9)')).toBe(true)
    useStore.getState().saveSections('Faith', [{ name: 'Verse', chords: '|  Bb7(b9)  |  A  |' }])
    render(<SongSheet />)
    const alteration = screen.getByText('(b9)')
    expect(alteration.classList.contains('chord-alt')).toBe(true)
    fireEvent.click(alteration)
    expect(screen.getByRole('heading', { name: 'Bb7(b9)' })).toBeInTheDocument()
  })
})

describe('a band on its own', () => {
  const draw = (chords: string, name = 'Verse') =>
    render(
      <BandChart sections={[{ name, chords }]} focusable={false} focusedIndex={null} onFocus={() => {}} renderTokens={text => text} />,
    )

  it('draws an empty section as a header with no bars', () => {
    draw('', 'Intro')
    expect(heads()).toEqual(['A Intro'])
    expect(document.querySelector('.bar-grid')!.children).toHaveLength(0)
  })

  it('keeps a blank line between lines of bars as one empty row', () => {
    draw('|  D  |\n\n|  G  |')
    const rows = document.querySelectorAll('.bar-plain')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toBe('')
  })
})
```

`app/src/tests/components/song-order.test.tsx`, last line of the test `'starts an order for a song that had none, and it shows on the chart afterwards'` (line 201). Papa is written in bars, so its chips now carry letters. Replace `expect(tags()).toEqual(['Intro', 'Killer', 'Outro'])` with:

```ts
    // Papa is written in bars: its chips carry the section letters and full names
    expect(
      Array.from(strip()!.querySelectorAll('.form-chip')).map(
        chip => `${chip.querySelector('.band-letter')!.textContent} ${chip.querySelector('.form-name')!.textContent}`,
      ),
    ).toEqual(['A Intro', 'E Killer', 'I Outro'])
```

`app/src/tests/components/chart-styles.test.ts`, add at the end:

```ts
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
```

- [ ] **Step 5: Run them and check they fail**

Run: `npx vitest run src/tests/components/bar-chart.test.tsx src/tests/components/band-chart.test.tsx src/tests/components/song-order.test.tsx src/tests/components/chart-styles.test.ts`

Expected: FAIL.
- band-chart: cannot resolve `../../components/song/BandChart`.
- bar-chart: the cells have no pads.
- song-order: the Papa case has no `.band-letter`.
- chart-styles: no `bands.css`.

- [ ] **Step 6: Write `BandBars` and `BandChart`**

`app/src/components/song/BandBars.tsx`:

```tsx
import type { ReactNode } from 'react'
import { barsOf, hasBars, isRepeatCount, padsAfter, REPEAT_BAR } from '../../music/bars'

interface Props {
  /** The section's lines, as written. */
  lines: string[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

type Cell =
  | { kind: 'plain'; text: string }
  | { kind: 'pad'; className: 'pad-both' | 'pad-wide' }
  | { kind: 'bar'; tokens: string[]; classes: string[] }

/** Chords in a bar, leaving out % and repeat counts. */
const chordCount = (bar: string[]) => bar.filter(t => t !== REPEAT_BAR && !isRepeatCount(t)).length

/**
 * One cell per bar. Each written line is padded with blank cells to a
 * multiple of four, so every line starts a row and bar 1 of every line is in
 * the first column, in rows of four, eight or two.
 */
function layOut(lines: string[]): Cell[] {
  const cells: Cell[] = []
  let column = 0
  lines.forEach((line, li) => {
    const tokens = line.split(/\s+/).filter(Boolean)
    if (!hasBars(tokens)) {
      // N.C., a blank line or a line not in bars runs across the whole row
      cells.push({ kind: 'plain', text: line })
      column = 0
      return
    }
    const bars = barsOf(tokens)
    bars.forEach((bar, bi) => {
      const classes = ['bar']
      if (bi === 0) classes.push('bar-first')
      if (bi === bars.length - 1) classes.push('bar-last')
      // The double bar where the section starts
      if (li === 0 && bi === 0) classes.push('bar-double')
      if (chordCount(bar) > 1) classes.push('bar-shared')
      // Halfway along an eight-bar row: the line between the two phrases is the stronger one
      if (column % 8 === 4) {
        classes.push('phrase-start')
        const before = cells[cells.length - 1]
        if (before?.kind === 'bar') before.classes.push('phrase-end')
      }
      cells.push({ kind: 'bar', tokens: bar, classes })
      column++
    })
    for (const pad of padsAfter(bars.length)) {
      cells.push({ kind: 'pad', className: pad })
      column++
    }
  })
  return cells
}

/** A section's bars, as cells of the band's grid. */
export function BandBars({ lines, renderTokens }: Props) {
  return (
    <div className="bar-grid">
      {layOut(lines).map((cell, i) => {
        if (cell.kind === 'plain') return <div key={i} className="chart-line bar-plain">{renderTokens(cell.text)}</div>
        if (cell.kind === 'pad') return <div key={i} className={`bar-pad ${cell.className}`} aria-hidden="true" />
        return (
          <div key={i} className={cell.classes.join(' ')}>
            {cell.tokens.map((token, ti) => {
              if (token === REPEAT_BAR) return <span key={ti} className="bar-repeat" aria-label="Repeat the bar before">%</span>
              if (isRepeatCount(token)) return <span key={ti} className="chart-mark bar-count">{token}</span>
              return <span key={ti} className="bar-chord">{renderTokens(token)}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}
```

`app/src/components/song/BandChart.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { sectionLetters } from '../../music/letters'
import { sectionColor } from '../../music/theory'
import { BandBars } from './BandBars'

interface Props {
  sections: readonly { name: string; chords: string }[]
  /** Headers are buttons: tap one to see just that section's chord shapes. */
  focusable: boolean
  /** The section whose shapes are showing, or null. */
  focusedIndex: number | null
  onFocus: (index: number | null) => void
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

/**
 * A chart in bands: each section a band tinted in its colour, headed by its
 * letter (A, B, C in chart order) and name, with its bars in a grid below.
 */
export function BandChart({ sections, focusable, focusedIndex, onFocus, renderTokens }: Props) {
  const letters = sectionLetters(sections.map(s => s.name))
  return (
    <>
      {sections.map((section, i) => {
        const focused = focusedIndex === i
        return (
          <div key={i} className="band" style={{ '--band': sectionColor(section.name) } as CSSProperties}>
            <div className="band-head">
              <span className="band-letter" aria-hidden="true">{letters[i]}</span>
              {focusable ? (
                <button
                  type="button"
                  className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                  aria-pressed={focused}
                  onClick={() => onFocus(focused ? null : i)}
                >
                  {section.name}
                </button>
              ) : (
                <div className="chart-label">{section.name}</div>
              )}
              <span className="band-rule" aria-hidden="true" />
            </div>
            <div className="chart-chords">
              <BandBars lines={section.chords.trim() ? section.chords.split('\n') : []} renderTokens={renderTokens} />
            </div>
          </div>
        )
      })}
    </>
  )
}
```

- [ ] **Step 7: Letter the song-order strip**

Replace the whole of `app/src/components/song/FormStrip.tsx`:

```tsx
import type { CSSProperties } from 'react'
import { compressForm, formLabel } from '../../music/form'
import { sectionColor } from '../../music/theory'

interface Props {
  form: readonly string[]
  /** Each section's letter, on a chart in bands: the chips then read "A Intro", "B Verse". */
  letters?: ReadonlyMap<string, string>
}

export function FormStrip({ form, letters }: Props) {
  return (
    <div className={letters ? 'form-strip is-lettered' : 'form-strip'} role="group" aria-label={`Song order: ${form.join(', ')}`}>
      {compressForm(form).map((step, i) => (
        <span
          key={i}
          className="form-chip"
          style={{ color: sectionColor(step.name), '--band': sectionColor(step.name) } as CSSProperties}
          title={step.name}
        >
          {letters ? (
            <>
              <span className="band-letter" aria-hidden="true">{letters.get(step.name)}</span>
              <span className="form-name">{step.name}</span>
            </>
          ) : (
            formLabel(step.name)
          )}
          {step.times > 1 && <span className="form-times">&times;{step.times}</span>}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Wire the bands into `SongSheet` and delete `BarGrid`**

`app/src/components/song/SongSheet.tsx`:

1. Imports:
   - Line 12: `import { BarGrid } from './BarGrid'` becomes `import { BandChart } from './BandChart'`.
   - Line 18 becomes `import { normalizeChordText, splitAlteration } from '../../music/chord-text'`.
   - Add after line 14 (the `formMatches` import): `import { letterByName } from '../../music/letters'`.
2. After the `readSections` `useMemo` (ends at line 101), add:

```ts
  // Written in bars, the chart is drawn in bands: lettered sections, each with its bars in one grid
  const bands = readSections.some(s => s.chords.split('\n').some(line => hasBars(line)))
```

3. In `renderBody` (lines 253–284), replace the `.chart` div with the following. The `readSections.map(...)` branch is today's code, unchanged apart from being wrapped in `bands ? … : (…)`.

```tsx
      <div ref={fitRef} className={bands ? 'chart band-chart' : 'chart'}>
        {heading}
        {banners}
        {formMatches(form, readSections) && (
          <FormStrip form={form} letters={bands ? letterByName(readSections.map(s => s.name)) : undefined} />
        )}
        <div ref={sectionsRef} className="chart-sections">
          {bands ? (
            <BandChart
              sections={readSections}
              focusable={diagramsVisible && !keyboard}
              focusedIndex={focusSection?.title === song.title ? focusSection.index : null}
              onFocus={index => setFocusSection(index === null ? null : { title: song.title, index })}
              renderTokens={renderTokens}
            />
          ) : (
            readSections.map((section, i) => {
              const focused = focusSection?.title === song.title && focusSection.index === i
              return (
                <Fragment key={`${song.title}-${i}`}>
                  {diagramsVisible && !keyboard ? (
                    // Tap a section to see just its chord shapes in the diagrams below
                    <button
                      type="button"
                      className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                      style={{ color: sectionColor(section.name) }}
                      aria-pressed={focused}
                      onClick={() => setFocusSection(focused ? null : { title: song.title, index: i })}
                    >
                      {section.name}
                    </button>
                  ) : (
                    <div className="chart-label" style={{ color: sectionColor(section.name) }}>
                      {section.name}
                    </div>
                  )}
                  <div className="chart-chords">{renderChords(section.chords)}</div>
                </Fragment>
              )
            })
          )}
        </div>
        {notes && <div className="chart-notes">{notes}</div>}
      </div>
```
4. In `renderChords`, delete these two lines, since bars now only ever reach `BandBars`:

```tsx
    // Written in bars: a box per bar, the bars of every line in the same columns
    if (lines.some(line => hasBars(line))) return <BarGrid lines={lines} renderTokens={renderTokens} />
```

5. Above `renderTokens`, add `chordText`. Then use it in the three returns of `renderTokens` that draw a chord: stage or keyboard, no shapes, and tappable.

```tsx
  // In bands, a chord's alteration in brackets is drawn a little smaller: Bb7(b9).
  // The tap still picks the whole chord.
  const chordText = (token: string) => {
    const parts = bands ? splitAlteration(token) : null
    return parts ? <>{parts[0]}<span className="chord-alt">{parts[1]}</span></> : token
  }

  const renderTokens = (text: string) =>
    text.split(/(\s+)/).map((token, i) => {
      if (!token.trim()) return <span key={i}>{token}</span>
      if (isChartMark(token)) return <span key={i} className="chart-mark">{token}</span>
      if (onStage || keyboard) return <span key={i}>{chordText(token)}</span>
      if (!hasShapes(token)) return <span key={i}>{chordText(token)}</span>
      return (
        <span
          key={i}
          className="chart-chord-tap"
          onClick={e => {
            e.stopPropagation()
            setPickerChord(token)
          }}
        >
          {chordText(token)}
        </span>
      )
    })
```

Delete the old component:

```bash
git rm src/components/song/BarGrid.tsx
```

- [ ] **Step 9: Write `bands.css`, remove the old bar view, raise the title-line floors**

Create `app/src/styles/bands.css`:

```css
/* ---------- A chart in bands (3.64.0) ----------
   A chart written in bars: each section a band in its colour, lettered A, B, C
   in chart order, its bars in a grid of four columns (eight in landscape, two
   on a phone). Every written line is padded to four cells, so bar 1 of every
   line is in the first column. The fit reads --chart-base, --chart-min and
   --chart-max from here on every fit, so turning the iPad picks up the other
   range. */
.band-chart {
  --cols: 4;
  --chart-base: 32px;
  --chart-min: 28px;
  --chart-max: 45px;
  --band-gap: 14px;
  --row-gap: 5px;
  --head-size: max(0.6em, 16px);
  --letter-box: max(1.34em, 26px);
  --chip-size: 17px;
}
.chart-scroll:has(.band-chart) { padding-left: 16px; padding-right: 16px; }
.band-chart .chart-title { font-size: max(0.8em, 26px); }
.band-chart .chart-sections {
  display: flex;
  flex-direction: column;
  /* The chart's baseline alignment would shrink each band to its text */
  align-items: stretch;
  gap: var(--band-gap);
}

/* ---------- A section: a tinted band with a thick edge in its colour ---------- */
.band {
  border-left: 6px solid var(--band);
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--band) 10%, transparent);
  padding: 0 8px 6px;
}
.band-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--band);
  font-size: var(--head-size);
}
/* The filled letter box, in the header and in the song-order chips */
.band-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--band);
  color: var(--bg);
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}
.band-head .band-letter { width: var(--letter-box); height: var(--letter-box); font-size: 1em; }
.band-head .chart-label { font-size: 1em; text-transform: none; letter-spacing: normal; color: var(--band); }
.band-head .chart-label-btn { min-height: 44px; }
.band-rule { flex: 1; height: 1px; background: var(--band); opacity: 0.6; }

/* ---------- The bars ---------- */
.band-chart .bar-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  row-gap: var(--row-gap);
}
/* N.C., a blank line or a line not in bars runs across the whole row */
.band-chart .bar-plain { grid-column: 1 / -1; min-height: 44px; }
.band-chart .bar,
.band-chart .bar-pad { min-height: 44px; }
.band-chart .bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  align-content: center;
  column-gap: 0.6em;
  padding: 0 0.35em;
  border-left: 2px solid var(--text-muted);
}
.band-chart .bar-last { border-right: 2px solid var(--text-muted); }
/* The double bar where a section starts, in the band's colour */
.band-chart .bar-double {
  border-left: none;
  padding-left: calc(9px + 0.35em);
  background: linear-gradient(to right, var(--band) 0 5px, transparent 5px 7px, var(--band) 7px 9px, transparent 9px) no-repeat;
}
/* Two chords share a bar from its midpoint when both fit, else they wrap */
.band-chart .bar-chord { flex: 1 1 0; min-width: max-content; }
.band-chart .bar-shared .bar-chord { font-size: max(0.85em, 24px); }
.band-chart .bar-repeat {
  flex: 1 1 0;
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
  font-size: max(0.75em, 24px);
}
.band-chart .chart-mark { font-size: max(0.75em, 24px); }
/* N.C. sharing a bar is already at the shared size */
.band-chart .bar-shared .bar-chord .chart-mark { font-size: 1em; }
/* (x2) at the end of its bar */
.band-chart .bar-count { margin-left: auto; }
/* The alteration in brackets, a little smaller: Bb7(b9) */
.band-chart .chord-alt { font-size: max(0.8em, 24px); }

/* ---------- The song order, lettered ----------
   Each chip shows its section's letter and full name, tinted like its band.
   The chips are not buttons. */
.form-strip.is-lettered .form-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 3px;
  border: 1.5px solid var(--band);
  background: color-mix(in srgb, var(--band) 22%, transparent);
  font-size: var(--chip-size);
  font-weight: 800;
}

/* ---------- An iPad on its side: eight bars a row ---------- */
@media (orientation: landscape) and (min-width: 900px) {
  .band-chart {
    --cols: 8;
    --chart-base: 26px;
    --chart-min: 24px;
    --chart-max: 36px;
    --band-gap: 10px;
    --row-gap: 4px;
    --head-size: 16px;
    --letter-box: 22px;
    --chip-size: 16px;
  }
  .chart-scroll:has(.band-chart) { padding-left: 12px; padding-right: 12px; }
  .band-chart .chart-title { font-size: 24px; }
  /* Two four-bar phrases a row: the line between them is the stronger one */
  .band-chart .bar.phrase-start { border-left-color: var(--text); }
  .band-chart .bar.phrase-end { border-right: none; }
}

/* ---------- A phone: two bars a row. Last, so it wins on a small screen ---------- */
@media (max-width: 500px) {
  .band-chart {
    --cols: 2;
    --chart-base: 24px;
    --chart-min: 24px;
    --chart-max: 34px;
    --band-gap: 12px;
    --row-gap: 4px;
    --head-size: 16px;
    --letter-box: 22px;
    --chip-size: 16px;
  }
  .chart-scroll:has(.band-chart) { padding-left: 12px; padding-right: 12px; }
  .band-chart .chart-title { font-size: 22px; }
  .band-chart .pad-wide { display: none; }
}
```

`app/src/styles/global.css`: after `@import './bars.css';` add `@import './bands.css';`.

`app/src/styles/bars.css`: delete lines 14–50. That is the blank line after the editor rules and the whole old bar view, through `.chart[data-wrap="off"] .bar { flex-wrap: nowrap; }`. Keep lines 1–13 (bars in the editor) and the one-tap keys (today's lines 51–54). Check afterwards: `grep -n "bar-grid\|data-narrow\|data-wrap" src/styles/bars.css` prints nothing.

`app/src/styles/layout.css`: four one-line edits, so the file does not grow.
- Line 116 (`.chart-title`): `font-size: max(20px, 0.6em);` becomes `font-size: max(26px, 0.6em);`.
- Line 122 (`.chart-position`): `font-size: max(13px, 0.36em);` becomes `font-size: max(16px, 0.36em);`.
- Line 143 (`.chart-preset`): `font-size: max(14px, 0.4em);` becomes `font-size: max(16px, 0.4em);`.
- Line 1081 (`.chart-edited`): `font-size: max(13px, 0.36em);` becomes `font-size: max(16px, 0.36em);`.

Check: `wc -l src/styles/layout.css` still prints 1133.

- [ ] **Step 10: Run the tests and check they pass**

Run: `npx vitest run src/tests/components/bar-chart.test.tsx src/tests/components/band-chart.test.tsx src/tests/components/song-order.test.tsx src/tests/components/chart-styles.test.ts src/tests/music/bars.test.ts src/tests/music/chord-text.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc -b --noEmit`

Expected: all pass. This includes `chart-integrity` (it reads `.bar-grid`, `.bar-plain` and `.bar > span`), `keyboard-view` (its first `.chart-label` is still `Intro`) and `section-focus`.

If `tsc` reports `hasBars` unused in `SongSheet`, the `bands` line from Step 8.2 is missing.

- [ ] **Step 11: Commit (local)**

```bash
git status --short
git add src/music/bars.ts src/music/chord-text.ts src/components/song/BandBars.tsx src/components/song/BandChart.tsx src/components/song/FormStrip.tsx src/components/song/SongSheet.tsx src/styles/bands.css src/styles/bars.css src/styles/layout.css src/styles/global.css src/tests/music/bars.test.ts src/tests/music/chord-text.test.ts src/tests/components/bar-chart.test.tsx src/tests/components/band-chart.test.tsx src/tests/components/song-order.test.tsx src/tests/components/chart-styles.test.ts
git commit -m "feat: charts in bars drawn as lettered colour bands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`BarGrid.tsx` is already staged as deleted by `git rm`.)

---

### Task 3: Fit a band chart to its stylesheet's range

**Files:**
- Modify: `app/src/hooks/use-fit-text.ts` (whole file), `app/src/components/song/SongSheet.tsx` (constants at lines 23–28; the `useFitText` call at lines 130–137)
- Test: `app/src/tests/hooks/use-fit-text.test.tsx`, `app/src/tests/components/band-chart.test.tsx`

**Interfaces:**
- Consumes from Task 2:
  - `bands` in `SongSheet`
  - the `.band-chart` class carrying `--chart-base`, `--chart-min` and `--chart-max` from `bands.css`
- Produces: `FitOptions` gains three options.
  - `fallback?: number`
  - `cssVars?: boolean` (default false)
  - `cramped?: boolean` (default true)
  - Narrow mode (`data-narrow`) is removed.

- [ ] **Step 1: Write the failing tests**

`app/src/tests/hooks/use-fit-text.test.tsx`:
1. Change the first import to `import { afterEach, describe, expect, it, vi } from 'vitest'`.
2. Delete the three narrow-mode tests:
   - `'lays the chart out narrower when even the smallest size is too wide, and fits it again'`
   - `'keeps the usual layout when the chart is not too wide'`
   - `'goes back to the usual layout when the next chart is not too wide'`
3. Add this test inside `describe('useFitText')`, after `'forgets cramped when the chart changes'`:

```ts
  it('forgets the last chart’s unwrapped lines when the next one does not ask for them', () => {
    let prefer: number | undefined = 30
    const chart = fakeChart(10, 8)
    const { rerender } = renderHook(({ key }) =>
      useFitText(chart.container, chart.content, key, { ...options, preferNoWrapMin: prefer }), { initialProps: { key: 'a' } })
    expect(chart.content.current.dataset.wrap).toBe('off')
    prefer = undefined
    rerender({ key: 'b' })
    expect(chart.content.current.dataset.wrap).toBeUndefined()
  })
```

4. At the end of the file, add:

```ts
/** Sets the chart's range on the content, the way bands.css does. */
function withRange(chart: ReturnType<typeof fakeChart>, base: number, min: number, max: number) {
  const content = chart.content.current
  content.style.setProperty('--chart-base', `${base}px`)
  content.style.setProperty('--chart-min', `${min}px`)
  content.style.setProperty('--chart-max', `${max}px`)
  // Computed style is only read for an element in the document
  document.body.append(content)
  return chart
}

const bands = { min: 20, max: 60, enabled: true, cssVars: true, cramped: false }

describe('useFitText on a band chart', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('takes its range from the stylesheet', () => {
    const chart = withRange(fakeChart(10, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(36)
  })

  it('shrinks to the smallest size of the range to fit the whole chart', () => {
    const chart = withRange(fakeChart(14, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(28)
  })

  it('keeps the largest size at which the bands fit when the whole chart cannot', () => {
    const chart = withRange(fakeChart(25, 12), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(33)
  })

  it('goes back to the base size and scrolls when not even the bands fit, without saying cramped', () => {
    const chart = withRange(fakeChart(40, 30), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(32)
    expect(chart.container.current.dataset.cramped).toBeUndefined()
  })

  it('reads the range again when the iPad turns', () => {
    let resize = () => {}
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback }
      observe() {}
      disconnect() {}
    })
    const chart = withRange(fakeChart(10, 8), 32, 28, 36)
    renderHook(() => useFitText(chart.container, chart.content, 'a', { ...bands, essentialRef: chart.sections }))
    expect(chart.size()).toBe(36)
    chart.content.current.style.setProperty('--chart-max', '30px')
    resize()
    expect(chart.size()).toBe(30)
  })
})
```

`app/src/tests/components/band-chart.test.tsx`: add at the end.

```tsx
describe('the size of a band chart', () => {
  // jsdom has no layout, so every chart fits: each grows to its largest size
  it('grows to the largest band size', () => {
    render(<SongSheet />) // Faith, in bars
    expect(chart().style.fontSize).toBe('45px')
  })

  it('keeps the usual sizes for a chart without bars', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().style.fontSize).toBe('64px')
  })

  it('lets two chords in a bar wrap after a chart that kept its lines unwrapped', () => {
    faithOneLine()
    render(<SongSheet />)
    expect(chart().dataset.wrap).toBe('off')
    open('Kissing a Fool')
    expect(chart().classList.contains('band-chart')).toBe(true)
    expect(chart().dataset.wrap).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run them and check they fail**

Run: `npx vitest run src/tests/hooks/use-fit-text.test.tsx src/tests/components/band-chart.test.tsx`

Expected: FAIL.
- The band-chart sizes are `64px`, not `45px`.
- `dataset.wrap` stays `'off'`.
- The range tests give 60 and 20, not 36 and 28.

- [ ] **Step 3: Rewrite the hook**

Replace the whole of `app/src/hooks/use-fit-text.ts`:

```ts
import { useLayoutEffect, type RefObject } from 'react'

interface FitOptions {
  min: number
  max: number
  enabled: boolean
  /**
   * Prefer keeping every line unwrapped (a chord progression split mid-line
   * reads like a new bar) as long as that still allows at least this size.
   * Below it, wrapping is allowed so the text can be bigger.
   */
  preferNoWrapMin?: number
  /**
   * The part that matters most. If the whole content cannot fit even at
   * `min`, the size is chosen so this part fits instead, and only what
   * follows it needs scrolling.
   */
  essentialRef?: RefObject<HTMLElement | null>
  /**
   * The size to go back to when not even the essential part fits at `min`:
   * the chart then scrolls at a size chosen for reading, not the smallest.
   */
  fallback?: number
  /**
   * Read the range from the content's stylesheet on every fit: `--chart-min`,
   * `--chart-max` and `--chart-base` (the fallback), in px. The page sets them
   * per screen shape, so turning the iPad picks up the other range. The values
   * passed in are used where the stylesheet sets none.
   */
  cssVars?: boolean
  /**
   * Mark the container `data-cramped="on"` when not even the essential part
   * fits, so the page can make room (smaller chord diagrams). On by default.
   */
  cramped?: boolean
}

interface Range {
  min: number
  max: number
  fallback?: number
}

/** A px custom property from a computed style, or `otherwise` when it is not set. */
function cssPx<T extends number | undefined>(style: CSSStyleDeclaration, name: string, otherwise: T): number | T {
  const value = parseFloat(style.getPropertyValue(name))
  return Number.isNaN(value) ? otherwise : value
}

/** The range the stylesheet sets on `content`, else the one passed in. */
function rangeFrom(content: HTMLElement, passed: Range): Range {
  const style = getComputedStyle(content)
  return {
    min: cssPx(style, '--chart-min', passed.min),
    max: cssPx(style, '--chart-max', passed.max),
    fallback: cssPx(style, '--chart-base', passed.fallback),
  }
}

/**
 * Sets `content`'s font size to the largest value (px) at which it fits
 * inside `container` without scrolling, found by binary search on real
 * layout. If even `min` does not fit, the essential part (if given) is fitted
 * instead, at the largest size at which it fits. If not even that fits, the
 * size goes back to `fallback` (else stays at `min`) and the rest scrolls, so
 * chords are never shrunk to unreadable.
 *
 * `contentKey` must change whenever the text changes (song, transpose, ...).
 * Changes to the container's size (rotating the iPad, hiding the chord
 * diagrams) are picked up by a ResizeObserver.
 */
export function useFitText(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  contentKey: string,
  { min, max, enabled, preferNoWrapMin, essentialRef, fallback, cssVars = false, cramped = true }: FitOptions,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!enabled || !container || !content) return

    const fits = () =>
      container.scrollHeight <= container.clientHeight + 1 &&
      container.scrollWidth <= container.clientWidth + 1

    const essentialFits = () => {
      const essential = essentialRef?.current
      if (!essential) return false
      const bottom = essential.getBoundingClientRect().bottom - container.getBoundingClientRect().top + container.scrollTop
      return bottom <= container.clientHeight + 1 && container.scrollWidth <= container.clientWidth + 1
    }

    const largestFitting = (fits: () => boolean, range: Range) => {
      let lo = range.min
      let hi = range.max
      let best = range.min
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        content.style.fontSize = `${mid}px`
        if (fits()) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      return best
    }

    const fitBy = (fits: () => boolean, range: Range) => {
      if (preferNoWrapMin !== undefined) {
        content.dataset.wrap = 'off'
        const unwrapped = largestFitting(fits, range)
        if (unwrapped >= preferNoWrapMin) {
          content.style.fontSize = `${unwrapped}px`
          return
        }
        content.dataset.wrap = 'on'
      } else {
        // Left from the last chart, it would keep this one's lines from wrapping
        delete content.dataset.wrap
      }
      content.style.fontSize = `${largestFitting(fits, range)}px`
    }

    const fit = () => {
      const range = cssVars ? rangeFrom(content, { min, max, fallback }) : { min, max, fallback }
      fitBy(fits, range)
      if (!fits() && essentialRef?.current) fitBy(essentialFits, range)
      const lost = !fits() && !essentialFits()
      // Not even the chords fit: read them at the size chosen for reading, and scroll
      if (range.fallback !== undefined && lost) content.style.fontSize = `${range.fallback}px`
      // Say so, so the page can make room (smaller chord diagrams). Kept until
      // the content changes, so the room it makes cannot take it away again and flicker.
      if (cramped && essentialRef?.current && lost) container.dataset.cramped = 'on'
    }

    delete container.dataset.cramped

    fit()

    if (typeof ResizeObserver === 'undefined') return
    // Observing the container, not the content: the container's size does not
    // depend on the font size, so refitting here cannot loop.
    const observer = new ResizeObserver(() => fit())
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, contentRef, contentKey, min, max, enabled, preferNoWrapMin, essentialRef, fallback, cssVars, cramped])
}
```

- [ ] **Step 4: Give band charts their fit in `SongSheet`**

`app/src/components/song/SongSheet.tsx`, after `const NO_WRAP_MIN_PX = 30` (line 28):

```ts
/** A chart in bands, in portrait: used where the stylesheet sets none (bands.css sets them per screen shape). */
const BAND_BASE_PX = 32
const BAND_MIN_PX = 28
const BAND_MAX_PX = 45
```

Replace the `useFitText` call (lines 130–137):

```ts
  useFitText(scrollRef, fitRef, fitKey, {
    // A chart in bands takes its range from bands.css, and when not even its
    // bands fit it goes back to the base size and scrolls, rather than
    // shrinking the chart and the chord shapes
    ...(bands
      ? { min: BAND_MIN_PX, max: BAND_MAX_PX, fallback: BAND_BASE_PX, cssVars: true, cramped: false }
      : { min: MIN_CHART_PX, max: MAX_CHART_PX, preferNoWrapMin: NO_WRAP_MIN_PX }),
    enabled: !!song && !editMode,
    // A long chart keeps its chords on screen; the notes under them can scroll
    essentialRef: sectionsRef,
  })
```

- [ ] **Step 5: Run the tests and check they pass**

Run: `npx vitest run src/tests/hooks/use-fit-text.test.tsx src/tests/components/band-chart.test.tsx`
Expected: PASS.

Run: `npx vitest run && npx tsc -b --noEmit`
Expected: all pass.

Run: `grep -rn "narrow" src/hooks src/components/song src/styles/bars.css src/styles/bands.css`
Expected: nothing about `data-narrow`.

- [ ] **Step 6: Commit (local)**

```bash
git status --short
git add src/hooks/use-fit-text.ts src/components/song/SongSheet.tsx src/tests/hooks/use-fit-text.test.tsx src/tests/components/band-chart.test.tsx
git commit -m "feat: band charts fit to the stylesheet's range and fall back to the base size

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Section colours on stage

**Files:**
- Modify: `app/src/styles/theme.css`, the `body.stage` block (lines 62–68 after Task 1)
- Test: `app/src/tests/components/chart-styles.test.ts`

**Interfaces:**
- Consumes from Task 1: `--section-solo` in `body.stage`.
- Produces: the stage section colours listed under Global Constraints.

- [ ] **Step 1: Write the failing test**

`app/src/tests/components/chart-styles.test.ts`:
1. In `'has a solo colour in every theme'`, delete the line `expect(between(theme, 'body.stage {', '}')).toContain('--section-solo: #ffffff;')`.
2. Add to `describe('section colours')`:

```ts
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
```

- [ ] **Step 2: Run it and check it fails**

Run: `npx vitest run src/tests/components/chart-styles.test.ts`
Expected: FAIL. The stage block has `--section-verse: #ffffff;`.

- [ ] **Step 3: Set the colours**

`app/src/styles/theme.css`, `body.stage` block: replace these five lines

```css
  --section-verse: #ffffff;
  --section-chorus: #ffffff;
  --section-bridge: #ffffff;
  --section-prechorus: #ffffff;
  --section-solo: #ffffff;
```

with

```css
  --section-verse: #6ab4ff;
  --section-chorus: #5ff08f;
  --section-bridge: #ffa14a;
  --section-prechorus: #d6a6ff;
  --section-solo: #ff8ad0;
```

Leave `--section-intro: #cccccc;` and `--section-default: #cccccc;` as they are.

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/tests/components/chart-styles.test.ts && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit (local)**

```bash
git status --short
git add src/styles/theme.css src/tests/components/chart-styles.test.ts
git commit -m "feat: section colours on stage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The shapes strip starts closed on stage, with its own saved setting

**Files:**
- Modify:
  - `app/src/store/view-settings.ts`
  - `app/src/store/use-store.ts` (lines 3, 9, 12, 22, 24 and `hydrate` at lines 713–800)
  - `app/src/components/diagrams/DiagramsBar.tsx:25`
  - `app/src/components/layout/TopBar.tsx:35`
  - `app/src/components/song/SongSheet.tsx:38`
  - `app/src/styles/bands.css`
- Test:
  - `app/src/tests/store/view-settings.test.ts`
  - `app/src/tests/components/diagrams-toggle.test.tsx` (replace the third test)
  - `app/src/tests/components/chart-styles.test.ts`

**Interfaces:**
- Consumes: the existing `saveSetting` and `getSetting` from `store/persistence`, and the existing `getTheme` and `getDiagramsVisible`.
- Produces:
  - `ViewSettings.stageDiagramsVisible: boolean` (default `false`)
  - `shapesShown(s: Pick<ViewSettings, 'viewMode' | 'diagramsVisible' | 'stageDiagramsVisible'>): boolean`
  - `readViewSettings(): Promise<Partial<Pick<ViewSettings, 'theme' | 'viewMode' | 'diagramsVisible' | 'stageDiagramsVisible' | 'simpleChords' | 'guitar' | 'instrument'>>>`
  - `toggleDiagrams()` flips `stageDiagramsVisible` while on stage, and `diagramsVisible` otherwise.

- [ ] **Step 1: Write the failing tests**

`app/src/tests/store/view-settings.test.ts`:
1. Add `import { shapesShown } from '../../store/view-settings'`.
2. Add this block at the end:

```ts
describe('the shapes strip on stage', () => {
  it('starts closed on stage, and the usual setting stays as it was', () => {
    useStore.setState({ viewMode: 'stage' })
    expect(shapesShown(useStore.getState())).toBe(false)
    expect(useStore.getState().diagramsVisible).toBe(true)
  })

  it('is opened on stage on its own, and saved', async () => {
    useStore.setState({ viewMode: 'stage' })
    useStore.getState().toggleDiagrams()
    expect(shapesShown(useStore.getState())).toBe(true)
    expect(useStore.getState().diagramsVisible).toBe(true)
    await toLand(async () => expect(await getSetting('stageDiagramsVisible')).toBe(true))
  })

  it('is still open after a relaunch', async () => {
    useStore.setState({ viewMode: 'stage' })
    useStore.getState().toggleDiagrams()
    await toLand(async () => expect(await getSetting('stageDiagramsVisible')).toBe(true))

    useStore.setState(useStore.getInitialState())
    await useStore.getState().hydrate()
    expect(useStore.getState().stageDiagramsVisible).toBe(true)
  })

  it('ignores a saved value that is not yes or no', async () => {
    const database = await db()
    await database.put('settings', 'yes', 'stageDiagramsVisible')
    await useStore.getState().hydrate()
    expect(useStore.getState().stageDiagramsVisible).toBe(false)
  })
})
```

`app/src/tests/components/diagrams-toggle.test.tsx`: replace the third test, `'keeps the handle on stage, where a bigger chart matters most'`, with:

```tsx
  it('starts closed on stage, so the chart gets the room', () => {
    useStore.setState({ viewMode: 'stage' })
    render(<DiagramsBar />)
    expect(screen.queryByRole('list', { name: 'Chord shapes' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Show the chord shapes' })).toBeInTheDocument()
  })

  it('opens on stage without touching the usual setting', () => {
    useStore.setState({ viewMode: 'stage', diagramsVisible: false })
    render(<DiagramsBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Show the chord shapes' }))
    expect(useStore.getState().stageDiagramsVisible).toBe(true)
    expect(useStore.getState().diagramsVisible).toBe(false)
    expect(screen.getByRole('button', { name: 'Hide the chord shapes' })).toBeInTheDocument()
  })
```

`app/src/tests/components/chart-styles.test.ts`, add to `describe('the band chart stylesheet')`:

```ts
  it('makes the shapes handle readable on stage', () => {
    expect(between(css('bands.css'), 'body.stage .diagrams-collapsed {', '}')).toContain('font-size: 16px;')
  })
```

- [ ] **Step 2: Run them and check they fail**

Run: `npx vitest run src/tests/store/view-settings.test.ts src/tests/components/diagrams-toggle.test.tsx src/tests/components/chart-styles.test.ts`

Expected: FAIL.
- `shapesShown` is not exported.
- On stage the strip is open.
- There is no stage handle rule.

- [ ] **Step 3: Add the setting, the selector and the read to `view-settings.ts`**

`app/src/store/view-settings.ts`:

1. The import from `./persistence` becomes:

```ts
import { saveTheme, saveDiagramsVisible, saveSetting, getSetting, getTheme, getDiagramsVisible } from './persistence'
```

2. In `interface ViewSettings`, after `diagramsVisible: boolean`:

```ts
  /** The chord shapes strip on stage: its own setting, closed to start with so the chart gets the room. Saved. */
  stageDiagramsVisible: boolean
```

3. In the returned defaults, after `diagramsVisible: true,`: `    stageDiagramsVisible: false,`
4. Replace `toggleDiagrams`:

```ts
    toggleDiagrams: () => {
      // On stage the strip has a setting of its own, so opening it there leaves the usual one alone
      if (get().viewMode === 'stage') {
        set(state => ({ stageDiagramsVisible: !state.stageDiagramsVisible }))
        persist('save stageDiagramsVisible', () => saveSetting('stageDiagramsVisible', get().stageDiagramsVisible))
        return
      }
      set(state => ({ diagramsVisible: !state.diagramsVisible }))
      // Remembered, so hiding them for a bigger chart sticks across launches.
      persist('saveDiagramsVisible', () => saveDiagramsVisible(get().diagramsVisible))
    },
```

5. Add at the end of the file:

```ts
/** Whether the chord shapes strip is open: on stage it has a setting of its own. */
export const shapesShown = (s: Pick<ViewSettings, 'viewMode' | 'diagramsVisible' | 'stageDiagramsVisible'>): boolean =>
  s.viewMode === 'stage' ? s.stageDiagramsVisible : s.diagramsVisible

/**
 * The saved view settings, for the store's hydrate. A value that is missing
 * or not one the app knows is left out, so the default stays.
 */
export async function readViewSettings(): Promise<
  Partial<Pick<ViewSettings, 'theme' | 'viewMode' | 'diagramsVisible' | 'stageDiagramsVisible' | 'simpleChords' | 'guitar' | 'instrument'>>
> {
  const [theme, diagramsVisible, stageDiagramsVisible, viewMode, simpleChords, guitar, instrument] = await Promise.all([
    getTheme(),
    getDiagramsVisible(),
    getSetting<boolean>('stageDiagramsVisible'),
    getSetting<ViewMode>('viewMode'),
    getSetting<boolean>('simpleChords'),
    getSetting<Guitar | 'auto'>('guitar'),
    getSetting<Instrument>('instrument'),
  ])
  return {
    ...(theme && { theme }),
    ...(typeof diagramsVisible === 'boolean' && { diagramsVisible }),
    ...(typeof stageDiagramsVisible === 'boolean' && { stageDiagramsVisible }),
    ...((viewMode === 'stage' || viewMode === 'normal') && { viewMode }),
    ...(typeof simpleChords === 'boolean' && { simpleChords }),
    ...((guitar === 'auto' || guitar === 'acoustic' || guitar === 'electric') && { guitar }),
    ...((instrument === 'guitar' || instrument === 'keyboard') && { instrument }),
  }
}
```

- [ ] **Step 4: Hydrate through `readViewSettings` in `use-store.ts`**

`app/src/store/use-store.ts`:
1. Imports:
   - Line 3 drops `Theme, ViewMode`: `import type { Song, Section, SongEdits, SongVersion, Setlist, SetlistData } from '../types'`.
   - Line 9 drops `type Instrument`: `import { MAX_CAPO, type ChartView } from '../music/chart-view'`.
   - Line 12: `import { readViewSettings, viewSettings, type ViewSettings } from './view-settings'`.
   - In the `./persistence` import list, delete the lines `  getTheme,` and `  getDiagramsVisible,`.
2. In `hydrate`, replace the eleven `let` lines with:

```ts
    let setlistDataResult: SetlistData | undefined
    let customSongsResult: Song[] = []
    let selectedVoicingsResult: Record<string, number> | undefined
    let positionResult: SavedPosition | undefined
    let ownShapesResult: Record<string, string[]> | undefined
    let viewResult: Awaited<ReturnType<typeof readViewSettings>> = {}
```

3. Replace the destructuring and `Promise.all` with:

```ts
      ;[setlistDataResult, customSongsResult, selectedVoicingsResult, positionResult, ownShapesResult, viewResult] = await Promise.all([
        getSetlistData(),
        getCustomSongs(),
        getSelectedVoicings(),
        getSetting<SavedPosition>('position'),
        getSetting<Record<string, string[]>>('ownShapes'),
        readViewSettings(),
      ])
```

4. In the final `set(state => …)`, replace the line `...(themeResult && { theme: themeResult }),` with `...viewResult,`. Delete these five lines:
   - `...(typeof diagramsVisibleResult === 'boolean' && …)`
   - `...((viewModeResult === …`
   - `...(typeof simpleResult === …`
   - `...((guitarResult === …`
   - `...((instrumentResult === …`

5. Check: `wc -l src/store/use-store.ts` prints 797. Keep line 10 (`import { setOwnShapes, type Guitar } from '../music/voicings'`) as it is: `setSongGuitar` still uses `Guitar` (lines 233 and 481).

- [ ] **Step 5: Read `shapesShown` everywhere the strip's state is read, and size the stage handle**

Make these three edits:
- `app/src/components/diagrams/DiagramsBar.tsx:25`: `const diagramsVisible = useStore(shapesShown)`. Add `import { shapesShown } from '../../store/view-settings'` after the `use-store` import (line 2).
- `app/src/components/layout/TopBar.tsx:35`: `const diagramsVisible = useStore(shapesShown)`. Add `import { shapesShown } from '../../store/view-settings'` after line 2.
- `app/src/components/song/SongSheet.tsx:38`: `const diagramsVisible = useStore(shapesShown)`. Add `import { shapesShown } from '../../store/view-settings'` after line 2.

The local name stays `diagramsVisible`, so nothing else in these files changes. On stage, section headers become buttons only when the strip is open there.

`app/src/styles/bands.css`: add just before `/* ---------- An iPad on its side: eight bars a row ---------- */`:

```css
/* ---------- On stage ----------
   The shapes strip starts closed on stage; its handle must read at arm's length */
body.stage .diagrams-collapsed { font-size: 16px; }
```

- [ ] **Step 6: Run the tests and check they pass**

Run: `npx vitest run src/tests/store/view-settings.test.ts src/tests/components/diagrams-toggle.test.tsx src/tests/components/chart-styles.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc -b --noEmit`

Expected: all pass, including `stage-polish`, `section-focus`, `top-bar` and `hydrate`.

If a stage test expected the strip open on stage, read it before changing anything: decision 3 in the spec makes the stage strip closed, so the test's expectation is the thing to update, with the reason in its name.

- [ ] **Step 7: Commit (local)**

```bash
git status --short
git add src/store/view-settings.ts src/store/use-store.ts src/components/diagrams/DiagramsBar.tsx src/components/layout/TopBar.tsx src/components/song/SongSheet.tsx src/styles/bands.css src/tests/store/view-settings.test.ts src/tests/components/diagrams-toggle.test.tsx src/tests/components/chart-styles.test.ts
git commit -m "feat: shapes strip closed on stage, with its own saved setting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Release 3.64.0, measured on real layout

**Files:**
- Modify: `app/src/version.ts`, `docs/superpowers/specs/2026-10-13-chart-readability-design.md` (Part 5, the "Honest fit numbers" paragraph)

**Interfaces:**
- Consumes: everything above.
- Produces: 3.64.0 live at https://yanlukan.github.io/gm-setlist/.

- [ ] **Step 1: Bump the version and run everything**

`app/src/version.ts`: `export const APP_VERSION = '3.63.0'` becomes `export const APP_VERSION = '3.64.0'`.

Run: `npx vitest run && npx tsc -b --noEmit && npm run build`
Expected: all tests pass, no type errors, and the build succeeds.

Run: `wc -l src/store/use-store.ts src/styles/layout.css src/components/song/SongSheet.tsx`
Expected: 797, 1133, and under 800.

- [ ] **Step 2: Measure the built app**

Start the built preview: `preview_start` with `{ name: 'playbook-built' }` (port 5178, from `.claude/launch.json`).

For each viewport, run the check below for Kissing a Fool and Faith, in the dark theme and on stage. Also run Kissing a Fool in the light theme at 820×1180. Viewports, set with `resize_window`:
- iPad portrait, 820×1180
- iPad landscape, 1180×820
- phone, 390×844

To open a song, use the setlist screen or swipe. Theme and stage are in the menu.

```js
(() => {
  const chart = document.querySelector('.chart')
  const scroll = document.querySelector('.chart-scroll')
  const grid = document.querySelector('.band-chart .bar-grid')
  const px = el => parseFloat(getComputedStyle(el).fontSize)
  const smallest = sel => Math.min(...Array.from(document.querySelectorAll(sel)).filter(el => el.offsetParent).map(px))
  const shown = sel => Array.from(document.querySelectorAll(sel)).filter(el => el.offsetParent)
  return {
    chartPx: px(chart),
    columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    barLefts: [...new Set(shown('.band-chart .bar').map(b => Math.round(b.getBoundingClientRect().left)))].sort((a, b) => a - b),
    smallestChord: smallest('.band-chart .bar-chord, .band-chart .bar-repeat, .band-chart .chart-mark, .band-chart .chord-alt'),
    smallestHeader: smallest('.band-head .chart-label, .band-letter, .form-chip, .chart-position, .chart-preset, .chart-edited'),
    smallestCell: Math.min(...shown('.band-chart .bar, .band-chart .bar-pad').map(c => c.getBoundingClientRect().height)),
    overflow: scroll.scrollHeight - scroll.clientHeight,
  }
})()
```

Expected for each viewport:
- `columns` is 4 in portrait, 8 in landscape and 2 on the phone.
- `barLefts` has no more distinct values than `columns`, so the bars line up.
- `smallestChord` is 24 or more, `smallestHeader` 16 or more, and `smallestCell` 44 or more.
- `chartPx` is in the range for that shape.

Take a screenshot of each pair. Watch for these:
- the double bar at each section's start
- the stronger line between bars 4 and 5 in landscape
- `(x2)` at the end of its bar
- no blank cells showing on the phone
- the lettered strip matching the bands
- the strip closed on stage, with its 16px handle

If a measurement misses its floor, fix it in `bands.css`, add a test to `chart-styles.test.ts` for it, rerun Step 1, and measure again.

- [ ] **Step 3: Write the measured numbers into the spec**

In `docs/superpowers/specs/2026-10-13-chart-readability-design.md`, Part 5, replace the "Honest fit numbers" estimates with the measured values. For Kissing a Fool and Faith, give each shape's `chartPx` and `overflow` in px and in screens (`overflow / clientHeight + 1`), with the strip closed and open. Say they were measured on 3.64.0 in the built preview.

- [ ] **Step 4: Commit, push and confirm it is live**

```bash
git status --short
git add src/version.ts ../docs/superpowers/specs/2026-10-13-chart-readability-design.md
git commit -m "chore: release 3.64.0, charts in colour bands with letters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch origin
git status -sb
```

If the branch is behind `origin/main` (another session pushed), run `git pull --rebase origin main`, then `npx vitest run && npm run build` again before pushing.

```bash
git push origin main
gh run watch
curl -s https://yanlukan.github.io/gm-setlist/ | grep -o 'assets/index-[^"]*\.js'
```

Then fetch that bundle and confirm it holds the new version:

```bash
curl -s https://yanlukan.github.io/gm-setlist/assets/<index file from above> | grep -c "3.64.0"
```

Expected: a count of 1 or more.

Then re-index the code for lookups: `index_folder` with `incremental=true`.
