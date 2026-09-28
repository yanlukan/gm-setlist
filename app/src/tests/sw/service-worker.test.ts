// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import swSource from '../../../public/sw.js?raw'

const ORIGIN = 'https://playbook.test'
const PAGE = `${ORIGIN}/gm-setlist/`
const INDEX = `${ORIGIN}/gm-setlist/index.html`
const MANIFEST = `${ORIGIN}/gm-setlist/manifest.json`
const asset = (name: string) => `${ORIGIN}/gm-setlist/assets/${name}`

// Build files as Vite names them: name, eight-character hash, extension.
const OLD_JS = 'index-0ldC0de1.js'
const OLD_CSS = 'index-0ldStyl1.css'
const NEW_JS = 'index-NewC0de2.js'
const NEW_CSS = 'index-NewStyl2.css'

/** The app page as Vite builds it, loading the given build files. */
function page(...files: string[]) {
  const tags = files.map(file =>
    file.endsWith('.css')
      ? `<link rel="stylesheet" crossorigin href="/gm-setlist/assets/${file}">`
      : `<script type="module" crossorigin src="/gm-setlist/assets/${file}"></script>`,
  )
  return `<!doctype html><html><head>${tags.join('')}</head><body><div id="root"></div></body></html>`
}
const OLD_PAGE = page(OLD_JS, OLD_CSS)
const NEW_PAGE = page(NEW_JS, NEW_CSS)

const html = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
const text = (body: string) => async () => new Response(body)

/** A fake network: known addresses answer, anything else is a 404. */
function network(routes: Record<string, () => Promise<Response>>) {
  return (req: any) => {
    const url = new URL(typeof req === 'string' ? req : req.url, ORIGIN).href
    return routes[url] ? routes[url]() : Promise.resolve(new Response('Not Found', { status: 404 }))
  }
}

/** The iPad as it is today: the previous deploy kept, with its code. */
const OLD_DEPLOY_KEPT = { [PAGE]: OLD_PAGE, [asset(OLD_JS)]: 'old js', [asset(OLD_CSS)]: 'old css' }

/**
 * Runs the real sw.js against a fake network and cache, and returns what it
 * answers for a request. This is the code that decides whether the app opens
 * at a venue with bad signal, so its choices are tested directly.
 */
function loadWorker(fetchImpl: (req: any) => Promise<Response>, cached: Record<string, string> = {}) {
  const listeners: Record<string, (event: any) => void> = {}
  const pending: Promise<unknown>[] = []
  const toKey = (req: any) => new URL(typeof req === 'string' ? req : req.url, ORIGIN).href
  const store = new Map<string, Response>(
    Object.entries(cached).map(([url, body]) => [toKey(url), new Response(body)]),
  )
  const cache = {
    match: async (req: any) => store.get(toKey(req))?.clone(),
    put: async (req: any, res: Response) => { store.set(toKey(req), res) },
    add: async (req: any) => {
      const res = await fetchImpl(req)
      if (res.ok) store.set(toKey(req), res)
    },
    keys: async () => [...store.keys()].map(url => ({ url })),
    delete: async (req: any) => store.delete(toKey(req)),
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
      waitUntil: (p: Promise<unknown>) => { pending.push(p) },
    })
    if (!answer) throw new Error('worker did not respond')
    return answer
  }
  /** Let the background work (downloads, keeping, clean-up) finish. */
  const settle = async () => {
    while (pending.length) await pending.shift()
  }
  const install = () => {
    listeners.install({ waitUntil: (p: Promise<unknown>) => { pending.push(p) } })
    return settle()
  }
  const kept = async (url = PAGE) => store.get(url)?.clone().text()
  return { request, settle, install, store, kept }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('opening the app', () => {
  it('uses the fresh page when the network is healthy, and keeps it', async () => {
    const worker = loadWorker(
      network({ [PAGE]: async () => html(NEW_PAGE), [asset(NEW_JS)]: text('js'), [asset(NEW_CSS)]: text('css') }),
      { [PAGE]: 'old' },
    )
    expect(await (await worker.request(PAGE)).text()).toBe(NEW_PAGE)
    expect(await worker.kept()).toBe(NEW_PAGE)
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
    const worker = loadWorker(async () => { throw new TypeError('offline') }, { [INDEX]: 'shell' })
    expect(await (await worker.request(`${ORIGIN}/gm-setlist/?from=homescreen`)).text()).toBe('shell')
  })

  it('waits for the network on the very first visit, when nothing is cached', async () => {
    const worker = loadWorker(async () => new Response('first'))
    expect(await (await worker.request(PAGE)).text()).toBe('first')
  })

  it('fetches a file opened directly as itself, not as the app', async () => {
    const worker = loadWorker(network({ [MANIFEST]: text('{"name":"PlayBook"}') }), { [PAGE]: OLD_PAGE })
    expect(await (await worker.request(MANIFEST)).text()).toBe('{"name":"PlayBook"}')
  })
})

describe('a new deploy', () => {
  it('opens straight away when its code downloads in time, and the old code is dropped', async () => {
    const worker = loadWorker(
      network({ [PAGE]: async () => html(NEW_PAGE), [asset(NEW_JS)]: text('new js'), [asset(NEW_CSS)]: text('new css') }),
      { ...OLD_DEPLOY_KEPT, [MANIFEST]: '{}' },
    )
    expect(await (await worker.request(PAGE)).text()).toBe(NEW_PAGE)
    await worker.settle()
    expect([...worker.store.keys()].sort()).toEqual([PAGE, INDEX, MANIFEST, asset(NEW_CSS), asset(NEW_JS)].sort())
  })

  it('keeps opening the old version while the new code is still downloading on bad signal', async () => {
    vi.useFakeTimers()
    const worker = loadWorker(
      network({
        [PAGE]: async () => html(NEW_PAGE),
        [asset(NEW_JS)]: () => new Promise<Response>(() => {}), // the signal drops mid-download
        [asset(NEW_CSS)]: text('new css'),
      }),
      OLD_DEPLOY_KEPT,
    )
    const answer = worker.request(PAGE)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await (await answer).text()).toBe(OLD_PAGE)
    // Relaunching offline must still find a page whose code is all here.
    expect(await worker.kept()).toBe(OLD_PAGE)
    expect(worker.store.has(asset(OLD_JS))).toBe(true)
    expect(worker.store.has(asset(OLD_CSS))).toBe(true)
  })

  it('never replaces the working version when its code fails to download', async () => {
    const worker = loadWorker(
      network({ [PAGE]: async () => html(NEW_PAGE), [asset(NEW_CSS)]: text('new css') }), // script: 404
      OLD_DEPLOY_KEPT,
    )
    expect(await (await worker.request(PAGE)).text()).toBe(OLD_PAGE)
    await worker.settle()
    expect(await worker.kept()).toBe(OLD_PAGE)
    expect(worker.store.has(asset(OLD_JS))).toBe(true)
  })

  it('finishes a slow download in the background, so the next launch opens it', async () => {
    vi.useFakeTimers()
    let arrive!: () => void
    const slowScript = new Promise<void>(resolve => { arrive = resolve })
    const worker = loadWorker(
      network({
        [PAGE]: async () => html(NEW_PAGE),
        [asset(NEW_JS)]: () => slowScript.then(() => new Response('new js')),
        [asset(NEW_CSS)]: text('new css'),
      }),
      OLD_DEPLOY_KEPT,
    )
    const first = worker.request(PAGE)
    await vi.advanceTimersByTimeAsync(3000)
    expect(await (await first).text()).toBe(OLD_PAGE)

    arrive()
    await worker.settle()
    expect(await worker.kept()).toBe(NEW_PAGE)
    expect(worker.store.has(asset(OLD_JS))).toBe(false)

    expect(await (await worker.request(PAGE)).text()).toBe(NEW_PAGE)
  })

  it('keeps split code and fonts that the page loads indirectly', async () => {
    const chunk = 'chunk-Lazy0001.js'
    const font = 'font-Font0001.woff2'
    const worker = loadWorker(
      network({
        [PAGE]: async () => html(NEW_PAGE),
        [asset(NEW_JS)]: text(`const deps = ["assets/${chunk}"]`),
        [asset(NEW_CSS)]: text(`@font-face{src:url(/gm-setlist/assets/${font})}`),
        [asset(chunk)]: text('lazy'),
        [asset(font)]: text('font'),
      }),
      { ...OLD_DEPLOY_KEPT, [asset('chunk-0ldLazy1.js')]: 'stale' },
    )
    await worker.request(PAGE)
    await worker.settle()
    expect(worker.store.has(asset(chunk))).toBe(true)
    expect(worker.store.has(asset(font))).toBe(true)
    expect(worker.store.has(asset('chunk-0ldLazy1.js'))).toBe(false)
  })

  it('is not held up by text in the code that only looks like a file name', async () => {
    const worker = loadWorker(
      network({
        [PAGE]: async () => html(NEW_PAGE),
        [asset(NEW_JS)]: text('const logo = "https://cdn.example/assets/logo-Abcdefgh.png"'),
        [asset(NEW_CSS)]: text('css'),
      }),
      OLD_DEPLOY_KEPT,
    )
    expect(await (await worker.request(PAGE)).text()).toBe(NEW_PAGE)
  })

  it('never keeps a page without the app in it, such as a maintenance page', async () => {
    const worker = loadWorker(network({ [PAGE]: async () => html('<h1>Down for maintenance</h1>') }), OLD_DEPLOY_KEPT)
    expect(await (await worker.request(PAGE)).text()).toBe(OLD_PAGE)
    await worker.settle()
    expect(await worker.kept()).toBe(OLD_PAGE)
    expect(worker.store.has(asset(OLD_JS))).toBe(true)
  })
})

describe('installing', () => {
  it('keeps the page together with all its code, so the very next launch works offline', async () => {
    const worker = loadWorker(
      network({
        [PAGE]: async () => html(NEW_PAGE),
        [asset(NEW_JS)]: text('js'),
        [asset(NEW_CSS)]: text('css'),
        [MANIFEST]: text('{}'),
      }),
    )
    await worker.install()
    expect(await worker.kept()).toBe(NEW_PAGE)
    expect(await worker.kept(INDEX)).toBe(NEW_PAGE)
    expect(worker.store.has(asset(NEW_JS))).toBe(true)
    expect(worker.store.has(asset(NEW_CSS))).toBe(true)
    expect(worker.store.has(MANIFEST)).toBe(true)
  })
})

describe('app files', () => {
  it('serves hashed build files from the cache without touching the network', async () => {
    const fetchSpy = vi.fn(async () => new Response('network'))
    const file = asset('index-abc12345.js')
    const worker = loadWorker(fetchSpy, { [file]: 'cached-js' })
    expect(await (await worker.request(file, 'no-cors')).text()).toBe('cached-js')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
