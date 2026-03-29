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
  const touchStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      const dy = e.changedTouches[0].clientY - touchStart.current.y
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) handlers.onSwipeLeft()
      else handlers.onSwipeRight()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, handlers, enabled])
}
