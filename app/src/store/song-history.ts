import { getSongHistory, saveSongHistory } from './persistence'
import { sameSections } from '../music/chart-edits'
import type { Section } from '../types'

/** How many earlier versions of a song are kept. */
export const VERSIONS_KEPT = 20
/**
 * A change within this long of the last kept version does not keep another,
 * so a burst of changes keeps one version: the chart as it was before it began.
 */
export const VERSION_GAP_MS = 10 * 60 * 1000

/** Versions are written one at a time, so two quick changes cannot keep the same moment twice. */
let queue: Promise<unknown> = Promise.resolve()

/** Resolves once every version asked for so far is written. */
export function whenHistorySaved(): Promise<unknown> {
  return queue
}

/**
 * Keep the chart as it is NOW, before it changes. Pass what is shown at this
 * moment: what gets written later must not depend on what has happened since.
 * `force` keeps it even inside the gap (before a reset or a restore).
 */
export function keepVersion(
  title: string,
  chart: { sections: Section[]; notes: string },
  reason: string,
  force = false,
): Promise<unknown> {
  const at = Date.now()
  queue = queue
    .then(async () => {
      const versions = await getSongHistory(title)
      const newest = versions[0]
      if (newest && sameSections(newest.sections, chart.sections) && newest.notes === chart.notes) return
      if (!force && newest && at - newest.at < VERSION_GAP_MS) return
      const next = [{ at, reason, sections: chart.sections, notes: chart.notes }, ...versions]
      await saveSongHistory(title, next.slice(0, VERSIONS_KEPT))
    })
    .catch(e => console.warn('keeping an earlier version failed:', e))
  return queue
}
