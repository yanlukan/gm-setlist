"""What the record plays on each beat of a lined-up bar: BTC's chord over the bass read.

BTC names no bass, so a beat's bass always comes from the CQT bass read. A beat's
confidence is the lower of BTC's and the bass read's, so a wrong bass is gated too;
when the bass read is unsure the chord is taken in root position at that low
confidence, so it cannot flag on its own.

When a sure bass is not a note of BTC's chord, the beat is read again: of the key's
own triads, those holding the bass as root or third (a slash chord's bass is its root
or third; a fifth in the bass is rare) are tried, and the best fit to the beat's
chroma wins if it fits about as well as BTC's chord. Faith's Pre-Chorus walk-down is
the case: BTC hears B over A#, the chroma fits B and F# alike, and in B the A# is the
third of F#, so the beat reads F#/A#. Otherwise the bass is a passing note under
BTC's chord (B/A#), which the bar verdict ignores. Whether a reading counts against
the chart is decided after, by second_opinion.py.
"""
import re

import numpy as np

from recording_check.audio import span
from recording_check.chords import LETTERS, NONE, SHARP_NAMES, Chord, parse, shift, tones
from recording_check.fit import chord_fit

BASS_FLOOR = 0.2    # bass read share of the band's energy that counts as no read at all
BASS_FULL = 0.5     # share that counts as a sure read
BASS_SURE = 0.5     # below this bass confidence the chord is taken in root position
BASS_PARTS = 3      # a beat's bass is read in this many parts
HOLD_PARTS = 2      # parts a note must top to count as held
UNHELD_CONFIDENCE = 0.25   # bass confidence when no note holds: cannot flag through the bass
REPICK_TOLERANCE = 0.1   # a key chord may fit this much worse than BTC's and still win
MAJOR_TRIADS = ((0, 'maj'), (2, 'min'), (4, 'min'), (5, 'maj'), (7, 'maj'), (9, 'min'), (11, 'dim'))
MINOR_TRIADS = ((0, 'min'), (2, 'dim'), (3, 'maj'), (5, 'min'), (7, 'min'), (7, 'maj'),
                (8, 'maj'), (10, 'maj'))   # natural minor plus the major V


def key_triads(key):
    """The key's own triads as Chords in root position; key is e.g. 'B', 'Bbm', 'C#m'."""
    match = re.match(r'^([A-G])([#b]?)(m?)$', key or '')
    if not match:
        return []
    letter, sign, minor = match.groups()
    tonic = (LETTERS[letter] + {'#': 1, 'b': -1}.get(sign, 0)) % 12
    return [Chord((tonic + d) % 12, kind, (tonic + d) % 12)
            for d, kind in (MINOR_TRIADS if minor else MAJOR_TRIADS)]


def _root_or_third(chord, bass):
    third = 4 if chord.kind == 'maj' else 3
    return bass in (chord.root, (chord.root + third) % 12)


def _btc_at(timeline, start, end):
    """BTC's chord and confidence with the most overlap of the span; gaps are no chord."""
    best, best_overlap, covered = None, 0.0, 0.0
    for entry in timeline:
        overlap = min(end, entry['time'] + entry['duration']) - max(start, entry['time'])
        if overlap <= 0:
            continue
        covered += overlap
        if overlap > best_overlap:
            best, best_overlap = entry, overlap
    if best is None or best_overlap < (end - start) - covered:
        return NONE, 0.0
    chord = parse(best['chord'])
    return (chord, float(best['confidence'])) if chord is not None else (NONE, 0.0)


def _confidence(share):
    return float(np.clip((share - BASS_FLOOR) / (BASS_FULL - BASS_FLOOR), 0, 1))


def bass_read(bass_frames, hop, start, end):
    """The beat's bass pitch class and its confidence (0 to 1).

    A note counts only when it holds through most of the beat: it must be the top bass
    note in at least HOLD_PARTS of the beat's BASS_PARTS parts. A short hit (a backbeat
    drum the CQT reads as a note) does not; with no note held, the bass is unsure.
    Its confidence is its share of the bass band over the parts it holds.
    """
    step = (end - start) / BASS_PARTS
    parts = [span(bass_frames, hop, start + i * step, start + (i + 1) * step) for i in range(BASS_PARTS)]
    tops = [int(np.argmax(p)) if p.sum() > 0 else None for p in parts]
    held = [pc for pc in set(tops) if pc is not None and tops.count(pc) >= HOLD_PARTS]
    if not held:
        energy = sum(parts)
        total = float(energy.sum())
        if total <= 0:
            return None, 0.0
        top = int(np.argmax(energy))
        return top, min(_confidence(float(energy[top]) / total), UNHELD_CONFIDENCE)
    note = held[0]
    energy = sum(p for p, t in zip(parts, tops) if t == note)
    return note, _confidence(float(energy[note]) / float(energy.sum()))


def beat_chord(analysis, start, end, key):
    """The record's chord on one beat and its confidence; key and chord at the record's pitch."""
    chord, chord_conf = _btc_at(analysis['chords'], start, end)
    if chord.kind == 'none':
        return NONE, chord_conf
    bass, bass_conf = bass_read(analysis['bass'], analysis['hop'], start, end)
    conf = min(chord_conf, bass_conf)
    if bass is None or bass_conf < BASS_SURE:
        return Chord(chord.root, chord.kind, chord.root, chord.sus), conf
    if bass in tones(chord):
        return Chord(chord.root, chord.kind, bass, chord.sus), conf
    chroma = span(analysis['chroma'], analysis['hop'], start, end)
    candidates = [c for c in key_triads(key) if _root_or_third(c, bass)]
    if candidates:
        best = max(candidates, key=lambda c: chord_fit(c, chroma))
        if chord_fit(best, chroma) >= chord_fit(chord, chroma) - REPICK_TOLERANCE:
            return Chord(best.root, best.kind, bass), conf
    return Chord(chord.root, chord.kind, bass, chord.sus), conf


def transpose_key(key, semitones):
    """A key name moved by semitones (sharp spelling; only its pitch matters here)."""
    match = re.match(r'^([A-G])([#b]?)(m?)$', key or '')
    if not match:
        return key
    letter, sign, minor = match.groups()
    tonic = (LETTERS[letter] + {'#': 1, 'b': -1}.get(sign, 0) + semitones) % 12
    return SHARP_NAMES[tonic] + minor


def bar_beats(analysis, start, end, beats_per_bar, key, semitones=0):
    """Per-beat (chord, confidence) for a bar of a chart in `key`, at the chart's pitch."""
    step = (end - start) / beats_per_bar
    record_key = transpose_key(key, semitones)
    out = []
    for i in range(beats_per_bar):
        chord, conf = beat_chord(analysis, start + i * step, start + (i + 1) * step, record_key)
        out.append((shift(chord, -semitones), round(conf, 3)))
    return out
