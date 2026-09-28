// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import swSource from '../../../public/sw.js?raw'

const ORIGIN = 'https://playbook.test'
const PAGE = `${ORIGIN}/gm-setlist/`

/**
 * Runs the real sw.js against a fake network and cache, and returns what it
 * answers for a request. This is the code that decides whether the app opens
 * at a venue with bad signal, so its choices are tested directly.
 */
function loadWorker(fetchImpl: (req: any) => Promise<Response>, cached: Record<string, string> = {}) {
  const listeners: Record<string, (event: any) => void> = {}
  const toKey = (req: any) => new URL(typeof req === 'string' ? req : req.url, ORIGIN).href
  const store = new Map<string, Response>(
    Object.entries(cached).map(([url, body]) => [toKey(url), new Response(body)]),
  )
  const cache = {
    match: async (req: any) => store.get(toKey(req))?.clone(),
    put: async (req: any, res: Response) => { store.set(toKey(req), res) },
    addAll: async () => undefined,
  }
  const fakeCaches = {
    open: async () => cache,
    match: (req: any) => cache.match(req),
    keys: async () => ['playbook-v3'],
    delete: async () => true,
  }
  const fakeSelf = {
    location: { href: `${ORIGIN}/gm-setlist/sw.js`, origin: ORIGIN },
    addEventListener: (type: string, fn: (event: any) => void) => { listeners[type] = fn },
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  }
  new Function('self', 'caches', 'fetch', swSource)(fakeSelf, fakeCaches, fetchImpl)

  const request = (url: string, mode = 'navigate') => {
    let answer: Promise<Response> | undefined
    listeners.fetch({
      request: { method: 'GET', url, mode },
      respondWith: (p: Promise<Response>) => { answer = p },
      waitUntil: () => undefined,
    })
    if (!answer) throw new Error('worker did not respond')
    return answer
  }
  return { request, store }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('opening the app', () => {
  it('uses the fresh page when the network is healthy, and caches it', async () => {
    const worker = loadWorker(async () => new Response('fresh'), { [PAGE]: 'old' })
    expect(await (await worker.request(PAGE)).text()).toBe('fresh')
    expect(await worker.store.get(PAGE)!.clone().text()).toBe('fresh')
  })

  it('opens the cached app when the host is down', async () => {
    const worker = loadWorker(async () => new Response('Service Unavailable', { status: 503 }), { [PAGE]: 'cached' })
    expect(await (await worker.request(PAGE)).text()).toBe('cached')
  })

  it('opens the cached app when there is no network at all', async () => {
    const worker = loadWorker(async () => { throw new TypeError('offline') }, { [PAGE]: 'cached' })
    expect(await (await worker.request(PAGE)).text()).toBe('cached')
  })

  it('does not hang on venue Wi-Fi that never answers', async () => {
    vi.useFakeTimers()
    const worker = loadWorker(() => new Promise<Response>(() => {}), { [PAGE]: 'cached' })
    const answer = worker.request(PAGE)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await (await answer).text()).toBe('cached')
  })

  it('falls back to the app shell for any page it has not seen', async () => {
    const worker = loadWorker(async () => { throw new TypeError('offline') }, {
      [`${ORIGIN}/gm-setlist/index.html`]: 'shell',
    })
    expect(await (await worker.request(`${ORIGIN}/gm-setlist/?from=homescreen`)).text()).toBe('shell')
  })

  it('waits for the network on the very first visit, when nothing is cached', async () => {
    const worker = loadWorker(async () => new Response('first'))
    expect(await (await worker.request(PAGE)).text()).toBe('first')
  })
})

describe('app files', () => {
  it('serves hashed build files from the cache without touching the network', async () => {
    const fetchSpy = vi.fn(async () => new Response('network'))
    const asset = `${ORIGIN}/gm-setlist/assets/index-abc123.js`
    const worker = loadWorker(fetchSpy, { [asset]: 'cached-js' })
    expect(await (await worker.request(asset, 'no-cors')).text()).toBe('cached-js')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
