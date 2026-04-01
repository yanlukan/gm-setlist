import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Global swipe detection — listens on document to work
 * even when content is scrollable.
 */
export function useSwipe(
  handlers: SwipeHandlers,
  enabled: boolean = true
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const touchStart = useRef({ x: 0, y: 0, time: 0 })

  useEffect(() => {
    if (!enabled) return

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

      // Quick horizontal swipe: >80px, more horizontal than vertical, under 400ms
      if (Math.abs(dx) < 80) return
      if (Math.abs(dy) > Math.abs(dx) * 0.6) return
      if (dt > 400) return

      if (dx < 0) handlersRef.current.onSwipeLeft()
      else handlersRef.current.onSwipeRight()
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled])
}
