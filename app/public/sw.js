// PlayBook service worker.
//
// The app has to open instantly at a venue with bad or no signal, and even if
// the host is down. Hashed build assets never change content, so they are
// served cache-first. The page itself is fetched fresh when the network is
// quick and healthy, so new deploys arrive — but after a short wait, or on any
// error, the cached copy is served instead of leaving a blank screen.
const CACHE_NAME = 'playbook-v3'
// Derived from this file's own URL rather than registration.scope: it is
// available the instant the worker script evaluates, with no dependency on
// registration state.
const SHELL = new URL('./', self.location.href).pathname
/** How long to wait for the network before using the cached page. */
const NETWORK_TIMEOUT_MS = 3000

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll([SHELL, SHELL + 'index.html', SHELL + 'manifest.json']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function cachedShell() {
  return (await caches.match(SHELL + 'index.html')) || (await caches.match(SHELL))
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), ms))
}

async function networkFirst(event, fallbackToShell) {
  const { request } = event
  const cached = (await caches.match(request)) || (fallbackToShell ? await cachedShell() : undefined)

  const network = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })
  // Let a slow response finish in the background so the next launch is fresh.
  event.waitUntil(network.catch(() => undefined))

  // First ever visit: nothing to fall back to, so wait for the network.
  if (!cached) return network

  try {
    const response = await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)])
    // A host error page (5xx, captive portal redirect) is worse than yesterday's copy.
    return response.ok ? response : cached
  } catch {
    return cached
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, true))
    return
  }
  // Vite emits content-hashed filenames, so these are safe to serve from cache
  // forever — this is what makes an offline cold start instant.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }
  event.respondWith(networkFirst(event, false))
})
