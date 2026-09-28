// PlayBook service worker.
//
// The app has to open instantly at a venue with bad or no signal, and even if
// the host is down. Hashed build assets never change content, so they are
// served cache-first. The page itself is fetched fresh when the network is
// quick and healthy, so new deploys arrive — but after a short wait, or on any
// error, the kept copy is served instead of leaving a blank screen.
//
// A page is only kept once every file it loads is in the cache too, so the
// kept page can always start. Keeping a new deploy's page straight away, as
// this worker used to, meant a download cut off by bad signal left the app
// opening blank until the signal came back.
const CACHE_NAME = 'playbook-v3'
// Derived from this file's own URL rather than registration.scope: it is
// available the instant the worker script evaluates, with no dependency on
// registration state.
const SHELL = new URL('./', self.location.href).pathname
const ASSETS = SHELL + 'assets/'
/** How long to wait for a fresh page, and any new code it needs, before opening the kept one. */
const NETWORK_TIMEOUT_MS = 3000

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all(
      [
        fetch(SHELL, { cache: 'no-cache' }).then(response => response.ok && keepPage(response)),
        caches.open(CACHE_NAME).then(cache => cache.add(SHELL + 'manifest.json')),
      ].map(step => step.catch(() => undefined)),
    ).then(() => self.skipWaiting()),
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

/** Names of the hashed build files that a page, script or stylesheet refers to. */
function assetNames(text) {
  return Array.from(text.matchAll(/assets\/([\w.-]+-[\w-]{8}\.\w+)/g), match => match[1])
}

/**
 * Put every build file the page needs into the cache, following references
 * inside its scripts and stylesheets too (split code, fonts). Throws if one
 * cannot be downloaded. Returns the names of all of them.
 */
async function cacheAssets(html, cache) {
  const needed = new Set()
  const queue = assetNames(html).map(name => ({ name, direct: true }))
  while (queue.length) {
    const { name, direct } = queue.pop()
    if (needed.has(name)) continue
    needed.add(name)
    let response = await cache.match(ASSETS + name)
    if (!response) {
      response = await fetch(ASSETS + name)
      if (!response.ok) {
        // The page's own script and stylesheet must be there. A name found
        // inside a script may just be text that looks like one.
        if (direct) throw new Error(`${name} failed: ${response.status}`)
        continue
      }
      await cache.put(ASSETS + name, response.clone())
    }
    if (/\.(js|css)$/.test(name)) {
      queue.push(...assetNames(await response.text()).map(inner => ({ name: inner, direct: false })))
    }
  }
  return needed
}

/** Drop build files the kept page no longer uses, or every deploy piles up. */
async function prune(cache, needed) {
  const requests = await cache.keys()
  await Promise.all(
    requests
      .filter(request => {
        const { pathname } = new URL(request.url)
        return pathname.startsWith(ASSETS) && !needed.has(pathname.slice(ASSETS.length))
      })
      .map(request => cache.delete(request)),
  )
}

let keeping = Promise.resolve()

/**
 * Keep this page as the one to open offline, but only once every file it
 * loads is in the cache. Runs one at a time, so two launches can never leave
 * one page kept with the other's files.
 */
function keepPage(response) {
  const run = keeping.then(async () => {
    const html = await response.text()
    const names = assetNames(html)
    if (!(response.headers.get('content-type') || '').includes('text/html') || names.length === 0) {
      throw new Error('not the app page')
    }
    const cache = await caches.open(CACHE_NAME)
    const needed = await cacheAssets(html, cache)
    const page = () => new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    await cache.put(SHELL, page())
    await cache.put(SHELL + 'index.html', page())
    await prune(cache, needed)
  })
  keeping = run.catch(() => undefined)
  return run
}

async function cachedShell() {
  return (await caches.match(SHELL)) || (await caches.match(SHELL + 'index.html'))
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), ms))
}

/**
 * Open the fresh page if it arrives in time along with any new code it
 * needs, otherwise the kept one. A fresh page that is slow is still kept in
 * the background, ready for the next launch.
 */
async function openApp(event) {
  const network = fetch(event.request)
  const saved = network.then(response => {
    if (!response.ok) throw new Error(`page failed: ${response.status}`)
    return keepPage(response.clone())
  })
  event.waitUntil(saved.catch(() => undefined))
  const kept = await cachedShell()

  // First ever visit: nothing kept yet, so the network is all there is.
  if (!kept) return network

  try {
    // A host error page (5xx) is worse than yesterday's copy, and so is a
    // page whose code has not finished downloading.
    return await Promise.race([saved.then(() => network), timeout(NETWORK_TIMEOUT_MS)])
  } catch {
    return kept
  }
}

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

async function networkFirst(event) {
  const { request } = event
  const network = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })
  // Let a slow response finish in the background so the next launch is fresh.
  event.waitUntil(network.catch(() => undefined))
  const cached = await caches.match(request)

  if (!cached) return network

  try {
    const response = await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)])
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

  // The app is one page: any page address in scope opens it. A file opened
  // directly (manifest.json, an icon) is fetched as itself.
  const isFile = /\.\w+$/.test(url.pathname) && !url.pathname.endsWith('.html')
  if (request.mode === 'navigate' && !isFile) {
    event.respondWith(openApp(event))
    return
  }
  // Vite emits content-hashed filenames, so these are safe to serve from cache
  // forever — this is what makes an offline cold start instant.
  if (url.pathname.startsWith(ASSETS)) {
    event.respondWith(cacheFirst(request))
    return
  }
  event.respondWith(networkFirst(event))
})
