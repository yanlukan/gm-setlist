import { useSyncExternalStore } from 'react'
import { APP_VERSION } from '../version'

/** How often an open app asks whether a newer version is out. */
const CHECK_EVERY_MS = 30 * 60 * 1000

export interface UpdateState {
  /** The newest version published, once a check has answered. */
  latest: string | null
  /** A check has answered since the app opened. */
  checked: boolean
}

let state: UpdateState = { latest: null, checked: false }
const listeners = new Set<() => void>()

function setState(next: UpdateState) {
  state = next
  for (const listener of listeners) listener()
}

/** Whether version `a` is newer than `b`: 4.1.10 is newer than 4.1.9. */
export function isNewer(a: string, b: string): boolean {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

/**
 * Asks the site which version is published (version.json, written by every
 * build). Offline or failing, it just says nothing: the app keeps working.
 */
export async function checkForUpdate(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (!response.ok) return
    const { version } = (await response.json()) as { version?: unknown }
    if (typeof version === 'string') setState({ latest: version, checked: true })
  } catch {
    // Offline or the site is down: try again later
  }
}

/**
 * Checks when the app opens, whenever it comes back on screen (a home-screen
 * app can stay open for days without starting again), and every half hour.
 * Returns the way to stop.
 */
export function startUpdateChecks(): () => void {
  void checkForUpdate()
  const onVisible = () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  }
  document.addEventListener('visibilitychange', onVisible)
  const timer = setInterval(() => void checkForUpdate(), CHECK_EVERY_MS)
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(timer)
  }
}

/** The newest version, and whether it is newer than the one running. */
export function useUpdateCheck(): UpdateState & { available: boolean } {
  const current = useSyncExternalStore(
    listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
  return { ...current, available: !!current.latest && isNewer(current.latest, APP_VERSION) }
}

/** Starts the new version: the page comes fresh from the site when online (public/sw.js). */
export function updateNow(): void {
  window.location.reload()
}

/** For tests: back to no answer yet. */
export function resetUpdateCheck(): void {
  setState({ latest: null, checked: false })
}
