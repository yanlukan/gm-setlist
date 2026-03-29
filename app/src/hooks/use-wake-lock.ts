import { useEffect, useRef } from 'react'

export function useWakeLock(enabled: boolean) {
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    const request = async () => {
      try {
        wakeLock.current = await navigator.wakeLock.request('screen')
      } catch {
        // Wake lock request failed — ignore
      }
    }

    request()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      wakeLock.current?.release()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])
}
