import { persistEdits, useStore } from './use-store'
import { replaceBar, barsOfSection, barChords } from '../music/evidence'

/**
 * The player settles a doubtful bar on the chords they chose. If the chart
 * reads something else there, the choice is written into every section of
 * that name (saved like any edit, so the chart before is kept as an earlier
 * version); either way the bar is recorded as heard.
 */
export function settleBar(title: string, section: string, bar: number, chords: string): void {
  const { getEditedSections, saveSections } = useStore.getState()
  const before = getEditedSections(title)
  const after = before.map(s => {
    if (s.name !== section) return s
    const bars = barsOfSection(s.chords)
    if (!bars[bar] || barChords(bars[bar]) === chords.split(/\s+/).filter(Boolean).join(' ')) return s
    return { ...s, chords: replaceBar(s.chords, bar, chords) }
  })
  if (after.some((s, i) => s !== before[i])) saveSections(title, after)
  const edits = useStore.getState().edits[title] ?? {}
  const next = { ...edits, heard: { ...edits.heard, [section]: { ...edits.heard?.[section], [bar]: chords } } }
  useStore.setState(state => ({ edits: { ...state.edits, [title]: next } }))
  persistEdits(title, next)
}
