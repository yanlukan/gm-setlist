import { persistDelete, persistEdits, useStore } from './use-store'
import { replaceBar, barsOfSection, barChords, squash, type UnsureBar } from '../music/evidence'

/**
 * The player settles a doubtful bar on the chords they chose. If the chart
 * reads something else there, the choice is written into every section of
 * that name that still reads the disputed chords at that bar (saved like any
 * edit, so the chart before is kept as an earlier version); either way the
 * bar is recorded as heard. A bar no section has, or empty chords, change nothing.
 */
export function settleBar(title: string, unsure: UnsureBar, chords: string): void {
  const chosen = squash(chords)
  if (!chosen) return
  const { name, bar } = unsure
  const disputed = squash(unsure.evidence.chords)
  const { getEditedSections, saveSections } = useStore.getState()
  const before = getEditedSections(title)
  let exists = false
  const after = before.map(s => {
    if (s.name !== name) return s
    const bars = barsOfSection(s.chords)
    if (!bars[bar]) return s
    exists = true
    const reads = barChords(bars[bar])
    if (reads !== disputed || reads === chosen) return s
    return { ...s, chords: replaceBar(s.chords, bar, chords) }
  })
  if (!exists) return
  if (after.some((s, i) => s !== before[i])) saveSections(title, after)
  const edits = useStore.getState().edits[title] ?? {}
  const next = { ...edits, heard: { ...edits.heard, [name]: { ...edits.heard?.[name], [bar]: chords } } }
  useStore.setState(state => ({ edits: { ...state.edits, [title]: next } }))
  persistEdits(title, next)
}

/** Forgets every settled bar of a song: a bar still reading its disputed chords shows its mark again. */
export function unsettleSong(title: string): void {
  const edits = useStore.getState().edits[title]
  if (!edits?.heard) return
  const { heard: _heard, ...rest } = edits
  const keep = Object.keys(rest).length > 0
  useStore.setState(state => {
    const { [title]: _, ...others } = state.edits
    return { edits: keep ? { ...others, [title]: rest } : others }
  })
  if (keep) persistEdits(title, rest)
  else persistDelete(title)
}
