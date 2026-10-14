import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { HIDE_BELOW_PX, MIN_CHART_PX, MIN_PANEL_PX } from '../../hooks/use-panel-size'

interface Props {
  /** The element holding the chart and the panel, to measure the drag against. */
  bodyRef: React.RefObject<HTMLElement | null>
  side: boolean
  hidden: boolean
  /** While dragging: the size to show now, or null for hidden. */
  onDrag: (px: number | null) => void
  /** At the end of a drag, or a tap on the button. */
  onDone: (px: number | null) => void
  onToggle: () => void
}

/**
 * The bar between the chart and the shapes: drag it to give the chart more
 * room or less (the chords resize to fit), drag it right down to hide the
 * shapes, or tap the button to hide or show them.
 */
export function PanelHandle({ bodyRef, side, hidden, onDrag, onDone, onToggle }: Props) {
  const dragging = useRef(false)
  const moved = useRef(false)

  const sizeAt = (e: ReactPointerEvent): number | null => {
    const body = bodyRef.current?.getBoundingClientRect()
    if (!body) return null
    const room = side ? body.width : body.height
    const raw = side ? body.right - e.clientX : body.bottom - e.clientY
    if (raw < HIDE_BELOW_PX) return null
    return Math.min(Math.max(raw, MIN_PANEL_PX), room - MIN_CHART_PX)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current = true
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    moved.current = true
    onDrag(sizeAt(e))
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (moved.current) onDone(sizeAt(e))
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
