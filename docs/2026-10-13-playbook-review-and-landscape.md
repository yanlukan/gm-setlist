# PlayBook: a review and a road to many more musicians

Written 2026-10-13 from a seventeen-agent research workflow: seven reports on the app (product, stack, server, visuals, a musician's read), five on the market (big products, indie and open source, formats and hardware, musicians' needs, chart layout), five independent verification passes over the market reports, and one critic pass over the first draft. This is the corrected version after that critic pass.

Repository `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying`, branch `main` at `c1b2a91`, app version 3.63.0, live at https://yanlukan.github.io/gm-setlist/. App figures come from the code and its tests. Market figures carry a URL; figures that could not be confirmed on a primary page are marked unverified. Nothing in the app was installed, downloaded or changed while this was written. Section 15 lists exactly what was and was not checked.

No lyrics were read, stored or quoted anywhere in this work.

## 1. Summary

PlayBook is a one-band stage chart viewer: a React PWA showing the 21 songs of a George Michael tribute set as chord charts in bars, with the songbook chord shapes, transposition, a set timer and the Boss GX-10 patch name for each song, on an iPad, offline, with no account and no server.

Three biggest strengths: charts written in bars with repeat marks and a form line, which none of the stage chart apps reviewed advertises; an edit model that never destroys the original (overlay edits, per-song versions, whole-store snapshots) backed by 808 passing tests; and a lean build (eight runtime packages, 152 KB gzipped) that works with no network.

Three biggest weaknesses: there is no way to get a single chart in or out (no chart import, no chart export, no chart sharing, no sync between devices; the only exits are a whole-store JSON backup and a setlist copied as text), and iPad Safari and the home-screen app hold two separate copies of the data; the owner does not yet trust the chords ("Most of the chords are bull shit. Not usable at all to play with a band"); and the stage screen budget is poor, 48 to 66 percent of the display for the chart, with a Stage mode that frees only 84 px.

Honest gap to a product used by millions: large. The stage-chart niche has never produced one. Its best products sold from tens of thousands up to about one to two million one-off licences over fifteen years (forScore reports about a million copies; iReal Pro's vendor says "2M+ musicians" and a tracker estimates 2.25 million installs across both stores). Every app that reached tens of millions did so through content (user-written tabs, auto-detected chords, scores) or a channel (churches, lessons, a free utility), never through a better chart view. PlayBook has no accounts, sync, import, catalogue, store presence, Android, analytics or team. The bar chart is distinctive but unproven at scale.

## 2. What PlayBook does today

### Who it is for

Observed: the app is built for one guitarist in one band, with a keyboard view added in 3.51 for the band's keyboard player. The 21 songs in `app/src/data/songs.ts` are the tribute running order; every song has a GX-10 preset and a duration, 20 have a form line, 18 name a songbook page for their shapes (17 from the songbook, one from a Songsterr tab), 6 carry a lower key with a transpose offset and 6 a cue note. There is no onboarding, no help and no empty-library experience beyond "Restore GM Tribute Order"; the only ways to get content in are typing it chord by chord in the editor or importing a PlayBook backup.

The March 2026 gig failed on four data-loss faults, fixed in 3.0.0. The September and October work has been about the correctness and readability of the charts.

### The job on a gig

Observed design, inferred use. The iPad sits on a stand. Before the set the player opens the app, which works offline, checks the running order in the grid and enters Stage mode. Each song shows at the largest chord size that fits, in the band's key, with the capo instruction, the amp preset name, a cue if the arrangement needs one, the song-order strip and the chord diagrams for the shapes the band plays. A pedal press or swipe pages the chart if it overflows, then advances to the next song; the bottom bar already names the next song, its key and the preset to dial in. If anything crashes, the data is still there and can be exported before anything is reset. Edits made in rehearsal are kept as versions and can be reverted one at a time or all at once.

### Feature inventory

| Feature | Where | Notes |
|---|---|---|
| Setlists: several named lists, drag to reorder, add from catalogue | `components/setlist/SetlistScreen.tsx`, `AddSongPicker.tsx`, @dnd-kit | Default "GM Tribute, Sept 2026" plus a rehearsal list of 8 songs; new, rename, duplicate, share as text, delete (with a restore point). New and rename use `window.prompt`, delete uses `window.confirm`. Running total; the set is about 1 h 39 m |
| Song sheet in bars | `components/song/SongSheet.tsx` (375 lines), `components/chart/BarGrid.tsx`, `music/bars.ts` | `\|` bar lines, `%` repeat bar, `N.C.`, `(xN)` line repeat; one part per line; 135 of 160 sections in bars; Careless Whisper still flat text |
| Fit-to-screen chord font | `SongSheet.tsx`, `useFitText` | Binary search, MIN 20 px, MAX 64 px, no-wrap floor 30 px |
| Non-destructive editor | `components/edit/ChartEditor.tsx` | Cyclomatic complexity 119, nesting 14; undo stack of 200; writes an overlay to `songEdits`; one-tap "back to original" |
| Transpose, lower key, capo | `music/transpose.ts`, `Song.lowerKey`, `Song.transpose` | Chords stored at source pitch, transposed at render |
| Songbook chord shapes | `components/diagrams/DiagramsBar.tsx` (diagram size 112), `VoicingPicker`, `Song.playerShapes` | Diagram strip per song; saved picks per song; own shapes |
| Chord Finder | `components/finder/ChordFinder.tsx` | By neck area and string set; typed-chord chips; paged 48 |
| Keyboard view | `music/chart-view.ts` (`Instrument = 'guitar' \| 'keyboard'`), rendered by SongSheet, TopBar, SongGrid, DiagramsBar | Sounding pitch; no shapes, capo, positions or presets. Not `ChordKeyboard`, which is the editor's chord pad |
| Stage mode | `body.stage`, `--bg: #000` | Frees only 84 px (section 5) |
| Pedal and swipe | `hooks/use-pedal-keys.ts` | Next: ArrowRight, ArrowDown, PageDown. Previous: ArrowLeft, ArrowUp, PageUp. Swipe over 80 px |
| Tap tempo with click | `TapTempo`, Web Audio | Last 8 taps, 20 to 300 BPM |
| Strum preview | Karplus-Strong, Web Audio | Open strings MIDI [40, 45, 50, 55, 59, 64] |
| GX-10 preset per song | `Song.preset`, `TopBar` | Display only; no MIDI |
| Versions and snapshots | `store/song-history.ts` (20 versions per song, 10-minute gap), `store/persistence.ts` (30 store snapshots) | Versions per song, snapshots of the whole store |
| Backup export and import | ⋮ menu | One JSON of the whole store; omits snapshots, history and most settings; import clears `songEdits` then writes |
| Dead: online search and import | `components/search/ChordSearch.tsx`, `components/import/ImportModal.tsx` | `ChordSearch` was removed from the top bar in 4debd52 (2026-09-29); `ImportModal` was never imported anywhere in the repository's history |

Accessibility: 94 `aria-label` and 34 `role=` attributes; no `:focus-visible` styles, no reduced-motion query, `user-scalable=no` in the viewport meta.

### What is band-specific

Everything useful to the owner is hard-coded: the 21 compiled songs, the GX-10 preset names, the lower keys, the printed-songbook page references. Setlists are several, but all live in one IndexedDB record keyed `'current'`. Only the `songEdits` store uses the title as its key, but the title is the song's identity everywhere else too (`songTitles` in setlists, `history:<title>` in settings), so two songs cannot share a title and a rename orphans the edits. There is no user or band object.

### What generalises, and what does not

Generalises as it is: the chart renderer (bars, repeat bars, repeat counts, one part per line, fit-to-screen type, stage palette); the edit overlay with versions, snapshots and reset; transpose at render time with capo and "play X, sounds Y"; setlists with drag reorder, set length, next-song bar, cue strip, pedal and swipe paging; tap tempo with a click; the voicing picker, own shapes and Chord Finder; backup export and import; the service-worker offline strategy.

Generalises with a rename or a field change: `preset {name, slot, solo}` becomes a generic "sound" per song; `lowerKey` and "band key" become "arrangement key" as distinct from the recording key, which every covers band needs; "Songbook" as a shape source is already a free-text field (`shapesFrom`); "Restore GM Tribute Order" becomes "restore the shipped setlist" or goes away.

Does not generalise: the 21 songs with their shapes, notes and cues. They are the owner's transcription work, derived from a purchased songbook and from recordings, and could not be shipped to other users without a rights review (inferred; not a legal opinion). Nor does the assumption of exactly one guitarist and one keyboard player sharing nothing, or the GitHub Pages path as the app's identity.

## 3. How it is built

Observed from `app/package.json`: React 19.2.4, zustand 5.0.12, idb 8.0.3, @dnd-kit (core 6.3.1, sortable 10.0.0, utilities 3.2.2), @tombatossals/chords-db 0.5.1, Vite 8.0.3, TypeScript 6.0.2, Vitest 4.1.2. Eight runtime dependencies; no router, CSS framework, analytics, error reporting or linter. `package.json` says version 1.0.0 while `APP_VERSION` in the code is 3.63.0. There is no README and the repository has no git tags; the only release record is the version constant and the commit messages.

Build and deploy: `.github/workflows/deploy.yml` on Node 20 runs `npm ci` and `npm run build` (`tsc && vite build`) and deploys to GitHub Pages without running the tests. Vite `base` is `/gm-setlist/`; a URL change once wiped the iPad's data, because IndexedDB is per origin. A local build produced 642,669 bytes of JavaScript (151,558 gzipped) and 32,558 bytes of CSS (6,610 gzipped), with the 236 KB `guitar.json` chord database compiled in; `dist` is not tracked, so these are local figures.

PWA and offline: a hand-written service worker in `app/public/sw.js` (cache name `playbook-v3`) serves hashed assets cache-first, races the network for the page with a 3,000 ms timeout, and keeps a new page only when every asset it references is cached. Sixteen tests cover it. A grep for `fetch(`, `XMLHttpRequest`, `WebSocket` and `sendBeacon` hits only the two dead components, so the shipped app makes no network request beyond loading itself. The manifest lacks `id`, `description`, screenshots and a maskable icon.

Data: IndexedDB via `idb`, database `playbook` version 2, stores `songEdits` (keyPath `title`), `setlists` (one record, `'current'`), `customSongs` (`'all'`), `settings` (string keys: theme, voicings, view mode, position, instrument, own shapes, `seeded:<id>`, `history:<title>`) and `snapshots` (auto-increment, 30 kept). Writes are not globally serialised: `song-history.ts` has the only write queue; the store's `track()` counts pending and failed saves rather than queuing them, and setlist writes after a snapshot are chained one after another. `navigator.storage.persist()` is requested in `App.tsx` line 109, but Safari does not grant durable storage this way, so WebKit's seven-day eviction of script-writable storage applies to the browser copy on an iPad that has not opened the site for a week. On hydrate failure the app goes read-only rather than overwriting. `migrate.ts` reads the legacy `cheatsheet-*` localStorage keys once. The legacy single-file app (root `index.html`, 2,352 lines, plus `songs.js`, `sw.js` and `manifest.json`) is tracked but not deployed.

Tests: 808 in 59 files, 4.58 s. Twenty check a song's bars against the recording length (16 in `songs-in-bars.test.ts`, 4 in `songs-in-bars-6.test.ts`). Coverage is strongest on the data model and service worker, thinnest on the editor, and everything runs in jsdom; nothing has run in WebKit.

Code health: 162 source files, 1,709 symbols, mean cyclomatic complexity 6.04. Hotspots: `ChartEditor` 119, `SongSheet` 113, `TopBar` 108 (366 lines), `SongView` 75 (dead), `ChordFinder` 73. Two files break the owner's 800-line rule: `layout.css` 1,133 and `store/use-store.ts` 816. There is one dependency cycle, type-only, between `own-shapes.ts`, `use-store.ts` and `view-settings.ts`. `VoicingPicker` and `ErrorBoundary` hard-code dark colours and ignore the light theme. The product report's "48.9 percent dead code" counts CSS classes and Express and service-worker handlers; the stack report's grep cross-check finds 1,140 lines of genuinely dead TypeScript (`ImportModal` 459, `ResultsView` 187, `ChordSearch` 173, `SectionRow` 137, `SectionPicker` 129, `Badge` 32, `ProgressView` 23). Trust the stack report; it names the files.

Commits: 201 on 13 dates, 106 in March 2026, 3 in April, 53 in September, 39 in October; two bursts, one person. Seven CSS files, 1,572 lines; the accent `#4a9eff` on white is 2.75:1, which fails WCAG AA. `server/deploy.sh` hard-codes a root login to 144.126.224.140.

Hosting and distribution: GitHub Pages is free with a soft limit of 100 GB of bandwidth a month, but it sets no custom headers (so no Content-Security-Policy and no cache-control tuning) and has no preview deployments. Cloudflare Pages or Netlify fix all three on a free tier and allow a custom domain, which would also fix the "data dies with the URL" problem once. A native shell through Capacitor adds the Apple developer fee, App Store review cycles and two shells to maintain.

## 4. The server and the data pipeline

What exists: `server/` is 2,080 tracked lines written in 22 commits between 2026-03-23 and 2026-03-31. `index.js` (315 lines, Express 4) exposes `/api/health`, `/api/chords/search` and `/api/analyze/*`. `analyze.py` (Python 3.12, Essentia, librosa) estimates key and tempo and runs a BTC transformer for chords (`btc_chords.py`, loading weights with `torch.load(..., weights_only=False)`), with the time signature hard-coded to 4/4. `music-ai.js` is a self-described skeleton for the Music AI API with `confidence: 95` hard-coded. `youtube.js` fetches audio with yt-dlp, capped at 600 s.

`server/data` holds 3.5 GB, all gitignored. The files that carry lyrics are: `songs-db.json` (349 MB, 259,484 songs, 134,741 with a lyrics field `l`), `kaggle/chords_and_lyrics.csv` (651.6 MB), `chords_and_lyrics.pkl` (608.9 MB) and `kaggle/songs.csv` (856.5 MB). `chordonomicon-index.json` indexes 275,010 entries from Chordonomicon, which is licensed CC BY-NC 4.0.

What works: `analyze.py`, run offline in September 2026 to check the setlist's keys and tempos against the owner's recordings.

What is dormant: everything networked. On 2026-10-13 `dig api.stratlab.uk` returned no record, `144.126.224.140:3000` refused the connection and nothing listened on `localhost:3000`. The musician report inferred this from a September note; the server report probed DNS and TCP, so trust the server report. The deployed app is served over HTTPS, so the `http://…:3000` candidates in `ChordSearch.tsx` were always blocked as mixed content; only the never-configured `https://api.stratlab.uk` could have worked.

Risks, observed: Chordonomicon's licence rules out commercial use; four lyric-bearing files sit on a droplet and the old `ChordSearch` type anticipated serving lyric lines; yt-dlp runs against YouTube's terms; `torch.load` without `weights_only` executes arbitrary pickles; the droplet root login is tracked. Inference: delete `youtube.js` and `music-ai.js`, keep `analyze.py` as an offline check, never ship the lyric data.

A chord-accuracy method that follows from what exists: songbook scans as the source of record for the 17 book songs, `analyze.py` against the recording as an advisory check on key, tempo and bar count, and band confirmation at rehearsal as the final word. The detector should never overwrite a chart.

## 5. Visual review

Method: Chromium emulation of the live site at iPad portrait (820 by 1180), landscape (1180 by 820) and phone (390 by 844) on Kissing a Fool, Faith and Somebody to Love; the ⋮ footer read "PlayBook v3.63.0, browser copy, built 2026-10-12 18:27". Also opened: the Setlists panel, the ⋮ menu, the light theme, Chord Finder (empty and with "Em11"), Stage mode, the keyboard view and the editor for one song (entered and left by reloading; nothing saved). Not measured: a real iPad, stage lighting, a pedal, any save or reset flow.

Portrait: top bar 53 px, 101 px when the title wraps; chart area 776 px, 66 percent of the screen; diagram strip 195 to 234 px depending on the song; song nav 69 px; chord font 22 to 39 px by song. Landscape: chart 464 to 503 px, 57 to 61 percent; chord font 20 to 29 px; 40 to 45 percent of the width unused because each part's grid is `width: max-content` and centred. Phone: top bar 134 px, chart 407 to 446 px, 48 to 53 percent, chord font 20 to 21 px. Section labels 11 px and form chips 14 px at every size; chord tap target 26 px tall.

Panels: the Setlists panel has a Done button of 80 by 44 px, rows 51 to 54 px tall, a 48 by 48 px remove × on every row, and text down to 8.64 px. The ⋮ menu has eleven items of 248 by 48 px. Chord Finder's name input is 676 by 44 px; "Em11" produced 20 shapes, 4 tagged LIBRARY and 16 GENERATED, with finger numbers at 8.64 px. Stage mode: black background, chart area 860 px, chord font 26 px, labels still 11 px; the diagram strip (198 px) and song nav (69 px) remain, so Kissing a Fool is 1,066 px of content in 860 px and still scrolls. Keyboard view: no strip, chart area 1,058 px, chord font 25 px, the best use of the screen in the app. Editor: Done (blue, 67 by 40 px) sits directly beside Reset (red, 71 by 40 px); chord cells 63 px tall at a 30 px font; Clear and Add buttons 32 px tall.

Contrast, computed from the measured colours with the WCAG 2 formula, not measured on a display:

| Text | On | Ratio |
|---|---|---|
| White chords | `#1a1a1a` | 17.4:1 |
| Grey `#888` labels and notes | `#1a1a1a` | 4.9:1 |
| Verse blue | `#1a1a1a` | 6.3:1 |
| Chorus green | `#1a1a1a` | 10:1 |
| Bridge orange | `#1a1a1a` | 7.7:1 |
| Amber cue | `#1a1a1a` | 8.1:1 |
| Light theme part labels | white | 4.8:1 or better |

Contrast is not the problem anywhere; size is.

What helps: the chord line as the hero, 700-weight white on near-black; one part per line; the form line; the cue box; the position pill and shapes strip; true black in Stage mode; a light theme with re-chosen part colours rather than an inversion; menus and panels that respect 44 px.

What hurts: bar widths vary by part (98 to 168 px within one song) because each part is its own grid, so the eye cannot track beats down the page; chord size changes between songs; the strip and nav eat a third of the screen and Stage mode leaves them in place; the top bar changes height when a title wraps, so the chart starts at a different y on different songs; destructive controls sit beside routine ones (Done beside Reset, a remove × on every setlist row, "Back to the original charts" one row from "Light Theme" with no divider); nothing on the chart exceeds 39 px even on a tablet, and the things tapped most on stage (a chord, a label) are the smallest targets.

Five changes, in order: (1) one grid per song with equal bar widths, four bars a row in portrait and eight in landscape, two on a phone; (2) a real Stage mode that collapses the strip by default, shrinks the nav to a 44 px strip or a swipe and keeps the top bar to one row, worth about 1,100 px of chart in portrait; (3) labels and chips scaled with the chord font, 16 px floor, 44 px tap boxes; (4) a fixed-height top bar with the song badges moved into the chart head; (5) destructive actions grouped at the end of menus behind a divider or a confirm step.

A readability test that needs no software: on the owner's iPad at 70 cm, measure the cap height of a chord with a ruler. Under 3.3 mm is below the 24 px floor that section 12 derives (a 24 px chord has a cap height of about 3.3 mm on a 10.9-inch iPad); compare with the printed songbook, which the band already reads from a stand.

## 6. Good points

1. **Charts in bars, with repeats and a form line.** `music/bars.ts` parses `|`, `%`, `N.C.` and `(xN)`; 135 of 160 sections are in bars; 20 tests check bar counts against recording lengths. None of the stage chart apps the reports examined advertises a bar grid. This rests on each product's own pages and on https://songcharter.app/compare, which shows OnSong, SongSheet Pro, SongbookPro and BandHelper as chords-over-lyrics; that page belongs to SongCharter, a $19.99 app released 2026-08-27 with no ratings yet, and whether SongCharter's own charts are bar grids was not established. iReal Pro, Soundslice, Chord ai and Moises do model bars, but none is a stage setlist tool.
2. **Edits never destroy the original.** An overlay, 20 versions per song, 30 whole-store snapshots, read-only on hydrate failure, a queued history writer. Users of OnSong, forScore, MobileSheets, Setlist Helper and Music Stand all report sync or crash data loss (https://umgf.com/viewtopic.php?p=2847000, https://apps.apple.com/us/app/mobilesheets/id1620569987, https://apps.apple.com/us/app/setlist-helper/id939098002?see-all=reviews&platform=ipad).
3. **Two keys per song as separate facts.** `lowerKey` plus `transpose` keep the recorded key and the band's key apart; none of the products the reports examined does this.
4. **Shapes attached to the song**, from the published voicings the band uses, not a generic diagram.
5. **Offline, account-free, fast.** 152 KB gzipped, no network calls, a tested service worker. Most stage apps are store apps; several charge once (forScore $24.99, MobileSheets $15.99, Setlist Helper $14.99 with sync included, SongBook Chordpro $19.99, Set List Maker $19.99) and Open Setlist is free, while OnSong, BandHelper and SongbookPro Groups put sync behind a subscription.
6. **A disciplined test suite for a solo project.** 808 tests in 4.6 s.
7. **The owner is the user.** 201 commits on 13 dates, each driven by a rehearsal or gig finding.

## 7. Weak points

Ranked by harm at a gig.

1. **Two copies on one iPad, no sync.** Safari and the home-screen app are separate storage; `TopBar.tsx` lines 20 to 29 label them "browser copy" and "home-screen app". Export omits snapshots and history; import clears and replaces; the owner's notes call phone-to-iPad sync "paused". The browser copy is also subject to WebKit's seven-day eviction, because Safari does not grant the durable storage the app requests. Lose the iPad, lose the charts.
2. **The chords are not trusted.** Owner's notes: "Most of the chords are bull shit. Not usable at all to play with a band" and "i still see some bullshit chords". September's `analyze.py` pass fixed keys and tempos; chord content is still being corrected song by song. A viewer with wrong charts is worse than paper.
3. **Readability has slipped.** Chord font 20 to 39 px against a target of 30 to 34 px at 70 cm (section 12; the target rests on an unverified summary of ISO 9241); long songs scroll even in Stage mode; labels 11 px; a third of the screen lost to strip and nav. The owner lost his place in Kissing a Fool at a rehearsal and named three causes: bars do not line up, parts look alike, parts run together.
4. **Editing on the device is painful and untested on iOS Safari.** Owner: "horrible", "doesn't keep the form". Complexity 119, tests in jsdom only.
5. **No way to hand a chart to a bandmate.** No link, PDF, ChordPro or second user.
6. **Data dies with the URL.** `base: '/gm-setlist/'` and per-origin IndexedDB; it has happened once.
7. **No count-in.** Tap tempo exists; nothing counts the band in from the set.
8. **The server is dead and its data is a liability** (section 4).
9. **Band hard-coding**: titles as identity, compiled songs, a printed songbook as shape source, one storage record for all setlists.
10. **No annotations**, which every PDF-capable competitor has.

Also: the deploy does not run the tests; no linter; `user-scalable=no`; no README, onboarding or help; `window.prompt` and `window.confirm` for setlist names and deletes, which look wrong in a home-screen app; two components hard-code dark colours and ignore the light theme; a type-only dependency cycle in the store; no git tags.

## 8. The landscape: big products

US store prices read 2026-10-13. AppGoblin figures are tracker estimates crawled around 2026-10-11, not store data; Google Play's own listings were truncated and AppBrain returned 403, so every Android figure below is a tracker estimate.

| Product | Maker | Price | Scale | Chart | Stage | Sharing and sync | PlayBook better / worse |
|---|---|---|---|---|---|---|---|
| OnSong | OnSong LLC | Free tier of 30 songs; Essentials $3.99/mo or $29.99/yr; Premium $5.99/mo or $59.99/yr (https://onsongapp.com/pricing/) | iOS 4.5 from 5.6K; about 18K MAU, tracker (https://appgoblin.info/apps/1330350343) | Chords over lyrics, PDF | Autoscroll, pedals, MIDI per song | OnSong Drive, SongSelect, Planning Center | Better: bars, data safety. Worse: import; Android has been "coming soon" for years |
| forScore | forScore LLC | $24.99 once; Pro $14.99/yr (https://forscore.co/kb/how-to-buy/) | iOS 4.8 from 43K; about a million copies sold, no. 3 paid iPad app of 2025, vendor (https://forscore.co/year-end-review/) | PDF | Pedals, half pages, two-up, annotations | iCloud | Different job; shows what one-off pricing does over fifteen years |
| MobileSheets | Zubersoft | $15.99 iOS (https://apps.apple.com/us/app/mobilesheets/id1620569987) | iOS 4.6 from 66; Android 4.7 from 5.4K and 320K installs, tracker (https://appgoblin.info/apps/com.zubersoft.mobilesheetspro) | PDF, image, ChordPro | Pedals, MIDI, leader and follower | Cloud import | Worse: no Android, Windows or import |
| iReal Pro | Technimo LLC | $21.99 once per platform (https://apps.apple.com/us/app/ireal-pro/id409035833) | iOS 4.9 from about 11K; vendor "2M+ Musicians worldwide", 4.8 from 82,000+ (https://www.irealpro.com/); tracker iOS 1.7M installs and 79K MAU, Android 549K installs and 8.1K MAU (https://appgoblin.info/apps/com.massimobiolcati.irealb) | Chord grid, 16 cells by 12 systems, one page | Playback, count-in, transpose | Forum library, `irealb://` links | Closest chart. Worse: no catalogue, playback or link format |
| Ultimate Guitar | Muse Group | Pro $39.99/yr or $9.99/mo; Pro+ one year $39.99; a $59.99 item is a bundle; varies by region (https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853) | iOS 4.7 from about 480K; 2.1M tabs, 30M MAU, 102M downloads, self-reported (https://www.mu.se/ultimate-guitar) | Chords over lyrics; Pro tabs | Autoscroll | Playlists | Not a stage tool; the catalogue is the product |
| Chordify | Chordify B.V. | Yearly $42 or $54, monthly $8 to $9, from the App Store in-app purchase list | iOS 4.7 from 34K; 36M songs, vendor; Android 10.1M installs, tracker (https://appgoblin.info/apps/net.chordify.chordify); 250K users and 3M songs in 2015 (https://www.ismir2015.uma.es/LBD/LBD42.pdf) | Beat grid on audio | None | Setlists | Practice tool |
| SongbookPro | Songbook Systems Ltd (Companies House 11941352) | Full unlock $5.99 on the US App Store, "about $7" per platform on the vendor page; Groups from $4 per user per year (https://songbook-pro.com/pricing) | Android 4.63 from 9.5K and 684K installs, tracker (https://appgoblin.info/apps/com.songbookpro.songbookpro) | Chords over lyrics, PDF | Pedals, fit modes | Groups | Nearest honest-pricing peer; imports ChordPro, OnSong, UG and PDF |
| Setlist Helper | Setlist Helper Inc | $14.99 once, sync included (https://www.setlisthelper.com/) | iOS 4.3 from 8; Android 4.0 from 2.3K read from a truncated Play page, unverified | Chords over lyrics, PDF | Set timing, breaks, pedals | Sync, printable sets | Set-as-document angle |
| BandHelper | Arlomedia | Solo $16, $24 or $32 a year; band of 2 to 5 $40, $60 or $80; 6 to 20 up to $120 a year (two verifiers read the tier page differently; https://www.bandhelper.com/main/pricing.html). Every tier has automatic sync and web editing | iOS 4.3 from 113; Android 69K installs, tracker | Chords over lyrics, PDF, LRC autoscroll | MIDI program changes per song, Live Sharing | Master chart plus personal versions (https://www.bandhelper.com/main/features.html) | Nearest to "one sound per song"; complex |
| Planning Center Music Stand | Planning Center | $5/mo for 50 members, $10/mo for 150, add-on to Services (https://www.planningcenter.com/music-stand) | 78,000 active churches on the about page, 90,000 in the FAQ, vendor; iOS 3.5 from 325; Android 4.1 from 828 | Publisher PDFs | Leader page turns, pedals, per-device transposition, Number view; caches the last ten plans offline | Via Services | Distribution PlayBook cannot match; weak app |
| Moises | Moises Systems Inc | Premium $5.99/mo or $39.99/yr | iOS 4.7 from 28K; 50M registered Jan 2025 (https://www.musicbusinessworldwide.com/music-ai-raises-40m-in-series-a-round-as-its-moises-platform-hits-50m-users/); 60M in a 5 June 2025 wire release, self-reported (https://www.recordoftheday.com/news-and-press/moises-earns-dual-honors-named-apples-ipad-app-of-the-year-and-design-awards-finalist) | Chords on an audio timeline | Setlists | Shared setlists | Fastest grower; a utility, not a chart |
| Chord ai | Nomad AI OÜ | Pro $10.99/mo or $69.99/yr (https://apps.apple.com/us/app/chord-ai-play-any-song/id1446177109) | iOS 4.6 from 5.9K; Android 3.3M installs, tracker | Bars and beats from audio | None | PDF, MIDI export | Bars-from-audio is wanted |

Also examined: Soundslice (free, Plus $5/mo, https://www.soundslice.com/plans/); Yousician (20 million monthly users across its apps, TechCrunch, 28 April 2021, https://techcrunch.com/2021/04/28/yousician-series-b/); MuseScore (3.6M scores of which 1.2M from publishers, 100M yearly visitors, "400M+" users across Muse Group, 1.5M monthly users of MuseScore Studio, all vendor figures, https://mu.se/about); Songsterr ($9.90 a month, unverified); Flat.io. Dropped from the first draft as unsourced: Chordify's registered-user and visitor claims, a $24 Chordify Basic tier, and an "8M monthly" Chordify figure.

The field splits in three. Stage tools (OnSong, forScore, MobileSheets, SongbookPro, Setlist Helper, BandHelper, Music Stand) page PDFs or chords-over-lyrics text and reach tens of thousands to about a million users. Content platforms (UG, Chordify, MuseScore, Songsterr) sell convenience on top of a catalogue and reach tens of millions. Audio tools (Moises, Chord ai) derive bars from a recording and have grown fastest.

iReal Pro is the one product whose chart looks like PlayBook's: symbols in cells, four bars a row, one page a song, repeats and section letters. It has no lyrics, shapes, advertised pedal support or band sync; its moat is a community library and the `irealb://` link format. BandHelper is the one product with "one sound per song" through MIDI program changes and master-plus-personal charts. None of the products examined combines a bar grid with page mechanics, pedals, shapes and sync: that is PlayBook's opening, and also a warning that the market has not asked for it loudly.

The reviews of UG, Chordify, Moises and Chord ai share one complaint: features moved behind a paywall and surprise billing (https://trustpilot.com/review/www.ultimate-guitar.com?page=3, https://de.trustpilot.com/review/moises.ai). The stage tools' reviews are about sync, crashes and lost annotations instead.

## 9. The landscape: indie and open source

| Project | Licence or price | Stars or ratings | Last activity | Alive? | Has, that PlayBook lacks |
|---|---|---|---|---|---|
| ChordPro reference implementation (https://github.com/ChordPro/chordpro) | Artistic 2.0 | 530 | 6.101.0, 2026-04-21 | Yes | The format, grids, `{define}`, PDF |
| ChordSheetJS (https://github.com/martijnversluis/ChordSheetJS) | GPL-2.0 | 444 | v18.0.0, 2026-09-24; 9 open issues | Yes | ChordPro, UG and text parsing; GPL matters for closed source |
| ChordMark (https://chordmark.netlify.app/) | MIT | 93 | Active | Yes | Dots per beat, automatic bar lines; the only indie format with durations |
| Open Setlist (https://github.com/ParriauxMaxime/open-setlist) | MIT in the README, licence field empty in the API | 2 | Created 2026-02-19, pushed 2026-10-12 | Yes | React 19, Dexie; per-instrument parts; chord diagrams for guitar, piano, ukulele and bass; pedal; Rust MIDI companion; sync through GitHub or Google Drive with passphrase-encrypted invite links |
| Gigboy | Apache-2.0 | 21 | 1,061 commits since 2026-04-25 | Yes | React 18, Express and Postgres, self-hosted, Concert Mode |
| Chordly (https://chordly.co.uk) | GPL-3.0, Rails | 61 | v1.8.1 | Yes | Web, multi-user |
| igrek51 android-songbook (https://github.com/igrek51/android-songbook) | GPL | 40 | 1,661 commits since 2016 | Yes | Song Cast to other devices, pedal |
| JJazzLab (https://github.com/jjazzboss/JJazzLab) | LGPL | 602 | 5.2.1, active | Yes | Backing tracks from chord grids; "30,000+ users" vendor claim |
| OpenChord (https://github.com/artutra/OpenChord) | MIT | 164 | Pushed 2023-01-06, 25 open PRs | Dead | None |
| Chord Book | MIT | 89 | Pushed 2025-03-24; domain gone | Dead | None |
| SongBook Chordpro, LinkeSOFT (https://apps.apple.com/us/app/songbook-chordpro/id392888837) | $19.99 "one-time purchase" listed beside yearly and monthly in-app purchases | iOS 4.7 from 2.4K | 6.3.2 iOS, 7.2.3 Android; since 2011 | Yes | Chord libraries, pedal input, cloud sync; MIDI program changes claimed by a competitor's comparison, unverified |
| Set List Maker, Arlomedia | $19.99 | iOS 3.7 from 87 | Features frozen May 2024; bug fixes continue (an iOS 26 pedal fix in June 2026) | Being superseded by BandHelper; "wound down" is Band Central's wording, a competitor (https://www.bandcentral.com/blog/best-setlist-apps-for-gigging-musicians) | None |

Also seen on GitHub: Desbeers/Chord-Provider (140 stars, macOS ChordPro editor), chord-chart-studio (23), chordproject-editor (20), chordproject-parser (16), koedame/chordsketch, Impro-Visor (160). SessionCharts modelled beats and measures but its snap package dates from 2021-10-03. OpenSong's last release is 3.4.8 Beta from 2021 and does not run on macOS 26. OpenLP 3.1.7 (16 February 2025) is alive but is a projection tool. Two Show HN posts: Chord Chart Memo (Godot, Android, 150 points, 2024-10-04) and cord.land ($29 once, 28 points, 2025-08-03), whose Corduroy extension adds `|` bar lines to ChordPro.

Small paid apps examined on the stores: Songbookly ($17.99 a year, 4.6 from 109), Chord Collect ($39.99 a year for Premium), MySongbook ($9.99), Lyric Pad 3 (2.7 from 154), JotChord; and a crop of very new ones with between one and 34 ratings each: GigScroll Pro ($12.99), LivePrompter 2, GigNotes, Easy Set List ($4.99, $19.99 or $49.99), Strofa ($3.99 a month or $39.99 a year), SetBook ($11.95 a month), Cadence. Not fetched: Guitar Setlist Pro, SetList Pro Music, Setlister, Gig Songbook. Verification: all GitHub figures hold; the ChordMark description is a paraphrase of its documentation.

The ones with traction (inference from the table) charged from day one ($10 to $22 once, or $18 to $60 a year), took years, import everything, support stage hardware, have a band story and run on more than one platform. The dead ones share one unpaid maintainer, an aged technology bet (React Native 0.60, Xojo), browser-only storage with no export or sync, no band path and a neglected interface.

Open Setlist deserves a line: created eight months ago by one developer, it has PlayBook's React 19 and IndexedDB architecture plus per-instrument parts, pedals and sync, and two stars. The architecture is not the moat. Nothing in the table holds two keys per song, names a pedal patch or shows a bar grid on stage. The indie ceiling observed is tens of thousands of paying users, reached over a decade.

## 10. Formats, standards and hardware a mass-market app must support

Ranked by users unlocked.

1. **ChordPro, read and write, including the grid environment.** OnSong, SongbookPro, MobileSheets, Setlist Helper, BandHelper, Planning Center and SongSelect ("ChordPro (Editable)", added 26 August 2025 on the Premium plan) all speak it (https://www.chordpro.org/chordpro/chordpro-cheat-sheet/, https://www.chordpro.org/chordpro/directives-env_grid/). The grid already expresses PlayBook's bars: `|`, `||`, `|:`, `:|`, `|1`, `:|2`, `.` for an empty beat, `/` for a chord repeat, `%` and `%%` for repeated bars, `shape="1+4x4+1"` for bars per row; `{define}` carries fingerings. ChordPro's "relaxed" mode relaxes only the file extension check, not the syntax. ChordSheetJS is GPL-2.0, so a closed-source product needs its own parser.
2. **PDF out, and PDF in as an attachment.** forScore and Music Stand are PDF-only; the minimum viable import for a band is "attach the PDF and page it with a pedal".
3. **Plain chords-over-lyrics paste.** A line is a chord line if every token parses as a chord (https://onsongapp.com/docs/features/formats/onsong/); Tabdown documents UG's `[Verse]` and `[ch]` markup (https://github.com/ultimate-guitar/Tabdown, 88 stars, 2017, BSD-3).
4. **OnSong files** (`.onsong`, `.chopro`, `.cho`, `.crd`, `.pro`, `.cpm`), imported by SongbookPro, BandHelper and Set Genie; OnSong exports `.chopro` and accepts chord modifiers including `man` and the ♯ and ♭ signs.
5. **iReal Pro `irealb://` links**: 16 cells a system, 12 systems, symbols for bar lines, repeats, endings, segno, coda and N.C., scrambled in 50-character blocks after the prefix `1r34LbKcu7` (https://www.irealpro.com/ireal-pro-file-format). The only widely used format that models bars.
6. **A shareable URL per song and set**, as iReal Pro and Open Setlist do.
7. **Planning Center and SongSelect** for the church channel.
8. **OpenLyrics** for projection (OpenLP).
9. **MusicXML `<harmony>` export** (33 chord kinds, `<frame>` for fingerings); MEI is not needed.
10. **Nashville Number System rendering**: one number per bar, underlines for split bars, a diamond for a hold, `<` and `>` for pushes, `6-` for minor (https://nashvillenumbersystem.com/). The system dates from Neal Matthews Jr. in the late 1950s and Charlie McCoy in the early 1960s.

Hardware. Bluetooth page-turners (AirTurn, PageFlip, iRig BlueTurn, Donner, Coda, JOYO) act as keyboards and send ArrowUp and ArrowDown, ArrowLeft and ArrowRight, PageUp and PageDown, Space or Enter depending on a mode switch; the "Up and Down by default" statement comes from OnSong's pedal-mode page, not from AirTurn's own FAQ (https://www.airturn.com/, https://onsongapp.com/docs/features/foot-pedals/). A PageFlip pedal costs about $149 (https://soundbrenner.com/blog/top-5-best-bluetooth-page-turners-for-musicians). `use-pedal-keys.ts` handles all four arrows and PageUp and PageDown; it should also take Space and Enter and offer a pedal-test screen, since pairing is the commonest support request in every pedal thread.

iOS Safari is the constraint. WebKit 149054 (Bluetooth HID keys in Safari) was fixed in iOS 13. 290779, titled for Flic buttons, a regression from iOS 16.5.1 to 18.2.1, is still NEW with a last comment on 26 November 2025; 301563 (dual-HID pedals such as Coda STOMP Mini and JOYO JSP-01 fire no `keydown`, which its reporter dates to iOS 18.4 and 18.5) was closed as a duplicate of it on 28 October 2025 (https://bugs.webkit.org/show_bug.cgi?id=290779, https://bugs.webkit.org/show_bug.cgi?id=301563). iOS 26.4 (24 March 2026) fixed a separate AirTurn BT200 bug. Whether a home-screen PWA receives these keys is inferred, not tested. Web MIDI and WebHID are absent from Safari and iOS Safari through 27.x (https://caniuse.com/midi), so a GX-10 program change from the PWA is impossible.

## 11. What musicians say they need

Reddit was unreachable; the evidence is from MusicPlayer, Fretboard, TalkBass, DjangoBooks, UMGF, Seymour Duncan, Cantabile and JustinGuitar forums, Trustpilot and store reviews. Ranked by frequency.

1. **Hands-free page turns.** Every stage thread; a PageFlip pedal costs about $149 (section 10).
2. **Sync and sharing, with a clear answer to who pays.** OnSong called "an island of data" (https://umgf.com/viewtopic.php?p=2847000); Setlist Helper sync failures in reviews; BandHelper praised for distributing sets. BandHelper charges $40 to $80 a year for a band of 2 to 5, so "cheaper than BandHelper" is no argument; "simpler" is.
3. **One-off price or a usable free tier.** OnSong's 2024 relaunch angered lifetime buyers; UK UG prices rose from £19.99 to £29.99 to £39.99 in early 2025 (https://community.justinguitar.com/t/ultimate-guitar-price-increase/386865); UG's Trustpilot is 3.1 from 2,002 reviews, many about charges after cancellation (https://trustpilot.com/review/www.ultimate-guitar.com). One poster called it "scammy"; that is one poster.
4. **Offline reliability.** Music Stand caches ten plans and still draws reviews of pedals failing near service time; an OnSong lifetime-licence buyer reported crashes on stage on 26 December 2023 (https://www.trustpilot.com/review/onsongapp.com, 2.2 from 9 reviews, unclaimed profile).
5. **Never lose data or annotations.** OnSong Trustpilot, 15 November 2025, disappearing annotations (same page); Music Stand reviews of missing annotations.
6. **Readable in the dark.** Chordify's "spotlight" complaint; OnSong's Low Light Mode; UG users asking for a gig dark mode.
7. **Import from the binder** (PDF, Word, JPEG, ChordPro, UG). Word sheets mean "hours of manual formatting fixes".
8. **Transpose, capo, Nashville numbers**, per device. Worship players asked for numbers; pop and rock players did not.
9. **Keeping the place**: bars, autoscroll that does not drift, "song 3 of 12". A TalkBass bassist prefers iReal's chord-per-bar to OnSong, which "suits singers" (https://www.talkbass.com/threads/ipad-for-chords-notes-lyrics-a-simple-way-or-app.1350232/).
10. **Lyrics or chords only, per player.** Chords-only loses singers; lyrics need licences (LyricFind represents about 4,000 publishers, https://www.hypebot.com/echonest-adds-lyricfind-to-app-platform/).
11. Annotations. 12. Backing tracks and click (Prime about 105K installs, https://appgoblin.info/apps/664688175; MultiTracks Playback about 247K, https://appgoblin.info/apps/751755884; both tracker estimates). 13. Simplicity and Android (BandHelper's "steep learning curve").

A counter-view appears in every guitar forum: players who think a tablet looks bad on stage ("nose buried in a tablet", Seymour Duncan forum). Any stage app sells to the half of the room that disagrees.

### Market size

- US: 170,400 musician and singer jobs in 2025, 48 percent self-employed, 0 percent projected growth, median $47.80 an hour (https://www.bls.gov/ooh/entertainment-and-sports/musicians-and-singers.htm).
- UK: 220,000 full-time-equivalent music jobs and 157,800 creators (UK Music, This Is Music 2025, and its 8 January 2026 employment release, https://www.ukmusic.org/news/employment-across-the-music-industry-higher-than-ever-says-uk-music-report/); Musicians' Union about 33,000 to 36,000 members (https://musiciansunion.org.uk/); the Musicians' Census (about 6,000 respondents) found an average income of £20,700 and 43 percent under £14,000 (https://www.musicianscensus.co.uk/).
- Function bands: directory counts only. Last Minute Musicians lists 1,346 wedding and 1,106 covers bands (https://www.lastminutemusicians.com/); Alive Network 693 wedding and 422 cover bands (https://www.alivenetwork.com/bandsearch.asp?style=Wedding+Bands); GigSalad 110,000 acts in all categories (https://www.gigsalad.com/). Inference: low hundreds of thousands of gigging band musicians in the US and UK; unverified.
- Worship: 356,642 US congregations in the 2020 US Religion Census (via https://www.thearda.com/us-religion/sources-for-religious-congregations-membership-data); Lifeway found 52 percent of Protestant churches use a praise team (https://research.lifeway.com/), but the 46 percent "praise band" figure was not found, so the derived 0.8 to 1.3 million US worship instrumentalists is unverified. CCLI "250,000 churches" comes from an undated vendor blog (https://worshiphousemedia.com/church-media-blog/?p=13385); Planning Center reports 78,000 active churches (https://www.planningcenter.com/about).
- Guitar learners: Fender and YouGov estimated 16 million US learners in 2019 to 2021, 7 percent of 13 to 64-year-olds, in a vendor-commissioned survey (https://www.prnewswire.com/news-releases/16-million-americans-learned-to-play-guitar-in-the-last-two-years-why-and-who-are-they-301394808.html); YouGov UK finds 8 percent can play guitar (https://yougov.co.uk/). No credible worldwide figure.

Scale, self-reported unless marked: UG 30M MAU; Yousician 20M monthly users (April 2021); Chordify 10.1M Play installs (tracker); Moises 60M users; OnSong about 350K installs (tracker); BandHelper 69K Play installs (tracker); Setlist Helper about 2,300 Play ratings (truncated page). The stage-chart niche has never produced a product with millions of users.

Monetisation: catalogue owners subscribe their users; tools charge once; audio apps sell processing minutes; church apps charge the church.

Three routes (needs report, section 5): **A**, the church channel, where the incumbents are Music Stand (weak, captive) and WorshipTools (free for teams of ten or fewer, 4.8 from 1.6K App Store ratings, https://apps.apple.com/us/app/id1511797596); **B**, a free shared-setlist utility that monetises the band, not the player; **C**, a community library of bar charts with import from everything and one indexable page per song, the only route whose ceiling is in the millions and the only one that needs legal advice on chord copyright. Suggested order: B, then A; C only with funding and counsel.

## 12. Chart layout patterns worth adopting

Ranked; each names the product that proves it.

1. **One screen per song; narrow the bars before adding rows.** iReal Pro fits a tune into 12 systems of 16 cells (https://www.irealpro.com/); Real Book lead sheets do the same on paper.
2. **A power of two bars per row, equal widths, from the available width**: four in portrait, eight in landscape. Soundslice described this in one 2015 post (https://www.soundslice.com/blog/21/new-chord-chart-view-and-more/); its current help pages do not restate it. The opposite of PlayBook's `max-content` grids.
3. **Sections start a new row with a double bar line and a rehearsal letter; pad short sections.** iReal Pro's chart-conventions forum thread (thread 194 at https://forums.irealpro.com/, running since 2009; 194 is the thread's ID, not a post count).
4. **Chord at the left bar line; even division for two chords; a diamond for a hold, an arrow for a push.** iReal Pro and the Nashville system.
5. **Repeats only to show form; "x3" as text; drop identical endings; write out a repeat that straddles a line.** iReal Pro. PlayBook's `(xN)` already does the text part.
6. **Highlight the current bar, with a Hidden option.** iReal Pro's Yellow, Red, Light, Dark and Hidden (names read from a screenshot caption); Chordify's black square; Chord ai's yellow cursor; UG's red line; Soundslice's playhead styles (https://www.soundslice.com/help/en/player/advanced/292/playhead-style-color/). The owner has said he does not want a "you are here" marker; this stays on the list as the field's answer, not as a recommendation.
7. **Section highlight styles for pedal or tap, scrolled to mid-screen.** OnSong's None, Bar, Page and Section (https://onsongapp.com/docs/); OnSong's autoscroll delay is stepped and its chord size runs 6 to 30 pt with a 14 pt default.
8. **Per-device temporary transposition with one-tap return, and a Number view.** Music Stand's "Only you will see" (https://www.planningcenter.com/music-stand).
9. **Size for a stand at 70 cm.** ISO 9241 is reported to recommend a character height of 20 to 22 arc-minutes; the source is a single W3C mailing-list summary of a paywalled standard (Christoph Päper, 18 June 2020) and is unverified. At 700 mm that is a 4.1 to 4.5 mm cap height, about 21 to 24 CSS px on an iPad, so a 30 to 34 px chord font with a floor near 24 px. WCAG large text is 18 pt, or 14 pt bold, at 3:1, otherwise 4.5:1 (https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html). Change size in small steps: the "size jumps too large" complaint is a reader comment (Steve, 19 December 2025) under Guitar Chalk's UG Pro review (https://www.guitarchalk.com/ultimate-guitar-pro-review/, review dated 16 April 2026, quoting $25 a month or $99 a year).
10. **Half-page advance snapped to rows, remembered per song.** forScore (release notes 14.4.1 and 15.2, https://forscore.co/kb/), MobileSheets; Music Stand offered a half-page option in 2018 and whether it survives was not confirmed.
11. **Landscape as two pages or eight bars, from the aspect ratio.** forScore's two-up.
12. **Pedal and keyboard mapping with saved actions**, plus a test screen. SongbookPro, Music Stand, MobileSheets.
13. **A dense-bar fallback**: a Small size or a longer bar, never a wrapped bar. iReal Pro.
14. **Per-section styling as a preference**, not a chart property. OnSong, SongbookPro.
15. **Dark by default, named themes, 4.5:1.** Music Stand; iReal Pro's Original, Focus, Calm and Quiet.
16. **A written form line above the chart.** No product shows one. Unproven, and PlayBook's own.

None of the apps the display report examined combines a bar grid with stage page mechanics. Whether millions want a bar-grid stage chart is unanswered by the market.

## 13. What "an app used by millions" would take

### Keep, drop, rebuild

Keep: the bar grammar in `music/bars.ts` and its tests; the overlay edit model, versions and snapshots; two keys per song; the service-worker discipline; fit-to-screen, reworked for equal bars; shapes per song.

Drop: the compiled songs as the data source; the title as identity; the single storage record for all setlists; `youtube.js` and `music-ai.js`; the Chordonomicon and lyric data; the legacy root files; 1,140 lines of dead components; `user-scalable=no`; `window.prompt` and `window.confirm`.

Rebuild: identity (stable IDs for songs, charts, sets, users and bands); songs loaded from storage; a smaller editor; one grid per song; the top bar and menu; a pipeline where tests gate deploys, with a linter and a WebKit run.

### What every route needs first (inference from sections 8 to 12)

1. ChordPro import and export with grids, so a chart can leave and arrive.
2. Accounts and local-first sync (Replicache, PowerSync, ElectricSQL, or Yjs or Automerge over Supabase, Firebase or Cloudflare). Sync is the second need and the first complaint in the field; local-first keeps the offline guarantee.
3. A native shell (Capacitor) for the App Store and Play: pedals on iOS Safari depend on WebKit 290779, Web MIDI is absent, and discovery happens in the stores. The PWA remains the web entry.
4. PDF attachment with pedal paging.
5. Telemetry with consent, crash reporting, GDPR terms. None exist today.
6. A pedal test screen, Space and Enter, and the section 5 layout changes.
7. A rights answer for the 21 shipped charts before any second user sees them (section 14, question 1).

### Three options

The team sizes and timelines below are the author's estimates, not figures from any source.

**B first: a free shared-setlist utility for bands.** Free for the player; the band pays for sync, versions and shared sets (SongbookPro's $4 per user per year and BandHelper's $40 to $80 a band set the ceiling). Routes to users: the owner's network, function-band directories and groups, ChordPro import so switching is cheap. Model: one price per band per year, no paywall on the chart itself. Team: two engineers (web and data, native and sync) plus the owner as product and musician; 9 to 12 months to a credible 1.0. Ceiling: tens of thousands of bands. Trade-off: honest, fundable from revenue, small.

**A: the church channel.** Planning Center and SongSelect integrations, a Number view, per-device transposition, leader page turns, sold to the worship leader. Market: 78,000 Planning Center churches, "250,000" CCLI churches (vendor blog); the instrumentalist count is unverified. Incumbents: Music Stand (3.5 stars, captive) and WorshipTools (free for small teams, 4.8 stars). Team: the same two plus someone who knows the channel; 12 months. Trade-off: the biggest organised market and the most crowded; the bar grid matters less because worship charts arrive as publisher PDFs.

**C: a community library of bar charts.** One editable page per song, imported from ChordPro, iReal Pro links, UG paste and PDF, indexable, with the stage app as its client. The only route with a ceiling in the millions, because it copies the UG and MuseScore pattern of content the company did not write. Trade-offs: chord progressions are a legal grey area and lyrics are out without licences; UG's rivals MXtabs and Taborama closed in 2004 and 2005 and UG signed with the Harry Fox Agency on 10 April 2010 (https://en.wikipedia.org/wiki/Ultimate_Guitar), so "licensing was needed to survive" is an inference from that history; moderation needs staff; traffic takes years. Team: four to six people and funding; 18 to 24 months. Not a solo project.

Sequence: B for a year; A second; C only if the first two fund it and the owner wants a content business rather than a tool.

## 14. Open questions for the owner

1. What are the rights on the 21 shipped charts? They derive from a purchased songbook and from recordings. Fine for the band's own use; a second user changes the question. This needs a real opinion, not this document's.
2. Is the goal a tool for working bands (B), a church product (A) or a content business (C)? They need different teams and legal advice.
3. Which chords are still wrong, song by song? Until the 21 charts are trusted nothing else is credible on stage.
4. Should the app ever show lyrics? Yes means licensing from day one; no means singers are out of the market.
5. Sync is paused "until the saved charts are cleaned". What is the clean state, and can a one-time merge of the browser copy and the home-screen copy be defined?
6. GX-10 patch changes need a native wrapper. Is the App Store (Capacitor) acceptable, or is the PWA a hard constraint?
7. Does Android ship in 1.0? The band is on iPad; the market's cheapest tablets are Android.
8. Chordonomicon is CC BY-NC and the droplet holds four lyric-bearing files. Delete, or keep offline for research only?
9. The verse-shape question and the lower keys marked TBC are still open; who decides, and when?
10. Is the owner willing to open the source? It decides whether ChordSheetJS can be used and whether the indie community can contribute.
11. Who besides the owner has used the app on a gig? A second band's feedback would reorder this list.

## 15. What was checked and what was not

Checked: every code claim in sections 2 to 7 against the repository at `c1b2a91` (file paths, line counts, counts of songs, presets, durations, forms, shape sources, notes, lower keys and cues, test counts, pedal key sets, store names, the copy-name strings, the setlist prompts, the `role=` count); the live site at three Chromium viewports; DNS and TCP for the server; the GitHub figures in section 9; and the store prices and ratings that carry a URL, each fetched directly on 2026-10-13. The critic pass found eighteen errors in the first draft's app facts and about twenty under-sourced market claims; all are corrected or labelled above. The critic itself was wrong three times (it called the OnSong on-stage crash, the Alive Network counts and the WorshipTools rating unsourced; each has a URL in the needs report and above).

Not checked, and how it limits the document: the visual review ran in Chromium emulation at 820 by 1180, 1180 by 820 and 390 by 844, not on an iPad or in Safari, so font rendering, scrolling feel and pedal behaviour are untested; the editor was only looked at, never used to save; bundle sizes come from a local build; the server was probed by DNS and TCP only, never logged into; no app in sections 8 or 9 was installed, so every "has pedals" or "has sync" claim is from vendor pages and reviews; all Google Play figures are AppGoblin tracker estimates because Play listings were truncated and AppBrain refused; Reddit, chordify.net, chordify.pr.co, worshipleader.com, justinguitar.com, ccli.com, cnbc, nytimes, theverge and musically (429) could not be fetched; the verification agents had no web-search budget left and worked by direct fetch only, so a claim they could not reach is labelled unverified rather than refuted; the two WebKit bugs were read, not reproduced; no lyric content in `server/data` was opened.

## 16. Sources

### The app (sections 2 to 7)

Repository `/Users/krys/Documents/coding/cheetsheetForGuitarPlaying` at `c1b2a91` (https://github.com/yanlukan/gm-setlist.git); live site https://yanlukan.github.io/gm-setlist/. Files cited by path.

### Big products (section 8)

https://onsongapp.com/pricing/, https://apps.apple.com/us/app/onsong-2026/id1330350343, https://appgoblin.info/apps/1330350343, https://umgf.com/viewtopic.php?p=2847000, https://forscore.co/kb/how-to-buy/, https://forscore.co/year-end-review/, https://apps.apple.com/us/app/forscore/id363738376, https://apps.apple.com/us/app/mobilesheets/id1620569987, https://appgoblin.info/apps/com.zubersoft.mobilesheetspro, https://apps.apple.com/us/app/ireal-pro/id409035833, https://www.irealpro.com/, https://appgoblin.info/apps/com.massimobiolcati.irealb, https://appgoblin.info/apps/298206806, https://www.mu.se/ultimate-guitar, https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853, https://en.wikipedia.org/wiki/Ultimate_Guitar, https://apps.apple.com/us/app/chordify-songs-chords-tuner/id1073624757, https://appgoblin.info/apps/net.chordify.chordify, https://www.ismir2015.uma.es/LBD/LBD42.pdf, https://songbook-pro.com/pricing, https://appgoblin.info/apps/com.songbookpro.songbookpro, https://www.setlisthelper.com/, https://apps.apple.com/us/app/setlist-helper/id939098002, https://www.bandhelper.com/main/pricing.html, https://www.bandhelper.com/main/features.html, https://www.planningcenter.com/music-stand, https://www.planningcenter.com/about, https://www.soundslice.com/plans/, https://www.musicbusinessworldwide.com/music-ai-raises-40m-in-series-a-round-as-its-moises-platform-hits-50m-users/, https://www.recordoftheday.com/news-and-press/moises-earns-dual-honors-named-apples-ipad-app-of-the-year-and-design-awards-finalist, https://apps.apple.com/us/app/chord-ai-play-any-song/id1446177109, https://techcrunch.com/2021/04/28/yousician-series-b/, https://mu.se/about, https://songcharter.app/compare, https://trustpilot.com/review/www.ultimate-guitar.com?page=3, https://de.trustpilot.com/review/moises.ai, https://www.talkbass.com/threads/ipad-for-chords-notes-lyrics-a-simple-way-or-app.1350232/

### Indie and open source (section 9)

https://github.com/ChordPro/chordpro, https://github.com/martijnversluis/ChordSheetJS, https://chordmark.netlify.app/, https://github.com/ParriauxMaxime/open-setlist, https://chordly.co.uk, https://github.com/igrek51/android-songbook, https://github.com/artutra/OpenChord, https://github.com/jjazzboss/JJazzLab, https://github.com/Desbeers/Chord-Provider, https://apps.apple.com/us/app/songbook-chordpro/id392888837, https://www.bandcentral.com/blog/best-setlist-apps-for-gigging-musicians, https://news.ycombinator.com/ (Show HN: Chord Chart Memo, 2024-10-04; cord.land, 2025-08-03)

### Formats and hardware (section 10)

https://www.chordpro.org/chordpro/chordpro-cheat-sheet/, https://www.chordpro.org/chordpro/directives-env_grid/, https://onsongapp.com/docs/features/formats/onsong/, https://onsongapp.com/docs/features/foot-pedals/, https://www.irealpro.com/ireal-pro-file-format, https://github.com/ultimate-guitar/Tabdown, https://openlyrics.org/, https://www.w3.org/2021/06/musicxml40/, https://nashvillenumbersystem.com/, https://www.airturn.com/, https://soundbrenner.com/blog/top-5-best-bluetooth-page-turners-for-musicians, https://www.thomann.de/gb/ik_multimedia_irig_blueturn.htm (iRig BlueTurn, not PageFlip), https://bugs.webkit.org/show_bug.cgi?id=149054, https://bugs.webkit.org/show_bug.cgi?id=290779, https://bugs.webkit.org/show_bug.cgi?id=301563, https://caniuse.com/midi, https://songselect.ccli.com/

### Needs and market (section 11)

https://www.bls.gov/ooh/entertainment-and-sports/musicians-and-singers.htm, https://www.ukmusic.org/news/employment-across-the-music-industry-higher-than-ever-says-uk-music-report/, https://www.ukmusic.org/research-reports/this-is-music-2025/, https://www.musicianscensus.co.uk/, https://musiciansunion.org.uk/, https://www.lastminutemusicians.com/, https://www.alivenetwork.com/bandsearch.asp?style=Wedding+Bands, https://www.gigsalad.com/, https://www.thearda.com/us-religion/sources-for-religious-congregations-membership-data, https://research.lifeway.com/, https://worshiphousemedia.com/church-media-blog/?p=13385, https://apps.apple.com/us/app/id1511797596, https://www.prnewswire.com/news-releases/16-million-americans-learned-to-play-guitar-in-the-last-two-years-why-and-who-are-they-301394808.html, https://yougov.co.uk/, https://community.justinguitar.com/t/ultimate-guitar-price-increase/386865, https://trustpilot.com/review/www.ultimate-guitar.com, https://www.trustpilot.com/review/onsongapp.com, https://www.hypebot.com/echonest-adds-lyricfind-to-app-platform/, https://appgoblin.info/apps/664688175, https://appgoblin.info/apps/751755884

### Display and layout (section 12)

https://www.irealpro.com/, https://forums.irealpro.com/, https://onsongapp.com/docs/, https://www.planningcenter.com/music-stand, https://www.soundslice.com/blog/21/new-chord-chart-view-and-more/, https://www.soundslice.com/help/en/player/advanced/292/playhead-style-color/, https://forscore.co/kb/, https://www.guitarchalk.com/ultimate-guitar-pro-review/, https://learnofchrist.com/resources/planning-center-music-stand, https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

Unreachable: Reddit, Google Play listings (truncated), AppBrain (403), chordify.net and chordify.pr.co (403 and 404), musescore.com/upgrade (403), moises.ai/pricing (login), ccli.com, worshipleader.com, justinguitar.com, cnbc, nytimes, theverge, musically (429).
