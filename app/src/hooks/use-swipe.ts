import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function useSwipe(
  ref: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  enabled: boolean = true
) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      const dy = e.changedTouches[0].clientY - touchStart.current.y
      const dt = Date.now() - touchStart.current.time

      // Must be: horizontal > 50px, more horizontal than vertical,
      // and fast enough (under 500ms) to be a deliberate swipe
      if (Math.abs(dx) < 50) return
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return  // allow some vertical tolerance
      if (dt > 500) return  // too slow, probably a scroll

      if (dx < 0) handlersRef.current.onSwipeLeft()
      else handlersRef.current.onSwipeRight()
    }

    // Listen on capture phase so we get the events before scroll
    el.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart, { capture: true })
      el.removeEventListener('touchend', onTouchEnd, { capture: true })
    }
  }, [ref, enabled])
}
