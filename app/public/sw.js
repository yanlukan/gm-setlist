// PlayBook service worker.
//
// The app has to open at a venue with no usable network. Hashed build assets
// never change content, so they are served cache-first; the page itself is
// network-first so a new deploy is picked up, falling back to the cached copy
// when offline.
const CACHE_NAME = 'playbook-v3'
// Derived from this file's own URL rather than registration.scope: it is
// available the instant the worker script evaluates, with no dependency on
// registration state.
const SHELL = new URL('./', self.location.href).pathname

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

async function networkFirst(request, fallbackToShell) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackToShell) {
      const shell = (await caches.match(SHELL + 'index.html')) || (await caches.match(SHELL))
      if (shell) return shell
    }
    throw err
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true))
    return
  }
  // Vite emits content-hashed filenames, so these are safe to serve from cache
  // forever — this is what makes an offline cold start instant.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }
  event.respondWith(networkFirst(request, false))
})
