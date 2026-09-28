import { useEffect, useRef } from 'react'

interface PedalHandlers {
  onNext: () => void
  onPrev: () => void
}

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown'])
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp'])

/** True when the key press is going into a text field or an editable chart line. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/**
 * Bluetooth page-turner pedals (AirTurn, PageFlip and similar) send arrow or
 * Page Up/Down keys. Mapping them to previous/next song means changing songs
 * without taking a hand off the guitar. Also works with a keyboard.
 */
export function usePedalKeys(handlers: PedalHandlers, enabled: boolean) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping(e.target)) return

      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault()
        handlersRef.current.onNext()
      } else if (PREV_KEYS.has(e.key)) {
        e.preventDefault()
        handlersRef.current.onPrev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
