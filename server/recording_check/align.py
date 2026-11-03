"""Line a chart's played bars up with a recording's beats.

The recording's beats are first brought to the chart's tempo and split into units of
half a chart beat (trackers often report double or half time). Each played bar then
takes 2 x beatsPerBar units, give or take one, and a dynamic programme finds the
cheapest run of bars through the units, matching each unit's chroma and bass with the
chord the chart plays there. Audio before the first bar and after the last is free,
so a free-time opening or a fade costs nothing. Shifts -1, 0 and +1 are all tried.
"""
from dataclasses import dataclass

import numpy as np

from recording_check.audio import span
from recording_check.chords import parse, shift as shift_chord
from recording_check.fit import chord_fit

SHIFTS = (0, 1, -1)    # ties go to the first
UNITS_PER_BEAT = 2
STRETCH = 1            # a bar may be this many units longer or shorter
STRETCH_COST = 0.5     # per unit off, in the same scale as one unit's mismatch
NO_CHORD_COST = 0.5
BEAT_TOLERANCE = 0.15  # a tracker beat this far (share of a beat) off the pulse is dropped
SNAP = 0.15           # log2 distance from double or half time still taken as it
MAX_GAP = 2.5          # beats without a fitting tracker beat before the pulse is carried on


@dataclass(frozen=True)
class Alignment:
    shift: int
    bars: list     # (start, end) in seconds, one per entry of chart['played']
    score: float   # 1 is a perfect match, 0 none


def chord_at(slots, fraction):
    """The chart chord sounding at a fraction of the bar, parsed (None if unreadable)."""
    current = None
    for slot in slots:
        if slot['start'] <= fraction + 1e-9:
            current = slot['chord']
    if current is None and slots:
        current = slots[0]['chord']
    return parse(current) if current is not None else None


def played_slots(chart):
    """The chart's slots for each entry of chart['played'], in order."""
    sections = {s['name']: s for s in chart['sections']}
    out = []
    for entry in chart['played']:
        bars = sections[entry['section']]['bars']
        out.append(next(b for b in bars if b['bar'] == entry['bar'])['slots'])
    return out


def steady_beats(beats, period):
    """The tracker's beats that keep its main pulse; where it loses the pulse (races,
    drags or drops out) the gap is filled with beats at that pulse instead."""
    beats = [float(b) for b in beats]
    if not beats:
        return beats
    out = [beats[0]]
    for beat in beats[1:]:
        gap = beat - out[-1]
        count = round(gap / period)
        if count >= 1 and abs(gap - count * period) <= BEAT_TOLERANCE * period:
            out += [out[-1] + gap * k / count for k in range(1, count + 1)]
        while beat - out[-1] > MAX_GAP * period:   # no fitting beat for a while
            out.append(out[-1] + period)
    return out


def unit_grid(beats, tracker_bpm, chart_bpm, duration):
    """Unit boundaries (seconds), half a chart beat apart, following the tracker's beats."""
    period = float(np.median(np.diff(beats))) if len(beats) > 1 else 60 / tracker_bpm
    beats = np.asarray(steady_beats(beats, period), dtype=float)
    ratio = UNITS_PER_BEAT * period / (60 / chart_bpm)    # units per tracker beat
    if abs(np.log2(ratio) - round(np.log2(ratio))) <= SNAP:
        ratio = 2.0 ** round(float(np.log2(ratio)))   # double or half time: keep the tracker's phase
    # else a 12/8 feel or the like: units at the chart's tempo, along the tracker's beats
    places = np.arange(0, len(beats) - 1 + 1e-9, 1 / ratio)
    grid = list(np.interp(places, np.arange(len(beats)), beats))
    step = float(np.median(np.diff(grid))) if len(grid) > 1 else 60 / chart_bpm / UNITS_PER_BEAT
    before = list(np.arange(grid[0] - step, -1e-9, -step))[::-1]
    after = list(np.arange(grid[-1] + step, duration + step, step))
    return np.array(before + grid + after)


def _unit_features(analysis, grid):
    hop = analysis['hop']
    chroma = np.array([span(analysis['chroma'], hop, a, b) for a, b in zip(grid, grid[1:])])
    bass = np.array([span(analysis['bass'], hop, a, b) for a, b in zip(grid, grid[1:])])
    return chroma, bass


def _unit_costs(chords, chroma, bass):
    """Cost of each distinct chart chord (rows) against each unit (columns)."""
    costs = np.full((len(chords), len(chroma)), NO_CHORD_COST)
    for i, chord in enumerate(chords):
        if chord is None or chord.kind == 'none':
            continue
        costs[i] = 1 - np.atleast_1d(chord_fit(chord, chroma, bass))
    return costs


def _bar_ids(slots_per_bar, beats_per_bar, semitones):
    """Per played bar, the chord id of each of its units; and the distinct chords."""
    chords, ids, out = [], {}, []
    for slots in slots_per_bar:
        row = []
        for unit in range(beats_per_bar * UNITS_PER_BEAT):
            chord = chord_at(slots, (unit // UNITS_PER_BEAT + 0.5) / beats_per_bar)
            chord = shift_chord(chord, semitones) if chord is not None else None
            if chord not in ids:
                ids[chord] = len(chords)
                chords.append(chord)
            row.append(ids[chord])
        out.append(row)
    return chords, out


def _bar_cost(costs, row, length, units):
    """Cost of a bar whose units are `row`, stretched to `length` units, at every start."""
    starts = units - length + 1
    if starts <= 0:
        return np.full(max(units, 1), np.inf)
    total = np.zeros(starts)
    for k in range(length):
        total += costs[row[k * len(row) // length], k:k + starts]
    return total * len(row) / length


def _best_path(costs, rows, units):
    """Dynamic programme over bars; returns (unit starts and ends per bar, total cost)."""
    nominal = len(rows[0])
    lengths = [nominal + d for d in range(-STRETCH, STRETCH + 1)]
    previous = np.zeros(units + 1)          # free start anywhere
    back = []
    for row in rows:
        current = np.full(units + 1, np.inf)
        chosen = np.zeros(units + 1, dtype=np.int16)
        for length in lengths:
            cost = _bar_cost(costs, row, length, units)
            if not np.isfinite(cost).any():
                continue
            ends = np.arange(length, length + len(cost))
            candidate = previous[ends - length] + cost + STRETCH_COST * abs(length - nominal)
            better = candidate < current[ends]
            current[ends[better]] = candidate[better]
            chosen[ends[better]] = length
        back.append(chosen)
        previous = current
    end = int(np.argmin(previous))
    total = float(previous[end])
    spans = []
    for chosen in reversed(back):
        length = int(chosen[end])
        spans.append((end - length, end))
        end -= length
    return spans[::-1], total


def align(chart: dict, analysis: dict) -> Alignment:
    """The best line-up of chart['played'] with the recording over shifts -1, 0, +1."""
    beats_per_bar = chart['beatsPerBar']
    slots = played_slots(chart)
    grid = unit_grid(analysis['beats'], analysis['bpm'], chart['bpm'],
                     analysis.get('duration', analysis['beats'][-1]))
    chroma, bass = _unit_features(analysis, grid)
    best = None
    for semitones in SHIFTS:
        chords, rows = _bar_ids(slots, beats_per_bar, semitones)
        costs = _unit_costs(chords, chroma, bass)
        spans, total = _best_path(costs, rows, len(chroma))
        score = 1 - total / (len(rows) * len(rows[0]))
        if best is None or score > best.score + 1e-9:
            bars = [(round(float(grid[a]), 3), round(float(grid[b]), 3)) for a, b in spans]
            best = Alignment(semitones, bars, round(score, 4))
    return best
