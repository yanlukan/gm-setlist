/**
 * One pedal press down (or up) a chart taller than the screen. Returns false
 * when there is nothing to page to, so the press changes song instead.
 *
 * Down pages only while chords are still hidden below: a chart whose chords
 * all fit turns to the next song at once, even if notes under them scroll.
 * Up pages until the top of the chart is back on screen.
 */
export function pageChart(direction: 1 | -1, root: ParentNode = document): boolean {
  const chart = root.querySelector<HTMLElement>('.chart-scroll')
  if (!chart) return false
  if (direction > 0) {
    const chords = chart.querySelector('.chart-sections')
    if (!chords) return false
    if (chords.getBoundingClientRect().bottom <= chart.getBoundingClientRect().bottom + 1) return false
  } else if (chart.scrollTop <= 0) {
    return false
  }
  // Most of a screen, so the last line before the turn is still in view after it
  chart.scrollBy({ top: direction * chart.clientHeight * 0.8, behavior: 'smooth' })
  return true
}
