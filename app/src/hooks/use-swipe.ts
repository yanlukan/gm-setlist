import { useEffect, useRef, type RefObject } from 'react'

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Horizontal swipe on one element — the chart. This used to listen on the
 * whole document, so scrolling the song bar or the chord-diagram strip, or
 * swiping inside an open overlay, could jump to a different song mid-set.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  enabled: boolean = true,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return

    let start: { x: number; y: number; time: number } | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        start = null
        return
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!start) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const dt = Date.now() - start.time
      start = null

      // Quick, clearly horizontal swipe: >80px, mostly sideways, under 400ms
      if (Math.abs(dx) < 80) return
      if (Math.abs(dy) > Math.abs(dx) * 0.6) return
      if (dt > 400) return

      if (dx < 0) handlersRef.current.onSwipeLeft()
      else handlersRef.current.onSwipeRight()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, enabled])
}
