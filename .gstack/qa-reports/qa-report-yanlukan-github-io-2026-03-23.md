# QA Report: GM Setlist

**URL:** https://yanlukan.github.io/gm-setlist/
**Date:** 2026-03-23
**Tier:** Standard
**Duration:** ~10 min
**Pages visited:** 5 songs + edit mode + chord picker + section picker
**Framework:** Vanilla HTML/CSS/JS (single-file PWA)
**Console errors:** 0

---

## Health Score: 72 / 100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | 100 | 15% | 15.0 |
| Links | 100 | 10% | 10.0 |
| Visual | 60 | 10% | 6.0 |
| Functional | 70 | 20% | 14.0 |
| UX | 65 | 15% | 9.75 |
| Performance | 100 | 10% | 10.0 |
| Content | 70 | 5% | 3.5 |
| Accessibility | 55 | 15% | 8.25 |

---

## Top 3 Things to Fix

1. **ISSUE-001** Transpose uses sharps instead of flats for flat keys (D→D# should be D→Eb)
2. **ISSUE-002** iPad portrait: content doesn't fill full width, wasted space on right
3. **ISSUE-003** Section labels truncated on narrow viewports ("PRE-CHORUS" overflows)

---

## Issues

### ISSUE-001: Transpose produces sharp keys instead of flat equivalents
**Severity:** High | **Category:** Functional
**Screenshot:** screenshots/transpose-up.png

**Repro:**
1. Go to "I'm Your Man" (Key: D)
2. Tap + to transpose up 1 semitone
3. All chords show as sharps: D#, G#, A#, C#

**Expected:** Should show Eb, Ab, Bb, Db — standard flat key notation. No musician writes in D#.

**Root cause:** `shouldUseFlats()` checks `FLAT_KEYS` against the sharp spelling (D#) but Eb is the one in FLAT_KEYS. Need to check both sharp and flat spellings.

---

### ISSUE-002: iPad portrait layout wastes right half of screen
**Severity:** Medium | **Category:** Visual
**Screenshot:** screenshots/ipad-portrait.png

**Repro:**
1. Open on iPad Air 11" in portrait (820x1180)
2. Content (title, chords, badges) clusters on left ~60%
3. Right side is empty dark space

**Expected:** Content should fill the full width or at least center properly.

---

### ISSUE-003: Section label "PRE-CHORUS" overflows on narrow/iPad viewports
**Severity:** Medium | **Category:** Visual
**Screenshot:** screenshots/somebody-ipad.png

**Repro:**
1. View "Somebody to Love" or any song with Pre-Chorus
2. On iPad, "PRE-CHORUS" label text is long and pushes into chord area

**Expected:** Label should truncate or abbreviate (e.g. "PRE-CH") on narrow screens.

---

### ISSUE-004: Transpose +/- buttons work during edit mode
**Severity:** Medium | **Category:** Functional

**Repro:**
1. Tap Edit
2. Tap + or − to transpose
3. Chords change permanently while in edit mode

**Expected:** Transpose should be disabled during edit mode, or at minimum show a warning. User may accidentally change the key while trying to edit chords.

---

### ISSUE-005: No visual feedback on which song section names are tappable/editable
**Severity:** Low | **Category:** UX

**Repro:**
1. Enter edit mode
2. Section labels (VERSE, CHORUS etc) are editable but look identical to non-edit mode

**Expected:** Editable labels should have a subtle visual indicator (background, border) matching the chord field styling.

---

### ISSUE-006: Bottom bar song buttons text truncated for long names
**Severity:** Low | **Category:** Visual

**Repro:**
1. View bottom bar on any viewport
2. "Wake Me Up Before You Go-Go" and other long names are truncated

**Expected:** Acceptable trade-off for the scrollable bar, but could benefit from shorter display names or wider buttons.

---

## Console Health
No errors detected across all pages and interactions tested.

---

## Summary
- Total issues found: 6
- Critical: 0
- High: 1
- Medium: 3
- Low: 2
