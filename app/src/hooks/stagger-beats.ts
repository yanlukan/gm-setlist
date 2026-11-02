/** A bar to stagger, as measured: its beats, each chord's beat (0-based) and text width, in px. */
export interface BarMeasure {
  beats: number
  starts: number[]
  widths: number[]
  /** The gap between two beats */
  gap: number
  /** The chart's size */
  font: number
}

export interface StaggeredBeats {
  /** The smallest width of each beat */
  tracks: number[]
  /** Where each chord starts, from the bar's first beat */
  lefts: number[]
  /** The beats and the gaps between them, all told */
  width: number
}

/**
 * The smallest beats, one width each, for a bar whose chords alternate
 * between two lines (chord i on line i % 2 + 1), so that it reads in playing
 * order: each chord starts at least half the chart's size after the one
 * before, the first chord ends before the second starts, and each chord ends
 * before the next chord on its own line starts. A chord may run on under the
 * next one on the other line. The chords' starts are placed left to right,
 * then each run of beats between two starts gets the room between them,
 * shared evenly; the beats before the first chord get none.
 */
export function staggeredBeats({ beats, starts, widths, gap, font }: BarMeasure): StaggeredBeats {
  const n = starts.length
  const lefts: number[] = []
  for (let i = 0; i < n; i++) {
    // Beats before it take at least their gaps
    let left = starts[0] * gap
    if (i > 0) {
      left = Math.max(lefts[i - 1] + font / 2, lefts[i - 1] + (starts[i] - starts[i - 1]) * gap)
      // The first chord, and the one before on its own line, end before it starts
      if (i === 1) left = Math.max(left, lefts[0] + widths[0] + gap)
      if (i >= 2) left = Math.max(left, lefts[i - 2] + widths[i - 2] + gap)
    }
    lefts.push(left)
  }
  // The last chord on each line ends inside the bar
  const width = Math.max(...lefts.slice(Math.max(0, n - 2)).map((left, k) => left + widths[Math.max(0, n - 2) + k]))
  const tracks: number[] = new Array(beats).fill(0)
  for (let i = 0; i < n; i++) {
    const from = starts[i]
    const to = i + 1 < n ? starts[i + 1] : beats
    // The beats from this chord's to the next's (or the bar's end) and their gaps span the room between
    const room = (i + 1 < n ? lefts[i + 1] : width + gap) - lefts[i] - (to - from) * gap
    for (let b = from; b < to; b++) tracks[b] = Math.max(0, room / (to - from))
  }
  return { tracks, lefts, width }
}

/** The bar's width on one line: its chords side by side, each beat's gap between. */
export function oneLineWidth({ beats, widths, gap }: BarMeasure): number {
  return widths.reduce((sum, w) => sum + w, 0) + (beats - 1) * gap
}
