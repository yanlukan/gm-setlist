# Bars and lines you write (3.57.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charts can be written in bars (`|` bar line, `%` repeat the bar before), are shown as equal bar boxes in columns, and the editor saves the lines it shows, with fast keys for bars in both tap and Type modes.

**Architecture:** Section text stays plain (`  ` between tokens, `\n` between lines). A new `music/bars.ts` reads bars out of a written line and tidies pasted ChordPro grid writing. `SongSheet` draws any section with bars through a new `BarGrid` (one CSS grid per section, equal `1fr` columns). The editor drops the 3.56.0 one-line saving (`keptLines`, `isLaidOutByParts`); the part guess (`layOutParts`) is kept only for a one-line section without bars.

**Tech Stack:** React 19 + Vite + TypeScript PWA in `app/`, Vitest + Testing Library, plain CSS files under `app/src/styles/`.

**Spec:** `docs/superpowers/specs/2026-10-12-bars-and-lines-design.md`

## Global Constraints

- Code files 800 lines or fewer; `layout.css` (1133 lines) must not grow. New styles go in `styles/bars.css`, imported from `global.css`.
- No change to `songs.ts` in 3.57.0. Song batches start at 3.58.0.
- No data conversion: saved charts are read as they are.
- Version `3.57.0` in `app/src/version.ts`.
- Run from `app/`: tests `npx vitest run`, types `npx tsc -b --noEmit`, build `npm run build`.
- Push to main after tests and build pass; confirm `3.57.0` in the live bundle at https://yanlukan.github.io/gm-setlist/.
- Never quote lyrics.

## Review Focus

1. Bar lines typed glued to chords on a hardware keyboard (`C|G`, `|C`, `||`): must read as bar lines, not unknown chords. Test in Task 1.
2. A bar key tapped while a chord is selected: the bar goes in after the chord and never replaces it. Test in Task 3.
3. Capo, transpose and plain chords on a chart with bars keep every `|` and `%`, and bar tokens never reach the chord shapes. Test in Task 1.
4. A section that mixes barred lines with a plain line (N.C., or a blank line): order kept, plain line runs across the grid. Test in Task 2.
5. A no-op in the editor (Backspace at the very start of a section) must save nothing, so the song does not turn EDITED. Test in Task 3.

## Refinements to the spec, decided while planning

- `%` is always a whole bar of its own, and a line with `%` but no `|` also counts as written in bars, so `C  %  G  %` is four bars.
- A repeat count such as `(x2)` after the last bar line belongs to the last bar instead of making a bar of its own.
- `isChartMark` (theory.ts) now also matches `|` and `%`. Every place that already skips N.C. and `(x2)` as "not a chord" (song chords, capo finder, band positions, the strum on tap) then skips bar tokens too.
- The component is `BarGrid.tsx` (one grid per section) rather than `BarRow.tsx`: equal widths across the lines of a section need one grid.
- `relayOut` stays, for one case only: an edit that leaves a section as one line with no bars. The chart lays such a line out by its parts, so the editor does the same and keeps the cursor with its chord. The lines are then saved as shown, and the guess ends for that section.
- The font measurement for all 21 songs moves to the song batches (3.58.0 on). 3.57.0 changes no song, so before and after are equal. 3.57.0 is checked in the preview with a typed barred chart at iPad and phone sizes.

---

### Task 1: The bar format in the music layer

**Files:**
- Create: `app/src/music/bars.ts`
- Modify: `app/src/music/theory.ts:128` (`isChartMark`), `app/src/music/chord-text.ts` (`parseChordText`, `isChordToken`), `app/src/music/phrases.ts` (`layOutParts` skips bars; remove `keptLines`, `isLaidOutByParts`; `relayOut` returns `{ lines, caret }`)
- Test: `app/src/tests/music/bars.test.ts` (new), `app/src/tests/music/theory.test.ts`, `app/src/tests/music/phrases.test.ts`

**Interfaces:**
- Produces: `BAR = '|'`, `REPEAT_BAR = '%'`, `hasBars(line: string | string[]): boolean`, `barsOf(tokens: string[]): string[][]`, `isRepeatCount(token: string): boolean`, `fromGrid(text: string): string`; `isChartMark('|') === true`.

- [ ] **Step 1: Write the failing tests** (`bars.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { barsOf, fromGrid, hasBars } from '../../music/bars'
import { parseChordText, normalizeChordText, unknownChords } from '../../music/chord-text'
import { layOutParts } from '../../music/phrases'
import { simplifyText, songChordsOf } from '../../music/chart-view'
import { transposeText } from '../../music/theory'

const bars = (line: string) => barsOf(line.split(/\s+/).filter(Boolean))

describe('a line written in bars', () => {
  it('splits at the bar lines, two chords sharing a bar', () => {
    expect(bars('|  Cadd9  |  Em11  |  C  G/B  |')).toEqual([['Cadd9'], ['Em11'], ['C', 'G/B']])
  })
  it('makes chords before the first bar line or after the last a bar of their own', () => {
    expect(bars('Cadd9  |  Em11')).toEqual([['Cadd9'], ['Em11']])
  })
  it('makes % a whole bar, and drops an empty bar', () => {
    expect(bars('|  Am  |  %  |  |  F  %')).toEqual([['Am'], ['%'], ['F'], ['%']])
  })
  it('keeps a repeat count with the bar before it', () => {
    expect(bars('|  Am  |  F  |  (x2)')).toEqual([['Am'], ['F', '(x2)']])
  })
  it('knows a line with bars', () => {
    expect(hasBars('C  |  G')).toBe(true)
    expect(hasBars('C  %')).toBe(true)
    expect(hasBars('C  G  N.C.  (x2)')).toBe(false)
  })
})

describe('bars typed or pasted', () => {
  it('reads bar lines typed against a chord, and drops ChordPro beat dots', () => {
    expect(parseChordText('|C . . .|G/B . . .||')).toEqual([['|', 'C', '|', 'G/B', '|']])
    expect(normalizeChordText('C|G\n| Am . . | % |')).toBe('C  |  G\n|  Am  |  %  |')
    expect(fromGrid('|. C . |')).toBe(' |   C   | ')
  })
  it('never flags | or % as not a chord', () => {
    expect(unknownChords('|  C  |  %  |')).toEqual([])
  })
})

describe('bars through the rest of the app', () => {
  it('are never laid out by parts', () => {
    expect(layOutParts('|  D  G  C  |  D  G  C  |')).toBe('|  D  G  C  |  D  G  C  |')
  })
  it('survive a key change and plain chords', () => {
    expect(transposeText('|  C  |  %  |', 2, false)).toBe('|  D  |  %  |')
    expect(simplifyText('|  Cmaj7  |  %  |')).toBe('|  C  |  %  |')
  })
  it('are not chords of the song', () => {
    const song = { title: 'T', key: 'C', sections: [{ name: 'Verse', chords: '|  C  |  %  |  G  |' }] }
    expect(songChordsOf(song as never, undefined)).toEqual(['C', 'G'])
  })
})
```

Also in `theory.test.ts`, the isChartMark truthy list gains `'|'` and `'%'`; in `phrases.test.ts`, the `keptLines` and `isLaidOutByParts` blocks go and the `relayOut` expectations lose their `text` field.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/tests/music/bars.test.ts`
Expected: FAIL, cannot resolve `../../music/bars`.

- [ ] **Step 3: Implement**

`music/bars.ts`:

```ts
/** A bar line, written between bars. */
export const BAR = '|'
/** The bar before, played again: always a whole bar of its own. */
export const REPEAT_BAR = '%'

/** A repeat count such as (x2): it goes with the bar before it, never a bar of its own. */
export const isRepeatCount = (token: string) => /^\(?x\d+\)?$/i.test(token)

/** A line is written in bars when it has a bar line or a repeat bar. */
export function hasBars(line: string | string[]): boolean {
  const tokens = typeof line === 'string' ? line.split(/\s+/) : line
  return tokens.some(t => t === BAR || t === REPEAT_BAR)
}

/**
 * A written line's bars, the chords in each. Bar lines divide them; chords
 * before the first bar line or after the last are a bar of their own, % is
 * a whole bar, and two bar lines together leave no empty bar.
 */
export function barsOf(tokens: string[]): string[][] {
  const bars: string[][] = []
  let bar: string[] = []
  const close = () => {
    if (bar.length > 0) bars.push(bar)
    bar = []
  }
  for (const token of tokens) {
    if (token === BAR) close()
    else if (token === REPEAT_BAR) { close(); bars.push([REPEAT_BAR]) }
    else if (isRepeatCount(token) && bar.length === 0 && bars.length > 0) bars[bars.length - 1].push(token)
    else bar.push(token)
  }
  close()
  return bars
}

/**
 * ChordPro grid writing made plain: a bar line is a token of its own however
 * it was typed ("C|G", "||"), and the dots that stand for beats go.
 */
export function fromGrid(text: string): string {
  return text.replace(/\|+/g, ' | ').replace(/(^|\s)\.+(?=\s|$)/gm, '$1')
}
```

`theory.ts` `isChartMark`: `return token === '|' || token === '%' || /^(N\.?C\.?|\(?x\d+\)?)$/i.test(token);`, with the doc comment saying bar lines and repeat bars are marks too.

`chord-text.ts`: `parseChordText` runs `fromGrid` on the cleaned text before splitting; `isChordToken` becomes `isChartMark(token) || chordNotes(token) !== null`.

`phrases.ts`: `layOutParts` returns the text unchanged when it has a line break or `hasBars(text)`. Delete `keptLines` and `isLaidOutByParts`. `relayOut` returns `{ lines, caret }`.

- [ ] **Step 4: Run tests, types**

Run: `npx vitest run src/tests/music && npx tsc -b --noEmit`
Expected: music tests PASS; tsc errors only in `ChartEditor.tsx` (fixed in Task 3).

- [ ] **Step 5: Commit** with Task 3 (the tree does not type-check between them).

### Task 2: Bars on the chart

**Files:**
- Create: `app/src/components/song/BarGrid.tsx`, `app/src/styles/bars.css`
- Modify: `app/src/components/song/SongSheet.tsx` (`renderChords`), `app/src/styles/global.css` (import)
- Test: `app/src/tests/components/bar-chart.test.tsx` (new)

**Interfaces:**
- Consumes: `barsOf`, `hasBars`, `isRepeatCount`, `REPEAT_BAR` from Task 1.
- Produces: `BarGrid({ lines: string[]; renderTokens: (text: string) => ReactNode })`; DOM: `.bar-grid` with inline `grid-template-columns: repeat(N, 1fr)`, cells `.bar` (`.bar-first`, `.bar-last`), `.bar-chord`, `.bar-repeat`, plain lines `.chart-line.bar-plain`.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongSheet } from '../../components/song/SongSheet'
import { useStore } from '../../store/use-store'

beforeEach(() => useStore.setState(useStore.getInitialState()))

const faith = (chords: string) => {
  useStore.getState().saveSections('Faith', [{ name: 'Verse', chords }])
  return render(<SongSheet />).container
}
const rows = (grid: Element) => Array.from(grid.children).map(cell => cell.textContent)

describe('a section written in bars', () => {
  it('draws a box per bar, as many columns as the longest line has bars', () => {
    const page = faith('|  D  |  %  |  G  A  |  D  |\nN.C.\n|  Bm7  |  G  |')
    const grid = page.querySelector('.bar-grid')!
    expect((grid as HTMLElement).style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    expect(rows(grid)).toEqual(['D', '%', 'GA', 'D', 'N.C.', 'Bm7', 'G'])
    expect(grid.querySelectorAll('.bar-first')).toHaveLength(2)
    expect(grid.querySelector('.bar-plain')?.textContent).toBe('N.C.')
    expect(grid.querySelector('.bar-repeat')?.getAttribute('aria-label')).toBe('Repeat the bar before')
  })
  it('leaves a section without bars as typed lines', () => {
    const page = faith('D  G\nA  D')
    expect(page.querySelector('.bar-grid')).toBeNull()
    expect(page.querySelectorAll('.chart-chords .chart-line')).toHaveLength(2)
  })
})
```

Faith must be the first song of the gig setlist (`currentIndex` 0); if not, set `currentIndex` to `GIG_SETLIST_2026.indexOf('Faith')`.

- [ ] **Step 2: Run, see it fail** (`npx vitest run src/tests/components/bar-chart.test.tsx`)

- [ ] **Step 3: Implement**

`BarGrid.tsx`:

```tsx
import type { ReactNode } from 'react'
import { barsOf, hasBars, isRepeatCount, REPEAT_BAR } from '../../music/bars'

interface Props {
  /** The section's lines, as written. */
  lines: string[]
  /** How chords are drawn: tappable for their shapes, or plain on stage. */
  renderTokens: (text: string) => ReactNode
}

/**
 * A section written in bars: a box for each bar, every box as wide as the
 * widest in the section, so bar 1 of every line stands in the same column.
 * Two chords in a bar share it evenly. A line without bars (N.C., or one
 * left blank) runs across the whole width.
 */
export function BarGrid({ lines, renderTokens }: Props) {
  const rows = lines.map(line => line.split(/\s+/).filter(Boolean))
  const columns = Math.max(1, ...rows.filter(row => hasBars(row)).map(row => barsOf(row).length))
  return (
    <div className="bar-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {rows.map((row, li) => {
        if (!hasBars(row)) return <div key={li} className="chart-line bar-plain">{renderTokens(lines[li])}</div>
        const bars = barsOf(row)
        return bars.map((bar, bi) => (
          <div
            key={`${li}-${bi}`}
            className={['bar', bi === 0 ? 'bar-first' : '', bi === bars.length - 1 ? 'bar-last' : ''].filter(Boolean).join(' ')}
          >
            {bar.map((token, ti) =>
              token === REPEAT_BAR ? (
                <span key={ti} className="bar-repeat" aria-label="Repeat the bar before">%</span>
              ) : isRepeatCount(token) ? (
                <span key={ti} className="chart-mark bar-count">{token}</span>
              ) : (
                <span key={ti} className="bar-chord">{renderTokens(token)}</span>
              ))}
          </div>
        ))
      })}
    </div>
  )
}
```

`SongSheet.renderChords`: when `lines.some(hasBars)`, return `<BarGrid lines={lines} renderTokens={renderTokens} />`; otherwise the existing per-line output.

`bars.css` (import after `chart-lines.css` in `global.css`):

```css
/* A section written in bars: a box per bar, every box as wide as the widest
   in the section (equal 1fr columns in a grid only as wide as it needs), so
   the bars of every line stand in the same columns. */
.bar-grid {
  display: grid;
  width: max-content;
  max-width: 100%;
  row-gap: 0.2em;
}
.bar-plain { grid-column: 1 / -1; }
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  padding: 0 0.35em;
  border-left: 2px solid var(--text-muted);
}
.bar-first { grid-column-start: 1; }
.bar-last { border-right: 2px solid var(--text-muted); }
/* Chords in one bar share it evenly, as their beats do */
.bar-chord { flex: 1 1 0; min-width: max-content; }
.bar-repeat { flex: 1 1 0; text-align: center; font-weight: 600; color: var(--text-muted); }
.bar-count { margin-left: 0.25em; }
/* Set by the fit: a bar's chords stay side by side while that still reads big */
.chart[data-wrap="off"] .bar { flex-wrap: nowrap; }
```

- [ ] **Step 4: Run** the new test and `npx vitest run`; PASS.
- [ ] **Step 5: Commit** `feat: sections written in bars show as equal bar boxes in columns`.

### Task 3: The editor saves what it shows, with Bar and % keys

**Files:**
- Modify: `app/src/components/edit/ChartEditor.tsx`, `app/src/components/edit/ChordKeyboard.tsx`, `app/src/styles/bars.css`
- Test: `app/src/tests/components/editor-parts.test.tsx`, `app/src/tests/components/editor-bars.test.tsx` (new)

**Interfaces:**
- Consumes: `BAR`, `REPEAT_BAR`, `hasBars` (Task 1), `relayOut(lines, caret): { lines, caret }`.
- Produces: `ChordKeyboardProps.onBar: (token: string) => void`; buttons named `Bar line` and `Repeat the bar before`.

- [ ] **Step 1: Failing tests** (`editor-bars.test.tsx`), helpers as in `editor-parts.test.tsx`:

```tsx
it('puts a bar line after the chord selected, never in its place', () => {
  faithWith('D  G  C')
  chord('Verse', 0)
  tap('Bar line')
  expect(saved('Faith', 0)).toBe('D  |  G  C')
})
it('puts a repeat bar at the cursor and draws bar lines as their own buttons', () => {
  faithWith('|  D  |')
  fireEvent.click(within(section('Verse')).getByRole('button', { name: 'Cursor at the end of line 1' }))
  tap('Repeat the bar before')
  expect(saved('Faith', 0)).toBe('|  D  |  %')
  expect(section('Verse').querySelectorAll('.ce-chord.is-bar')).toHaveLength(2)
})
it('saves the lines it shows: three lines after a chord is deleted from the Love verse', () => {
  // LOVE song at its index; delete the first chord; saved has 3 lines; Undo leaves no edit
})
it('saves nothing for an edit that changes nothing', () => {
  // LOVE song; tap the gap before chord 1 of the verse; tap Delete (Backspace at the start); edits stay {}
})
```

`editor-parts.test.tsx`: the Undo test expects the saved verse to keep its three lines before Undo; "lays the lines out again" expects `'D  G  C\nD  G  C'` after the C goes in, then `'D  G  C\nD  G  C  E'`.

- [ ] **Step 2: Run, see them fail.**

- [ ] **Step 3: Implement**

`ChartEditor.changeChords`:

```ts
const changeChords = (i: number, produce: (lines: ChordLines) => Edited) => {
  const shown = linesOf(i)
  const edited = produce(shown)
  // One line with no bars is laid out by its parts, on the chart as here, so
  // the cursor follows its chord to the new lines. Any other lines are the
  // player's, kept as they are.
  const { lines, caret } = edited.lines.length === 1 && !hasBars(edited.lines[0])
    ? relayOut(edited.lines, edited.caret)
    : edited
  setDrafts(d => ({ ...d, [i]: lines }))
  setCursor({ kind: 'caret', section: i, ...caret })
  // Saved just as shown. Nothing changed, nothing saved: the song stays on its own chart
  const text = formatChordText(lines)
  if (text === formatChordText(shown)) return
  remember()
  onChords(i, text)
}
```

`putBar(token)`: inserts after a selected chord (`{ line, pos: index + 1 }`) or at the caret, through `insertChord`. `newLine` shares the same "after the selected chord" caret helper. The Type-mode `onChange` saves `typedText` when `normalizeChordText(typedText) !== normalizeChordText(layOutParts(section.chords))`, with `remember()` first. In `renderLine`, a `|` token gets `is-bar` and `aria-label="Bar line"`, a `%` gets `is-repeat`. The finder gets no chord when the selection is a mark. Hint for a selected bar line: `Bar line selected: Delete takes it out`.

`ChordKeyboard`: two tools before `↵ Line`:

```tsx
<button className="ck-tool ck-bar" onClick={() => onBar('|')} disabled={!ready} aria-label="Bar line">|</button>
<button className="ck-tool ck-bar" onClick={() => onBar('%')} disabled={!ready} aria-label="Repeat the bar before">%</button>
```

`bars.css` additions: `.ce-chord.is-bar { color: var(--text-muted); font-weight: 300; padding: 0 0.12em; }`, `.ce-chord.is-repeat { color: var(--text-muted); }`, `.ck-bar { min-width: 44px; padding: 0 8px; }`. Check the tools row at 375 px in the preview; if it overflows, let `.ck-tools` scroll sideways as `.ck-tabs` does.

- [ ] **Step 4: Run** `npx vitest run && npx tsc -b --noEmit`; PASS.
- [ ] **Step 5: Commit** Tasks 1 and 3: `feat: bars in the chart text, and the editor keeps the lines it shows`.

### Task 4: One-tap keys in Type mode

**Files:**
- Create: `app/src/components/edit/TypeKeys.tsx`
- Modify: `app/src/music/chord-text.ts` (`typeAt`), `app/src/components/shared/AutoSaveText.tsx` (`read` on the handle), `app/src/components/edit/ChartEditor.tsx`, `app/src/styles/bars.css`
- Test: `app/src/tests/music/chord-text.test.ts`, `app/src/tests/components/editor-bars.test.tsx`

**Interfaces:**
- Produces: `typeAt(text: string, caret: number, token: string): { text: string; caret: number }`; `AutoSaveHandle.read(): { value: string; caret: number } | null`; `TypeKeys({ songChords: string[]; onKey: (token: string) => void })`, group named `Keys for typing chords`.

- [ ] **Step 1: Failing tests**

```ts
describe('typeAt', () => {
  it('spaces a key from what is either side of the caret', () => {
    expect(typeAt('C', 1, '|')).toEqual({ text: 'C  |  ', caret: 6 })
    expect(typeAt('C  |  ', 6, 'G')).toEqual({ text: 'C  |  G  ', caret: 9 })
    expect(typeAt('C  Am', 3, '|')).toEqual({ text: 'C  |  Am', caret: 6 })
    expect(typeAt('', 0, '|')).toEqual({ text: '|  ', caret: 3 })
  })
  it('starts a new line at the caret', () => {
    expect(typeAt('C  G  ', 6, '\n')).toEqual({ text: 'C  G\n', caret: 5 })
    expect(typeAt('C  G', 3, '\n')).toEqual({ text: 'C\nG', caret: 2 })
  })
})
```

Component test: open Type for Faith's Verse (`'D  G'`), tap `Bar line` in the `Keys for typing chords` group, expect the textbox value `'D  G  |  '` and the saved text `'D  G  |'`.

- [ ] **Step 2: Run, see them fail.**

- [ ] **Step 3: Implement**

```ts
/**
 * A key typed at the caret: two spaces either side, as the chart writes it,
 * or a line break with no spaces round it. The caret goes after it.
 */
export function typeAt(text: string, caret: number, token: string): { text: string; caret: number } {
  const before = text.slice(0, caret).replace(/[ \t]+$/, '')
  const after = text.slice(caret).replace(/^[ \t]+/, '')
  if (token === '\n') return { text: `${before}\n${after}`, caret: before.length + 1 }
  const lead = before === '' || before.endsWith('\n') ? '' : '  '
  const trail = after.startsWith('\n') ? '' : '  '
  const head = before + lead + token + trail
  return { text: head + after, caret: head.length }
}
```

`AutoSaveText` handle: `read: () => node.current ? { value: node.current.value, caret: document.activeElement === node.current ? (node.current.selectionStart ?? node.current.value.length) : node.current.value.length } : null`.

`TypeKeys.tsx`: a row of `ck-chip tk-key` buttons (`|` "Bar line", `%` "Repeat the bar before", `↵ Line` "New line", then the song's chords), each with `onMouseDown={e => e.preventDefault()}` so the text box keeps its focus and caret. `ChartEditor.typeKey(token)`: `read()`, `typeAt`, `set(text, caret)`, `setTyped`. The row sits above the suggestions in the section being typed into.

`bars.css`: `.tk { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 4px 0; } .tk-key { min-width: 44px; }`.

- [ ] **Step 4: Run** all tests and types; PASS.
- [ ] **Step 5: Commit** `feat: one-tap bar, repeat and line keys while typing chords`.

### Task 5: Release 3.57.0

- [ ] `version.ts` to `'3.57.0'`; `npx vitest run`, `npx tsc -b --noEmit`, `npm run build`.
- [ ] Preview (`playbook-built`, port 5178), after clearing the service worker and caches:
  - Type a barred verse into Faith in Type mode with the keys, and check the chart at 1180×820 (iPad landscape), 820×1180 (portrait) and 375×812 (phone): the columns line up, nothing scrolls sideways, and the chord names stay the largest text.
  - Check the tools row of the chord keyboard at 375 px.
  - Take a screenshot of each view.
  - Clear the test edit afterwards ("back to original").
- [ ] Commit `feat: ... (3.57.0)`, push, `gh run watch`, confirm `3.57.0` in the live `assets/index-*.js`.
- [ ] Update memory: `project_bars_design.md` (3.57.0 shipped; next is the song batches, I Can't Make You Love Me first).
