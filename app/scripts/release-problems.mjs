// The release check's rules (release-check.mjs), apart from the browser so they can be tested:
// what counts as a problem on a page, and which problems are only warnings.

/** The smallest chart size: a row that does not fit here cannot fit at all. */
export const MIN_PX = 20
/** The phone, the one size where a row that cannot fit is a warning, not a failure. */
export const PHONE = 'phone-390x844'

export const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1

/**
 * The problems in one page, as [where, text, kind]: where is `bar <n>` or
 * `section <n>`, from 1; kind is 'width' for a row too wide for the screen and 'mark' for an unsure mark off it.
 * `bars` are the bars with chords, in the order of their numbers: each one's
 * section, its chords as written and its lines (1, or 2 staggered). `marks` are the unsure
 * marks: each one's rect and whether it runs past the screen; one may not cover a chord.
 */
export function problems({ chords, sections, bars = [], diagrams = 0, marks = [] }) {
  const found = sections.map(n => [`section ${n}`, 'runs past its width', 'width'])
  // The chart comes first: no chord diagram shows until a chord is tapped
  if (diagrams > 0) found.push(['screen', `${diagrams} chord diagram(s) shown before any tap`])
  // The same chords in one section are drawn the same way: on one line, or staggered
  bars.forEach((b, i) => {
    const first = bars.findIndex(o => o.section === b.section && o.chords === b.chords)
    if (b.chords && first < i && bars[first].lines !== b.lines) found.push([`bar ${i + 1}`, `drawn differently from bar ${first + 1}`])
  })
  chords.forEach((c, i) => {
    const n = `bar ${c.bar + 1}`
    if (c.px < 20) found.push([n, `${c.name} chord under 20 px (${c.px.toFixed(1)} px)`])
    const b = c.barRect
    if (b && (c.content.left < b.left - 1 || c.content.right > b.right + 1 || c.content.top < b.top - 1 || c.content.bottom > b.bottom + 1)) {
      found.push([n, `${c.name} runs past its bar`])
    }
    if (c.cutOff) found.push([n, `${c.name} cut off`])
    if (c.offScreen) found.push([n, `${c.name} off the screen`, 'width'])
    // Staggered, the chords read in playing order: each starts at least half the chart's size
    // after the one before, the first ends before the second starts (in a bar of three chords or
    // more; with two, the second may start under the first one's tail), and two on one line never
    // overlap. A chord may run on under the next one on the other line
    const prev = chords[i - 1]
    if (c.staggered && prev && prev.bar === c.bar) {
      if (c.text.left < prev.text.left + 0.5 * c.px - 1) found.push([n, `${c.name} out of order (starts under ${prev.name})`])
      const first = chords[i - 2]?.bar !== c.bar
      const third = chords[i + 1]?.bar === c.bar
      if (first && third && prev.text.right > c.text.left + 1) found.push([n, `${c.name} out of order (starts before ${prev.name} ends)`])
    }
    if (c.staggered) {
      for (const o of chords.slice(i + 1)) {
        if (o.bar === c.bar && o.row === c.row && Math.min(c.text.right, o.text.right) - Math.max(c.text.left, o.text.left) > 1) {
          found.push([n, `${o.name} out of order (overlaps ${c.name} on its line)`])
        }
      }
    }
    for (const o of chords.slice(i + 1)) {
      if (o.bar === c.bar && overlap(c.content, o.content)) found.push([n, `${c.name} overlaps ${o.name}`])
    }
  })
  // An unsure mark hangs over its bar's edge and may not cover any chord's text
  marks.forEach((m, i) => {
    const n = `mark ${i + 1}`
    if (m.offScreen) found.push([n, 'unsure mark off the screen', 'mark'])
    for (const c of chords) if (overlap(m.rect, c.text)) found.push([n, `unsure mark covers ${c.name}`])
  })
  return found
}

/**
 * Splits a page's problems into failures and warnings. On the phone, at the
 * smallest size, a row too wide for the screen is a warning: it cannot fit
 * there at any size. Everything else, and everything at any other size, fails.
 */
export function sortOut(sizeName, chartPx, found) {
  const warn = ([, , kind]) => sizeName === PHONE && chartPx <= MIN_PX + 0.01 && kind === 'width'
  return { failures: found.filter(p => !warn(p)), warnings: found.filter(warn) }
}
