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

/** A DevTools connection: send(method, params) resolves with the result. */
function connect(url) {
  const ws = new WebSocket(url)
  let id = 0
  const waiting = new Map()
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    const done = waiting.get(message.id)
    if (!done) return
    waiting.delete(message.id)
    done(message)
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      waiting.set(n, m => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  return new Promise(resolve => {
    ws.onopen = () => resolve({ send, close: () => ws.close() })
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
    smallest: drawn.length ? Math.min(...drawn) : size,
    twoLines: chart.querySelectorAll('.bar[data-lines="2"]').length,
  }
})()`

const profile = mkdtempSync(join(tmpdir(), 'measure-stage-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
let failed = 0

try {
  const cdp = await connect(await pageSocket())
  for (const size of SIZES) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 2, mobile: true })
    await cdp.send('Page.navigate', { url: URL })
    await sleep(2500)
    await evaluate(cdp, `document.querySelector('[aria-label="Switch to Stage"]')?.click()`)
    await sleep(500)
    // The app reopens where it was left: walk back to song 1
    await evaluate(cdp, `(async () => {
      for (let i = 0; i < 60; i++) {
        const previous = document.querySelector('.bb-prev:not(:disabled)')
        if (!previous) break
        previous.click()
        await new Promise(resolve => setTimeout(resolve, 60))
      }
    })()`)
    await sleep(400)
    const total = await evaluate(cdp, `Number((document.querySelector('.bb-count')?.textContent ?? '0/0').split('/')[1])`)
    let fit = 0
    console.log(`\n${size.name} (${size.width} × ${size.height}), ${total} songs`)
    for (let i = 0; i < total; i++) {
      const m = await evaluate(cdp, MEASURE)
      if (!m) throw new Error(`no Stage chart at song ${i + 1}`)
      const ok = !m.scrolls && m.smallest >= MIN_PX
      if (ok) fit++
      else failed++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}. ${m.title.padEnd(32)} ${m.size.toFixed(1)} px, smallest ${m.smallest.toFixed(1)} px, ${m.twoLines} bars on two lines${m.scrolls ? ', SCROLLS' : ''}`)
      await evaluate(cdp, `document.querySelector('.bb-next:not(:disabled)')?.click()`)
      await sleep(400)
    }
    console.log(`${fit} of ${total} fit ${size.name}`)
  }
  cdp.close()
} finally {
  chrome.kill()
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}

process.exit(failed ? 1 : 0)
