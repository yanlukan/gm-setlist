"""A song's bars, parts and evidence read off the recording alone, for a song with no chart.

Bars sit on the tracker's steady beats (align.steady_beats). Where bar 1 begins (the
bar phase) is the beat phase on which most of BTC's chord changes land: a change
counts for the downbeat it falls within a quarter beat of; ties take the earliest
phase. So a long intro or fade moves nothing: the phase follows the chords.

Each bar is read beat by beat (reading.bar_beats) and written by verdict.read_bar
with no chart: one chord when it holds the whole bar, else the beats' chords and
dots. Wholly silent bars before the first chord and after the last are not written;
a final partial bar is dropped.

Bars go into lines of LINE_BARS; each line is a part, and a line equal to an earlier
one is that part again. Parts are named Part 1, Part 2... in order of first playing,
and the song order is the playing order. Every bar ships as Unsure with the
record's reading alone: detector chords are never shipped as fact.
"""
import numpy as np

from recording_check.align import steady_beats
from recording_check.chords import parse, same
from recording_check.reading import bar_beats
from recording_check.verdict import read_bar

LINE_BARS = 4
PHASE_TOLERANCE = 0.25   # share of a beat a chord change may sit off a downbeat
GAP = 0.05               # seconds without a BTC chord that make the next chord a change
NO_CHORD = 'N.C.'


def _period(beats, bpm=None):
    if len(beats) > 1:
        return float(np.median(np.diff(beats)))
    return 60 / bpm if bpm else 0.5


def chord_changes(timeline) -> list:
    """Times BTC starts a new chord: its first chord, a different chord, or a chord after a gap."""
    out, previous, previous_end = [], None, None
    for entry in sorted(timeline, key=lambda e: e['time']):
        chord = parse(entry['chord'])
        gap = previous_end is None or entry['time'] - previous_end > GAP
        if gap or chord is None or previous is None or not same(chord, previous):
            out.append(float(entry['time']))
        previous, previous_end = chord, entry['time'] + entry['duration']
    return out


def _phase(beats, chord_times, beats_per_bar):
    """The beat phase (0 .. beats_per_bar-1) on which most chord changes land."""
    if len(beats) < 2:
        return 0
    beats = np.asarray(beats, dtype=float)
    tolerance = PHASE_TOLERANCE * _period(beats)
    counts = [0] * beats_per_bar
    for time in chord_times:
        nearest = int(np.argmin(np.abs(beats - time)))
        if abs(beats[nearest] - time) <= tolerance:
            counts[nearest % beats_per_bar] += 1
    return counts.index(max(counts))   # ties: the earliest phase


def bar_starts(beats: list, chord_times: list, beats_per_bar: int) -> list:
    """Downbeat times: every beats_per_bar-th beat from the phase most chord changes land on."""
    return list(beats[_phase(beats, chord_times, beats_per_bar)::beats_per_bar])


def _bar_text(record_beats, key):
    tokens = [NO_CHORD if t == 'N' else t for t in read_bar([], record_beats, key).split()]
    return tokens[0] if all(t == '.' for t in tokens[1:]) else ' '.join(tokens)


def record_bars(analysis, key, beats_per_bar=4) -> list:
    """The record's bars in order: [{'start', 'end', 'text', 'beats'}], beats as bar_beats gives them."""
    beats = steady_beats(analysis['beats'], _period(analysis['beats'], analysis.get('bpm')))
    first = _phase(beats, chord_changes(analysis['chords']), beats_per_bar)
    bars = []
    for k in range(first, len(beats) - beats_per_bar, beats_per_bar):
        start, end = beats[k], beats[k + beats_per_bar]
        read = bar_beats(analysis, start, end, beats_per_bar, key)
        bars.append({'start': start, 'end': end, 'text': _bar_text(read, key), 'beats': read})
    while bars and bars[0]['text'] == NO_CHORD:
        bars.pop(0)
    while bars and bars[-1]['text'] == NO_CHORD:
        bars.pop()
    return bars


def _line(texts):
    return '|  ' + '  |  '.join('  '.join(text.split()) for text in texts) + '  |'


def parts(texts: list, line_bars=LINE_BARS) -> tuple:
    """(sections [{'name', 'chords'}], form [names]): one part per line of line_bars bars,
    a line equal to an earlier one reusing its part."""
    sections, form, by_line = [], [], {}
    for i in range(0, len(texts), line_bars):
        line = _line(texts[i:i + line_bars])
        if line not in by_line:
            by_line[line] = f'Part {len(sections) + 1}'
            sections.append({'name': by_line[line], 'chords': line})
        form.append(by_line[line])
    return sections, form


def _section_bars(chords):
    """A section's bar texts, one space apart, numbered from 0 across its lines."""
    out = []
    for line in chords.split('\n'):
        out += [' '.join(cell.split()) for cell in line.split('|') if cell.strip()]
    return out


def unsure_evidence(sections) -> dict:
    """Every bar Unsure, with the record's reading as its only reading."""
    return {section['name']: {'bars': [
        {'bar': i, 'chords': text, 'from': 'Unsure', 'readings': [{'from': 'Record', 'chords': text}]}
        for i, text in enumerate(_section_bars(section['chords']))]} for section in sections}
