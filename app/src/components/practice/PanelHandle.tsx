import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { HIDE_BELOW_PX, MIN_CHART_PX, MIN_PANEL_PX } from '../../hooks/use-panel-size'
import { refitCharts } from '../../hooks/fit-chart'

interface Props {
  /** The element holding the chart and the panel, to measure the drag against. */
  bodyRef: RefObject<HTMLElement | null>
  /** The panel, sized directly while dragging so nothing else redraws. */
  panelRef: RefObject<HTMLElement | null>
  side: boolean
  hidden: boolean
  /** At the end of a drag: the new size, or null to hide. */
  onDone: (px: number | null) => void
  onToggle: () => void
}

/**
 * The bar between the chart and the shapes: drag it to give the chart more
 * room or less, drag it right down to hide the shapes, or tap the button to
 * hide or show them. While it moves only the panel changes size; the chart
 * holds its chords and refits once, when the drag ends, so the drag stays
 * smooth on the iPad.
 */
export function PanelHandle({ bodyRef, panelRef, side, hidden, onDone, onToggle }: Props) {
  const dragging = useRef(false)
  const last = useRef<number | null | undefined>(undefined)
  const frame = useRef(0)

  const sizeAt = (e: ReactPointerEvent): number | null => {
    const body = bodyRef.current?.getBoundingClientRect()
    if (!body) return null
    const room = side ? body.width : body.height
    const raw = side ? body.right - e.clientX : body.bottom - e.clientY
    if (raw < HIDE_BELOW_PX) return null
    return Math.min(Math.max(raw, MIN_PANEL_PX), room - MIN_CHART_PX)
  }

  const show = (px: number | null) => {
    const panel = panelRef.current
    if (!panel) return
    panel.style.display = px === null ? 'none' : ''
    if (px !== null) panel.style[side ? 'width' : 'height'] = `${px}px`
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current = true
    last.current = undefined
    // The chart's fit waits while this is set (hooks/fit-chart.ts)
    if (bodyRef.current) bodyRef.current.dataset.resizing = 'true'
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    last.current = sizeAt(e)
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => show(last.current ?? null))
  }
  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    cancelAnimationFrame(frame.current)
    if (bodyRef.current) delete bodyRef.current.dataset.resizing
    if (last.current !== undefined) {
      if (panelRef.current) panelRef.current.style.display = ''
      onDone(last.current)
    }
    // After React has applied the new size
    requestAnimationFrame(() => refitCharts())
  }

  return (
    <div
      className={side ? 'panel-handle is-side' : 'panel-handle'}
      role="separator"
      aria-orientation={side ? 'vertical' : 'horizontal'}
      aria-label="Drag to resize the shapes"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="panel-grip" aria-hidden="true" />
      <button type="button" className="panel-toggle" onClick={onToggle}>
        {hidden ? 'Show shapes' : 'Hide shapes'}
      </button>
    </div>
  )
}
