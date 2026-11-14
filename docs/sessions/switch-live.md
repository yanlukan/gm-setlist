# Switching the live app to the rework (rework step 7)

## Goal
Make the rework the live PlayBook at https://yanlukan.github.io/gm-setlist/ without losing anything saved on the iPad: edited charts, saved picks, setlists, own songs, own shapes and settings, in BOTH copies (the home-screen app and Safari keep separate data). The player backs up both copies first; the push waits for their OK. Version 5.0.0.

## Your backup steps (on the iPad, before the push)

Do this twice: once in the home-screen PlayBook, once in Safari at yanlukan.github.io/gm-setlist. Each copy has its own charts.

1. Open the **home-screen** PlayBook. If it shows Stage, switch to Practice (More is not on Stage).
2. Tap **More** in the bottom bar. Under "Setlists and backups" tap **Export a backup**.
3. In the share sheet tap **Save to Files**. Pick **On My iPad** (or iCloud Drive), make a new folder **PlayBook home-screen** and save there.
4. Open **Safari** at yanlukan.github.io/gm-setlist. Do steps 2 and 3 again, into a new folder **PlayBook Safari**.
5. In the Files app check both folders hold a file `playbook-backup-<date>.json` of more than 0 KB.
6. Tell me "backed up". I push; it is live about a minute later.
7. On each copy, on Practice: More → **Check for updates** (or close it and open it again). More should then say PlayBook v5.0.0.
8. Look at a song you edited. Your charts should all be there. Only if something is missing: More → **Import a backup** → the file from the **matching** folder (home-screen file into the home-screen app, Safari file into Safari). Importing replaces that copy's charts with the file's.

What a backup file does not hold (4.2.8 never put it in): Stage/Practice mode, simple chords, guitar, instrument, your place in each list, and "Earlier versions" of a song. These are not touched by the switch; they only matter if you ever import into an empty copy.

## Decisions
- **No backup fix for 4.2.8 is needed, so no separate branch.** 4.2.8 already has Export a backup / Import a backup (More → Setlists and backups). The storage code (`app/src/store/persistence.ts`) is byte-identical between main (4.2.8) and rework, so the rework reads 4.2.8's database and 4.2.8's backup files as they are.
- **Nothing to migrate.** Same origin and base (`/gm-setlist/`, vite.config.ts), same manifest scope and start_url (`./`), same service worker (`public/sw.js` unchanged), same IndexedDB `playbook` version 2 with the same five stores and the same keys (`songEdits` by title; `setlists/current`; `customSongs/all`; `settings`: theme, viewMode, simpleChords, guitar, instrument, selectedVoicings, ownShapes, places, `seeded:<id>`, `history:<title>`; `snapshots`). The 21 song titles, the gig and rehearsal lists are unchanged, so every saved edit still finds its song. The new field `SongEdits.heard` is optional; 4.2.8 records simply lack it.
- **Proof:** `app/src/tests/store/live-carryover.test.ts` with `fixtures/device-4.2.8.json` (a 4.2.8 device's database, store by store, made-up values) and `fixtures/backup-4.2.8.json`, which was written by **running main's own 4.2.8 `exportAllData`** on that device (scratch checkout of main at 7868c1a, test-only, not committed). Tests: address/scope/database pinned; the device opens with every chart, pick, setlist, own song, shape and setting; opening writes nothing over 4.2.8's data; the rework exports the identical backup; the 4.2.8 backup loads into an empty device and brings everything back; importing twice changes nothing; what the backup lacks starts at defaults.
- **Version 5.0.0** (not 4.14.0): the whole app changes for the player. Release notes `docs/release-notes/5.0.0.md`.
- **Switch = fast-forward.** origin/main = main = 7868c1a (4.2.8) and rework sits on top of it, so local main is fast-forwarded to the rework tip; no merge commit. Pages deploys on push to main (`.github/workflows/deploy.yml`: `npm ci`, `npm run build`, upload `dist`); the workflow does not run tests, so the full check runs here first.
- The 4.2.8 app tells an open copy about the new version itself ("PlayBook X is ready · Update" on Practice, More → Check for updates), from 4.1.1 on.

## Progress
- 2026-11-04: storage mapped, export checked, fixtures and tests written (7 pass), version 5.0.0, release notes.
- 2026-11-04: full check passed: 1200 tests, tsc, build, release check 360 pages, 0 problems. Local main fast-forwarded to the rework tip (5.0.0).

## Open questions
- None blocking. Not checked on the real iPad (no simulator here): the update on each copy and that both copies keep their charts. Step 8 of the backup steps covers it.

## What's left
- The player's backup (steps 1 to 5), then their OK.
- The push that goes live: `git push origin main` (a fast-forward of origin/main from 7868c1a to the rework tip). Then check https://yanlukan.github.io/gm-setlist/version.json says 5.0.0.
