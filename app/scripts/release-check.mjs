// The release check: opens every song at the iPad sizes (and a phone) on Stage and Practice,
// in WebKit (iPad Safari's engine) and Chromium, and fails on any chord that is too small,
// crosses its bar, overlaps another chord, is cut off, is off the screen or, in a staggered
// bar, starts before the chord before it ends; and on any section wider than its room.
// Usage, from app/: npm run build && npm run check:release
// Exit 0 when everything passes; otherwise 1 with one line per problem:
//   <engine> <size> <screen> <nn> <song> bar <n>: <problem>
//   <engine> <size> <screen> <nn> <song> section <n>: runs past its width
// Pictures: release-shots/<engine>/<size>/<screen>/<nn>-<song>.png, and release-shots/changed.txt
// lists the pictures whose SHA-256 differs from the run before (hashes in release-shots/hashes.json).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from 'playwright'

const PORT = 4179
const URL = `http://localhost:${PORT}/gm-setlist/`
const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = join(APP, 'release-shots')
const EXPECTED_SONGS = 21
const ENGINES = [
  ['webkit', webkit],
  ['chromium', chromium],
]
const SIZES = [
  { name: '820x1180', width: 820, height: 1180 },
  { name: '1180x820', width: 1180, height: 820 },
  { name: '1024x1366', width: 1024, height: 1366 },
  { name: 'phone-390x844', width: 390, height: 844 },
]
const SCREENS = ['Stage', 'Practice']

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// In the page: every chord with its bar number, drawn size (font size x the zoom of its bar and
// their ancestors, so a bar the fit shrinks counts as shrunk) and the rects the checks compare;
// and the sections (bar grids, numbered from 1) whose bars run past their width.
const READ_CHORDS = () => {
  const zoomOf = el => {
    let zoom = 1
    for (let e = el; e; e = e.parentElement) zoom *= parseFloat(getComputedStyle(e).zoom) || 1
    return zoom
  }
  const rect = el => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
  }
  const bars = []
  // The screen the chart is drawn in: it hides anything past its sides (layout.css)
  const scroll = document.querySelector('.band-chart')?.closest('.chart-scroll')
  const screen = scroll ? rect(scroll) : null
  const chords = [...document.querySelectorAll('.band-chart .bar-chord')].map(chord => {
    const bar = chord.closest('.bar')
    if (bar && !bars.includes(bar)) bars.push(bar)
    const content = rect(chord.firstElementChild ?? chord)
    // Where the chord's text itself is, all of it (a chord is drawn as several spans)
    const range = document.createRange()
    range.selectNodeContents(chord)
    const text = rect(range)
    return {
      bar: bar ? bars.indexOf(bar) : -1,
      name: chord.textContent.trim(),
      px: parseFloat(getComputedStyle(chord).fontSize) * zoomOf(bar ?? chord),
      content,
      text,
      barRect: bar ? rect(bar) : null,
      cutOff: chord.scrollWidth > chord.clientWidth + 1,
      offScreen: !!screen && (text.right > screen.right + 1 || text.left < screen.left - 1),
      staggered: bar?.dataset.lines === '2',
    }
  })
  const sections = [...document.querySelectorAll('.band-chart .bar-grid')]
    .map((grid, i) => (grid.scrollWidth > grid.clientWidth + 1 ? i + 1 : 0))
    .filter(Boolean)
  return { chords, sections }
}

const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1

/** The problems in one page, as [where, text]: where is `bar <n>` or `section <n>`, from 1. */
function problems({ chords, sections }) {
  const found = sections.map(n => [`section ${n}`, 'runs past its width'])
  chords.forEach((c, i) => {
    const n = `bar ${c.bar + 1}`
    if (c.px < 20) found.push([n, `${c.name} chord under 20 px (${c.px.toFixed(1)} px)`])
    const b = c.barRect
    if (b && (c.content.left < b.left - 1 || c.content.right > b.right + 1 || c.content.top < b.top - 1 || c.content.bottom > b.bottom + 1)) {
      found.push([n, `${c.name} runs past its bar`])
    }
    if (c.cutOff) found.push([n, `${c.name} cut off`])
    if (c.offScreen) found.push([n, `${c.name} off the screen`])
    // Staggered: the chords are in playing order, and each must start where the one before ends
    const next = chords[i + 1]
    if (c.staggered && next && next.bar === c.bar && next.text.left < c.text.right - 1) {
      found.push([n, `${next.name} out of order (starts before ${c.name} ends)`])
    }
    for (const o of chords.slice(i + 1)) {
      if (o.bar === c.bar && overlap(c.content, o.content)) found.push([n, `${c.name} overlaps ${o.name}`])
    }
  })
  return found
}

/** Waits until the chords stop moving (two reads 150 ms apart agree), then two animation frames. */
async function settle(page, what) {
  let last = null
  for (let i = 0; i < 80; i++) {
    const read = await page.evaluate(READ_CHORDS)
    const now = JSON.stringify(read)
    if (read.chords.length && now === last) {
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
      return page.evaluate(READ_CHORDS)
    }
    last = now
    await page.waitForTimeout(150)
  }
  throw new Error(`The chart did not settle: ${what}`)
}

async function startServer() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: APP, stdio: 'ignore' })
  server.on('error', error => {
    console.error(`Preview server failed to start: ${error.message}`)
    process.exit(1)
  })
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) return server
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  server.kill()
  throw new Error('The preview server did not start (is the app built? is port 4179 free?)')
}

/** Opens the song with this index through the Songs sheet; returns its title. */
async function openSong(page, index) {
  await page.getByRole('button', { name: /^Songs, / }).click()
  const sheet = page.getByRole('dialog', { name: 'All songs' })
  const rows = sheet.locator('.songtile')
  if ((await rows.count()) !== EXPECTED_SONGS) throw new Error(`Expected ${EXPECTED_SONGS} songs in the sheet, found ${await rows.count()}`)
  const title = (await rows.nth(index).locator('.songtile-title').textContent()).trim()
  await rows.nth(index).click()
  await sheet.waitFor({ state: 'detached' })
  return title
}

/** Makes the app show this screen. The bottom-bar button is named for the screen it switches TO. */
async function onScreen(page, screen) {
  await page.waitForSelector('[aria-label^="Switch to "]')
  const other = screen === 'Stage' ? 'Practice' : 'Stage'
  if (await page.getByRole('button', { name: `Switch to ${other}` }).count()) return
  await page.getByRole('button', { name: `Switch to ${screen}` }).click()
  await page.getByRole('button', { name: `Switch to ${other}` }).waitFor()
}

const hashes = existsSync(join(SHOTS, 'hashes.json')) ? JSON.parse(readFileSync(join(SHOTS, 'hashes.json'), 'utf8')) : {}
const changed = []
const lines = []
let pages = 0

const server = await startServer()
try {
  for (const [engineName, engine] of ENGINES) {
    const browser = await engine.launch()
    for (const size of SIZES) {
      for (const screen of SCREENS) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: true })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(URL)
        await onScreen(page, screen)
        for (let i = 0; i < EXPECTED_SONGS; i++) {
          const title = await openSong(page, i)
          const nn = String(i + 1).padStart(2, '0')
          const label = `${size.name} ${screen.toLowerCase()} ${nn} ${title}`
          let chords
          try {
            chords = await settle(page, label)
          } catch (error) {
            lines.push(`${engineName} ${label}: ${error.message}`)
            continue
          }
          pages++
          for (const [where, text] of problems(chords)) lines.push(`${engineName} ${label} ${where}: ${text}`)
          const file = join(SHOTS, engineName, size.name, screen.toLowerCase(), `${nn}-${slug(title)}.png`)
          mkdirSync(dirname(file), { recursive: true })
          const picture = await page.screenshot({ fullPage: true })
          writeFileSync(file, picture)
          const key = file.slice(SHOTS.length + 1)
          const hash = createHash('sha256').update(picture).digest('hex')
          if (hashes[key] !== hash) changed.push(key)
          hashes[key] = hash
        }
        for (const message of errors) lines.push(`${engineName} ${size.name} ${screen.toLowerCase()}: page error: ${message}`)
        await context.close()
      }
    }
    await browser.close()
  }
} finally {
  server.kill()
}

mkdirSync(SHOTS, { recursive: true })
writeFileSync(join(SHOTS, 'hashes.json'), JSON.stringify(hashes, null, 2))
writeFileSync(join(SHOTS, 'changed.txt'), changed.join('\n') + (changed.length ? '\n' : ''))
console.log(lines.join('\n'))
console.log(`\n${pages} pages checked, ${lines.length} problems, ${changed.length} pictures changed`)
process.exit(lines.length ? 1 : 0)
