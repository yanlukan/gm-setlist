// Measures every song of the set on Stage, upright and on its side, in headless Chrome.
// Usage, from app/: npm run build, start `npx vite preview --port 4173 --strictPort`,
// then: node scripts/measure-stage.mjs [http://localhost:4173/gm-setlist/]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.argv[2] ?? 'http://localhost:4173/gm-setlist/'
const PORT = 9333
const MIN_PX = 20
const EXPECTED_SONGS = 21
const SIZES = [
  { name: 'upright', width: 820, height: 1180 },
  { name: 'on its side', width: 1180, height: 820 },
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** The page Chrome opened, once its DevTools endpoint answers. */
async function pageSocket() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = targets.find(t => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error('Chrome did not start')
}

/** A DevTools connection: send(method, params) resolves with the result, rejects on error, close or 15 s. */
function connect(url) {
  const ws = new WebSocket(url)
  let id = 0
  const waiting = new Map()
  const failAll = error => {
    for (const reject of waiting.values()) reject(error)
    waiting.clear()
  }
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    const done = waiting.get(message.id)
    if (!done) return
    waiting.delete(message.id)
    message.error ? done.reject(new Error(message.error.message)) : done.resolve(message.result)
  }
  ws.onclose = () => failAll(new Error('DevTools socket closed'))
  ws.onerror = () => failAll(new Error('DevTools socket error'))
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      const timer = setTimeout(() => {
        waiting.delete(n)
        reject(new Error(`DevTools ${method} timed out`))
      }, 15000)
      const settle = fn => value => {
        clearTimeout(timer)
        fn(value)
      }
      const entry = { resolve: settle(resolve), reject: settle(reject) }
      // failAll calls the entry as a function, so give it both shapes
      waiting.set(n, Object.assign(error => entry.reject(error), entry))
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DevTools socket did not open')), 15000)
    ws.onopen = () => {
      clearTimeout(timer)
      resolve({ send, close: () => ws.close() })
    }
    const early = ws.onerror
    ws.onerror = () => {
      clearTimeout(timer)
      early()
      reject(new Error('DevTools socket error'))
    }
  })
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (exceptionDetails) throw new Error(exceptionDetails.text)
  return result.value
}

// In the page: the song, the chart's size, whether it scrolls, and the smallest chord drawn
// (the chart's size times the zoom the fit gave the chord's bar)
const MEASURE = `(() => {
  const scroll = document.querySelector('.stage-screen .chart-scroll')
  const chart = scroll && scroll.querySelector('.chart')
  if (!chart) return null
  const size = parseFloat(chart.style.fontSize)
  const drawn = [...chart.querySelectorAll('.bar')]
    .filter(bar => bar.querySelector('.bar-chord'))
    .map(bar => size * (parseFloat(bar.style.getPropertyValue('--fit')) || 1))
  return {
    title: document.querySelector('.stage-title')?.textContent ?? '?',
    size,
    scrolls: scroll.scrollHeight > scroll.clientHeight,
    scrollsSideways: scroll.scrollWidth > scroll.clientWidth,
    place: document.querySelector('.bb-count')?.textContent ?? '',
    smallest: drawn.length ? Math.min(...drawn) : size,
    twoLines: chart.querySelectorAll('.bar[data-lines="2"]').length,
  }
})()`

/** Polls the page until two reads 100 ms apart are equal, at least 300 ms after `since`; throws after 10 s. */
async function settled(cdp, since, what) {
  const start = Date.now()
  let last = null
  while (Date.now() - start < 10000) {
    const m = await evaluate(cdp, MEASURE)
    const text = JSON.stringify(m)
    if (m && text === last && Date.now() - since >= 300) return m
    last = text
    await sleep(100)
  }
  throw new Error(`Stage did not settle: ${what}`)
}

/** Clicks Next and waits until the place and the title both moved on. */
async function advance(cdp, from, expectedPlace) {
  const clicked = await evaluate(cdp, `(() => { const b = document.querySelector('.bb-next:not(:disabled)'); b?.click(); return !!b })()`)
  if (!clicked) throw new Error(`Next is not available after song ${expectedPlace - 1}`)
  const start = Date.now()
  while (Date.now() - start < 10000) {
    const m = await evaluate(cdp, MEASURE)
    if (m && m.place.startsWith(`${expectedPlace}/`) && m.title !== from.title) return Date.now()
    await sleep(100)
  }
  throw new Error(`Next did not reach song ${expectedPlace} after "${from.title}"`)
}

const profile = mkdtempSync(join(tmpdir(), 'measure-stage-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
chrome.on('error', error => {
  console.error(`Chrome failed to start: ${error.message}`)
  process.exit(1)
})
let failed = 0

try {
  const cdp = await connect(await pageSocket())
  for (const size of SIZES) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 2, mobile: true })
    await cdp.send('Page.navigate', { url: URL })
    // wait for the app, then open Stage
    for (let i = 0; ; i++) {
      if (await evaluate(cdp, `!!document.querySelector('[aria-label="Switch to Stage"], .stage-screen .chart')`)) break
      if (i > 100) throw new Error('The app did not load')
      await sleep(100)
    }
    await evaluate(cdp, `document.querySelector('[aria-label="Switch to Stage"]')?.click()`)
    // The app reopens where it was left: walk back to song 1
    await evaluate(cdp, `(async () => {
      for (let i = 0; i < 60; i++) {
        const previous = document.querySelector('.bb-prev:not(:disabled)')
        if (!previous) break
        previous.click()
        await new Promise(resolve => setTimeout(resolve, 60))
      }
    })()`)
    let m = await settled(cdp, Date.now(), 'first song')
    const counted = /^(\d+)\/(\d+)$/.exec(m.place)
    if (!counted) throw new Error(`Cannot read the song count from "${m.place}"`)
    const total = Number(counted[2])
    if (total !== EXPECTED_SONGS) throw new Error(`Expected ${EXPECTED_SONGS} songs, the app shows ${total}`)
    if (Number(counted[1]) !== 1) throw new Error(`Expected to start at song 1, at ${m.place}`)
    let fit = 0
    const titles = new Set()
    console.log(`\n${size.name} (${size.width} × ${size.height}), ${total} songs`)
    for (let i = 0; i < total; i++) {
      titles.add(m.title)
      const ok = !m.scrolls && !m.scrollsSideways && m.smallest >= MIN_PX
      if (ok) fit++
      else failed++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}. ${m.title.padEnd(32)} ${m.size.toFixed(1)} px, smallest ${m.smallest.toFixed(1)} px, ${m.twoLines} bars on two lines${m.scrolls ? ', SCROLLS' : ''}${m.scrollsSideways ? ', SCROLLS SIDEWAYS' : ''}`)
      if (i < total - 1) {
        const since = await advance(cdp, m, i + 2)
        m = await settled(cdp, since, `song ${i + 2}`)
      }
    }
    if (titles.size !== EXPECTED_SONGS) throw new Error(`Saw ${titles.size} distinct songs ${size.name}, expected ${EXPECTED_SONGS}`)
    console.log(`${fit} of ${total} fit ${size.name}`)
  }
  cdp.close()
} finally {
  chrome.kill()
  await sleep(500)
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}

process.exit(failed ? 1 : 0)
