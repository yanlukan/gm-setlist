"""Decide, bar by bar, whether the record agrees with the chart."""
from collections import Counter
from dataclasses import dataclass

from recording_check.chords import parse, same, spell

MIN_CONFIDENCE = 0.5   # a beat counts only at or above this confidence
MIN_SHARE = 0.6        # share of plays that must agree for a finding
FLOOD_SHARE = 0.25     # more chord findings than this share of bars: not lined up
QUARTER = 0.25         # a differing run must cover more than this share of the bar


@dataclass(frozen=True)
class Finding:
    """kind is 'chord' or 'rhythm'; record is the reading in the app's bar format."""
    kind: str
    record: str
    confidence: float


def _chart_chords(chart_slots):
    """The bar's chart chords as (parsed chord, start, original text)."""
    out = []
    for slot in chart_slots:
        chord = parse(slot['chord'])
        if chord is not None:
            out.append((chord, slot['start'], slot['chord']))
    return out


def _chart_at(chart, fraction):
    """The chart chord sounding at a fraction of the bar."""
    current = None
    for chord, start, _ in chart:
        if start <= fraction + 1e-9:
            current = chord
    return current if current is not None else (chart[0][0] if chart else None)


def _chart_changes(chart, beats):
    """Beats on which the chart changes chord (always including beat 0)."""
    at = [_chart_at(chart, (i + 0.5) / beats) for i in range(beats)]
    return {i for i in range(beats) if i == 0 or at[i] is None or at[i - 1] is None or not same(at[i], at[i - 1])}


def read_bar(chart_slots, record_beats, key) -> str:
    """The record's reading of one bar: a chord where it changes, '.' where it holds."""
    chart = _chart_chords(chart_slots)
    tokens, previous = [], None
    for i, (chord, _) in enumerate(record_beats):
        if previous is not None and same(chord, previous):
            tokens.append('.')
        else:
            tokens.append(_name(chord, chart, (i + 0.5) / len(record_beats), key))
        previous = chord
    return ' '.join(tokens)


def _name(chord, chart, fraction, key):
    """The chart's own spelling if the chart has this chord, else the key's."""
    here = _chart_at(chart, fraction)
    for candidate, start, text in sorted(chart, key=lambda c: 0 if c[0] is here else 1):
        if same(candidate, chord):
            return text
    return spell(chord, key)


def _usable(beat, min_confidence, allow_none):
    """A beat counts when it is confident and, unless the chart has N.C., not 'no chord'."""
    chord, conf = beat
    return conf >= min_confidence and (allow_none or chord.kind != 'none')


def _runs(play, usable):
    """Runs of equal chords over usable beats as [first beat, last beat, chord]."""
    runs = []
    for i, (chord, _) in enumerate(play):
        if not usable(play[i]):
            continue
        if runs and runs[-1][1] == i - 1 and same(runs[-1][2], chord):
            runs[-1][1] = i
        else:
            runs.append([i, i, chord])
    return runs


def _chord_difference(chart, play, min_confidence):
    """Mean confidence of the first differing run in one play, or None.

    A run counts if the chart has no such chord and it covers more than a
    quarter of the bar, or is a passing chord whose root or kind is new.
    """
    n = len(play)
    allow_none = any(c.kind == 'none' for c, _, _ in chart)
    usable = lambda beat: _usable(beat, min_confidence, allow_none)
    for first, last, chord in _runs(play, usable):
        if any(same(chord, c) for c, _, _ in chart):
            continue
        covers = (last - first + 1) / n > QUARTER
        passing = (first > 0 and last < n - 1
                   and usable(play[first - 1]) and usable(play[last + 1])
                   and not same(play[first - 1][0], play[last + 1][0])
                   and not any(c.root == chord.root and c.kind == chord.kind for c, _, _ in chart))
        if covers or passing:
            confs = [play[i][1] for i in range(first, last + 1)]
            return sum(confs) / len(confs)
    return None


def _changes(chords):
    return {i for i in range(len(chords)) if i == 0 or not same(chords[i], chords[i - 1])}


def _collapsed(chords):
    out = []
    for chord in chords:
        if not out or not same(out[-1], chord):
            out.append(chord)
    return out


def _rhythm_difference(chart, play, min_confidence):
    """True when every beat is usable, the chart's chords come in order, on other beats."""
    n = len(play)
    allow_none = any(c.kind == 'none' for c, _, _ in chart)
    if not all(_usable(b, min_confidence, allow_none) for b in play):
        return False
    chords = [c for c, _ in play]
    chart_by_beat = [_chart_at(chart, (i + 0.5) / n) for i in range(n)]
    if None in chart_by_beat or _changes(chords) == _chart_changes(chart, n):
        return False
    a, b = _collapsed(chords), _collapsed(chart_by_beat)
    return len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))


def _modal_reading(chart_slots, plays, key):
    return Counter(read_bar(chart_slots, p, key) for p in plays).most_common(1)[0][0]


def bar_finding(chart_slots, plays, key, min_confidence=MIN_CONFIDENCE, min_share=MIN_SHARE):
    """A Finding for this chart bar, or None when the record agrees."""
    plays = [p for p in plays if p]
    chart = _chart_chords(chart_slots)
    if not plays or not chart:
        return None
    diffs = [(p, _chord_difference(chart, p, min_confidence)) for p in plays]
    chord_plays = [(p, c) for p, c in diffs if c is not None]
    if len(chord_plays) / len(plays) >= min_share:
        reading = _modal_reading(chart_slots, [p for p, _ in chord_plays], key)
        return Finding('chord', reading, sum(c for _, c in chord_plays) / len(chord_plays))
    rhythm = [p for p in plays if _rhythm_difference(chart, p, min_confidence)]
    if len(rhythm) / len(plays) >= min_share:
        confs = [c for p in rhythm for _, c in p]
        return Finding('rhythm', _modal_reading(chart_slots, rhythm, key), sum(confs) / len(confs))
    return None


def song_verdict(findings: dict, bar_count: int, flood_share=FLOOD_SHARE) -> str:
    """'not lined up' when over flood_share of the bars are chord findings."""
    flagged = sum(1 for f in findings.values() if f is not None and f.kind == 'chord')
    if bar_count <= 0 or flagged > flood_share * bar_count:
        return 'not lined up'
    return 'lined up'
