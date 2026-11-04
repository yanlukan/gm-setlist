"""A song's bars, parts and evidence read off the recording alone, for a song with no chart.

Bars sit on the tracker's steady beats (align.steady_beats), brought to the tempo
key.fold_bpm writes: a tracker under 70 bpm has each beat split in two, one at 140
or over counts two of its beats as one. Where bar 1 begins (the bar phase) is the
beat phase where the harmony changes most: each beat's chroma against the beat
before (1 - cosine), summed per phase; silent beats do not vote, ties take the
earliest phase. So a long intro or fade moves nothing: the phase follows the music.
Measured against 18 lined-up songs' charts, this rule found the phase stage 5's
line-up finds on 16; BTC's chord changes, the bass's changes, held bars and wider
chroma windows found 12 to 14 (task-3-report.md has the table).

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
from recording_check.audio import span
from recording_check.key import FASTEST, SLOWEST
from recording_check.reading import bar_beats
from recording_check.verdict import read_bar

LINE_BARS = 4
SILENT = 1e-6   # a beat's chroma at or below this length is silence: it votes for no phase
NO_CHORD = 'N.C.'


def _period(beats, bpm=None):
    if len(beats) > 1:
        return float(np.median(np.diff(beats)))
    return 60 / bpm if bpm else 0.5


def _beat_chroma(chroma, hop, beats):
    """Each beat's chroma (beat i runs from beats[i] to beats[i + 1]), scaled to length 1;
    a silent beat stays all zero."""
    out = []
    for start, end in zip(beats, beats[1:]):
        vector = span(chroma, hop, start, end)
        norm = float(np.linalg.norm(vector))
        out.append(vector / norm if norm > SILENT else vector)
    return out


def _phase(beats, chroma, hop, bar_length):
    """The beat phase (0 .. bar_length-1) where the harmony changes most."""
    vectors = _beat_chroma(chroma, hop, beats)
    scores = [0.0] * bar_length
    for i in range(1, len(vectors)):
        before, after = vectors[i - 1], vectors[i]
        if np.linalg.norm(before) > SILENT and np.linalg.norm(after) > SILENT:
            scores[i % bar_length] += 1 - float(before @ after)
    best = max(scores)
    return next(p for p, score in enumerate(scores) if score >= best - 1e-9)   # ties: the earliest


def bar_starts(beats: list, chroma, hop: float, bar_length: int) -> list:
    """Downbeat times: every bar_length-th beat from the phase where the harmony changes most."""
    return list(beats[_phase(beats, chroma, hop, bar_length)::bar_length])


def _bar_text(record_beats, key):
    tokens = [NO_CHORD if t == 'N' else t for t in read_bar([], record_beats, key).split()]
    return tokens[0] if all(t == '.' for t in tokens[1:]) else ' '.join(tokens)


def beat_grid(analysis) -> tuple:
    """(beats, stride): the tracker's steady beats at the folded tempo of key.fold_bpm.

    A tracker under 70 bpm has each beat split in two; at 140 or over, a beat of the
    song is `stride` tracker beats (which of them is beat 1 is left to the bar phase).
    """
    beats = steady_beats(analysis['beats'], _period(analysis['beats'], analysis.get('bpm')))
    tempo = float(analysis.get('bpm') or (60 / _period(beats)))
    stride = 1
    while 0 < tempo < SLOWEST and len(beats) > 1:
        beats = sorted(beats + [(a + b) / 2 for a, b in zip(beats, beats[1:])])
        tempo *= 2
    while tempo >= FASTEST:
        stride *= 2
        tempo /= 2
    return beats, stride


def record_bars(analysis, key, beats_per_bar=4) -> list:
    """The record's bars in order: [{'start', 'end', 'text', 'beats'}], beats as bar_beats gives them."""
    beats, stride = beat_grid(analysis)
    starts = bar_starts(beats, analysis['chroma'], analysis['hop'], beats_per_bar * stride)
    bars = []
    for start, end in zip(starts, starts[1:]):   # a final partial bar has no end: dropped
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
