// The release check: opens every song at the iPad sizes (and a phone) on Stage and Practice,
// in WebKit (iPad Safari's engine) and Chromium, and fails on any chord that is too small,
// crosses its bar, overlaps another chord, is cut off, is off the screen or is out of playing
// order in a staggered bar, or drawn differently from a bar of its section with the same chords;
// and on any section wider than its room. Then it does the same for the player's edited charts,
// saved as the app saves them (release-saved.mjs), on the 11-inch iPad in WebKit; and the check's
// own song of unsure bars at every size: an unsure mark may not cover a chord or leave the screen.
// Usage, from app/: npm run build && npm run check:release
// Exit 0 when everything passes; otherwise 1 with one line per problem:
//   <engine> <size> <screen> <nn> <song> bar <n>: <problem>
//   <engine> <size> <screen> <nn> <song> section <n>: runs past its width
//   webkit <size> <screen> saved <song> bar <n>: <problem>
//   added <file>: skipped, <why>   (a file in src/data/added the app will not open)
// On the phone, a row that cannot fit even at 20 px (a section too wide, a chord off the screen)
// is a `phone warning: ...` line instead, and does not fail the check (release-problems.mjs).
// Pictures: release-shots/<engine>/<size>/<screen>/<nn>-<song>.png (saved-<song>.png for the saved
// charts), and release-shots/changed.txt lists the pictures whose SHA-256 differs from the run
// before (hashes in release-shots/hashes.json).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from 'playwright'
import { loadAddedSongs } from './added-songs.mjs'
import { problems, sortOut } from './release-problems.mjs'
import { CHECK_MARKS, CHECK_SONG, PUT_SAVED, SAVED } from './release-saved.mjs'

const PORT = 4179
const URL = `http://localhost:${PORT}/gm-setlist/`
const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = join(APP, 'release-shots')
/** The songs in the gig running order, the default list. */
const SHIPPED_SONGS = 21
/** The songs written as JSON in src/data/added: in the library, not in the gig list, so the check puts them in its list. */
const ADDED = await loadAddedSongs()
const ADDED_TITLES = ADDED.songs.map(song => song.title)
/** The gig list and the added songs, as the Songs sheet shows them once the check has added them. */
const EXPECTED_SONGS = SHIPPED_SONGS + ADDED_TITLES.length
/** With the check's own song put in the app's store, the Songs sheet has one more. */
const WITH_CHECK_SONG = EXPECTED_SONGS + 1
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
/** The sizes the saved charts are checked at: the 11-inch iPad, upright and on its side. */
const SAVED_SIZES = ['820x1180', '1180x820']

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// In the page: every chord with its bar number, drawn size and the rects the checks compare;
// each bar with chords: its section, its chords as written and its lines; and the sections
// (bar grids, numbered from 1) whose bars run past their width.
const READ_CHORDS = () => {
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
      px: parseFloat(getComputedStyle(chord).fontSize),
      content,
      text,
      barRect: bar ? rect(bar) : null,
      cutOff: chord.scrollWidth > chord.clientWidth + 1,
      offScreen: !!screen && (text.right > screen.right + 1 || text.left < screen.left - 1),
      staggered: bar?.dataset.lines === '2',
      row: chord.style.getPropertyValue('--row'),
    }
  })
  // The unsure marks: where each one is, and whether it runs past the screen
  const marks = [...document.querySelectorAll('.band-chart .bar-unsure')].map(mark => {
    const r = rect(mark)
    return { rect: r, offScreen: !!screen && (r.right > screen.right + 1 || r.left < screen.left - 1) }
  })
  const grids = [...document.querySelectorAll('.band-chart .bar-grid')]
  const barInfo = bars.map(bar => ({ section: grids.indexOf(bar.closest('.bar-grid')), chords: bar.dataset.chords ?? '', lines: bar.dataset.lines ?? '1' }))
  const sections = grids
    .map((grid, i) => (grid.scrollWidth > grid.clientWidth + 1 ? i + 1 : 0))
    .filter(Boolean)
  const chart = document.querySelector('.band-chart')
  // Chord diagrams on the page before anything is tapped: only in Practice's row of shapes
  // under the chart (ShapesRow.tsx), never in front of the chart and never on Stage
  const diagrams = [...document.querySelectorAll('main svg[role="img"]')].filter(d => !d.closest('.practice-screen .shapes-row')).length
  return { chords, sections, bars: barInfo, diagrams, marks, chartPx: chart ? parseFloat(getComputedStyle(chart).fontSize) : 0 }
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
  // Vite itself, not npx: killing npx can leave the server holding the port for the next run.
  // In a process group of its own, so the whole group goes when the check ends
  const server = spawn(join(APP, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], {
    cwd: APP,
    stdio: 'ignore',
    detached: true,
  })
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
  await stopServer(server)
  throw new Error('The preview server did not start (is the app built? is port 4179 free?)')
}

/** Stops the preview server and everything it started, and waits until it has gone. */
async function stopServer(server) {
  if (server.exitCode !== null || server.signalCode !== null) return
  const gone = new Promise(resolve => server.once('exit', resolve))
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    server.kill('SIGTERM')
  }
  if (await Promise.race([gone.then(() => true), sleep(5000).then(() => false)])) return
  try {
    process.kill(-server.pid, 'SIGKILL')
  } catch {
    server.kill('SIGKILL')
  }
  await gone
}

/** Opens the song with this title, or this index, through the Songs sheet; returns its title. */
async function openSong(page, which, expected = EXPECTED_SONGS) {
  await page.getByRole('button', { name: /^Songs, / }).click()
  const sheet = page.getByRole('dialog', { name: 'All songs' })
  const rows = sheet.locator('.songtile')
  if ((await rows.count()) !== expected) throw new Error(`Expected ${expected} songs in the sheet, found ${await rows.count()}`)
  const titles = (await rows.locator('.songtile-title').allTextContents()).map(t => t.trim())
  const index = typeof which === 'number' ? which : titles.indexOf(which)
  if (index < 0) throw new Error(`No song "${which}" in the sheet`)
  const title = titles[index]
  await rows.nth(index).click()
  await sheet.waitFor({ state: 'detached' })
  await shows(page, title)
  return title
}

/** The setlist as the Songs sheet shows it: its name and the titles in order. Leaves the sheet closed. */
async function shownList(page) {
  await page.getByRole('button', { name: /^Songs, / }).click()
  const sheet = page.getByRole('dialog', { name: 'All songs' })
  const titles = (await sheet.locator('.songtile .songtile-title').allTextContents()).map(t => t.trim())
  const name = (await sheet.locator('.sheet-title').textContent()).trim()
  await sheet.locator('.songtile').first().click()
  await sheet.waitFor({ state: 'detached' })
  return { name, titles }
}

/** Fails the whole check unless the screen's song title is the one opened: else the wrong chart is measured. */
async function shows(page, title) {
  const heading = page.locator('.song-title').first()
  let shown = null
  for (let i = 0; i < 50; i++) {
    shown = (await heading.count()) ? (await heading.textContent()).trim() : null
    if (shown === title) return
    await page.waitForTimeout(100)
  }
  throw new Error(`Opened "${title}" from the Songs sheet, but the screen shows "${shown}"`)
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
const lines = ADDED.skipped.map(({ file, reason }) => `added ${file}: skipped, ${reason}`)
const warnings = []
let pages = 0

/** Measures the song on screen, records its problems, and keeps its picture as `<shot>.png`. */
async function check(page, engineName, size, screen, label, shot, marker, markCount) {
  let chords
  try {
    chords = await settle(page, label)
  } catch (error) {
    lines.push(`${engineName} ${label}: ${error.message}`)
    return
  }
  pages++
  if (marker && !chords.chords.some(c => c.name === marker)) lines.push(`${engineName} ${label}: the saved chart is not drawn (no ${marker})`)
  if (markCount !== undefined && chords.marks.length !== markCount) lines.push(`${engineName} ${label}: ${chords.marks.length} unsure marks drawn, expected ${markCount}`)
  const { failures, warnings: phone } = sortOut(size.name, chords.chartPx, problems(chords))
  for (const [where, text] of failures) lines.push(`${engineName} ${label} ${where}: ${text}`)
  for (const [where, text] of phone) warnings.push(`phone warning: ${engineName} ${label} ${where}: ${text}`)
  const file = join(SHOTS, engineName, size.name, screen.toLowerCase(), `${shot}.png`)
  mkdirSync(dirname(file), { recursive: true })
  const picture = await page.screenshot({ fullPage: true })
  writeFileSync(file, picture)
  const key = file.slice(SHOTS.length + 1)
  const hash = createHash('sha256').update(picture).digest('hex')
  if (hashes[key] !== hash) changed.push(key)
  hashes[key] = hash
}

/** A fresh page at this size on this screen; with `saved`, the player's edited copies stored first. */
async function openApp(browser, size, screen, errors, saved) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: true })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(URL)
  await onScreen(page, screen)
  if (saved || ADDED_TITLES.length) {
    // Stored once the app has made its database, then read back as the app starts again;
    // the added songs go in the list as the player would put them there with Edit list
    const songs = saved ? [CHECK_SONG] : []
    await page.evaluate(PUT_SAVED, { saved: saved ?? [], songs, list: await shownList(page), added: ADDED_TITLES })
    await page.reload()
    await onScreen(page, screen)
  }
  return { context, page }
}

const server = await startServer()
try {
  for (const [engineName, engine] of ENGINES) {
    const browser = await engine.launch()
    for (const size of SIZES) {
      for (const screen of SCREENS) {
        const errors = []
        const { context, page } = await openApp(browser, size, screen, errors)
        for (let i = 0; i < EXPECTED_SONGS; i++) {
          const title = await openSong(page, i)
          const nn = String(i + 1).padStart(2, '0')
          await check(page, engineName, size, screen, `${size.name} ${screen.toLowerCase()} ${nn} ${title}`, `${nn}-${slug(title)}`)
        }
        for (const message of errors) lines.push(`${engineName} ${size.name} ${screen.toLowerCase()}: page error: ${message}`)
        await context.close()
      }
    }
    // The player's own edited charts, as saved (on the iPad, both ways up, in iPad Safari's engine),
    // and the check's own song with its unsure marks (every size, both engines)
    for (const size of SIZES) {
      for (const screen of SCREENS) {
        const errors = []
        const { context, page } = await openApp(browser, size, screen, errors, SAVED)
        if (engineName === 'webkit' && SAVED_SIZES.includes(size.name)) {
          for (const { title, marker } of SAVED) {
            await openSong(page, title, WITH_CHECK_SONG)
            await check(page, engineName, size, screen, `${size.name} ${screen.toLowerCase()} saved ${title}`, `saved-${slug(title)}`, marker)
          }
        }
        await openSong(page, CHECK_SONG.title, WITH_CHECK_SONG)
        await check(page, engineName, size, screen, `${size.name} ${screen.toLowerCase()} saved ${CHECK_SONG.title}`, `saved-${slug(CHECK_SONG.title)}`, 'Bbmaj9(#11)/D', CHECK_MARKS)
        for (const message of errors) lines.push(`${engineName} ${size.name} ${screen.toLowerCase()} saved: page error: ${message}`)
        await context.close()
      }
    }
    await browser.close()
  }
} finally {
  await stopServer(server)
}

mkdirSync(SHOTS, { recursive: true })
writeFileSync(join(SHOTS, 'hashes.json'), JSON.stringify(hashes, null, 2))
writeFileSync(join(SHOTS, 'changed.txt'), changed.join('\n') + (changed.length ? '\n' : ''))
console.log([...lines, ...warnings].join('\n'))
console.log(`\n${pages} pages checked, ${lines.length} problems, ${warnings.length} phone warnings, ${changed.length} pictures changed`)
process.exit(lines.length ? 1 : 0)
