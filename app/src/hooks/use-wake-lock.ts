import { useEffect, useRef } from 'react'

/**
 * Keeps the screen on. An iPad going dark mid-song is exactly the failure a
 * stage chart cannot have, so this is on whenever PlayBook is open.
 *
 * The lock is dropped by the browser whenever the page is hidden, and some
 * browsers only grant it after a tap, so it is re-requested on both.
 */
export function useWakeLock(enabled: boolean) {
  const sentinel = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let cancelled = false

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinel.current && !sentinel.current.released) return
      try {
        sentinel.current = await navigator.wakeLock.request('screen')
      } catch {
        // Not allowed right now (no tap yet, low battery mode). Retried on the next tap.
      }
    }

    request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('pointerdown', request, { passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', request)
      sentinel.current?.release().catch(() => {})
      sentinel.current = null
    }
  }, [enabled])
}
