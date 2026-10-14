import { useCallback, useEffect, useState } from 'react'

/** On its side the panel sits beside the chart; upright, under it. */
export const SIDE_QUERY = '(orientation: landscape) and (min-width: 900px)'
const KEY = 'playbook.practicePanel'

/** Panel sizes in px, upright (its height) and on its side (its width). */
export interface PanelLayout {
  upright: number
  side: number
  hidden: boolean
}

export const DEFAULT_LAYOUT: PanelLayout = { upright: 300, side: 360, hidden: false }
/** Smaller than this when the drag ends, and the panel hides. */
export const HIDE_BELOW_PX = 90
/** The panel never gets smaller than this while shown. */
export const MIN_PANEL_PX = 140
/** The chart always keeps at least this much. */
export const MIN_CHART_PX = 180

function readLayout(): PanelLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PanelLayout> | null
    if (!saved) return DEFAULT_LAYOUT
    return {
      upright: typeof saved.upright === 'number' ? saved.upright : DEFAULT_LAYOUT.upright,
      side: typeof saved.side === 'number' ? saved.side : DEFAULT_LAYOUT.side,
      hidden: saved.hidden === true,
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

function writeLayout(layout: PanelLayout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
  } catch {
    // Private mode or blocked storage: the size just isn't remembered
  }
}

function sideNow(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(SIDE_QUERY).matches
}

/**
 * The Practice shapes panel's size and whether it is hidden: the player's
 * choice, remembered on this device, one size upright and one on its side.
 */
export function usePanelSize() {
  const [layout, setLayout] = useState<PanelLayout>(readLayout)
  const [side, setSide] = useState(sideNow)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(SIDE_QUERY)
    const onChange = () => setSide(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const update = useCallback((change: Partial<PanelLayout>) => {
    setLayout(current => {
      const next = { ...current, ...change }
      writeLayout(next)
      return next
    })
  }, [])

  const size = side ? layout.side : layout.upright
  const setSize = useCallback(
    (px: number) => update(side ? { side: Math.round(px) } : { upright: Math.round(px) }),
    [side, update],
  )
  const setHidden = useCallback((hidden: boolean) => update({ hidden }), [update])

  return { side, size, hidden: layout.hidden, setSize, setHidden }
}
