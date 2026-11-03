"""Decide, bar by bar, whether the record agrees with the chart."""
from collections import Counter
from dataclasses import dataclass

from recording_check.agree import agrees
from recording_check.chords import parse, same, spell, tones

MIN_CONFIDENCE = 0.5   # a beat counts only at or above this confidence
MIN_SHARE = 0.6        # share of plays that must agree for a finding
FLOOD_SHARE = 0.25     # more chord findings than this share of bars: not lined up
QUARTER = 0.25         # a differing run must cover more than this share of the bar
ONE_PLAY_CONFIDENCE = 0.85   # a bar played once needs this much to be a finding
RIFF_BEATS = 4         # a new chord on every beat of a bar this long is riff notes
RHYTHM_MAX_CHORDS = 2  # rhythm findings only on bars of at most this many chart chords


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


def read_bar(chart_slots, record_beats, key, min_confidence=MIN_CONFIDENCE) -> str:
    """The record's reading of one bar: a chord where it changes, '.' where it holds.

    A beat after the first that is too unsure to count is written as holding, so the
    reading shown to the player names only chords the check could stand behind.
    """
    chart = _chart_chords(chart_slots)
    tokens, previous = [], None
    for i, (chord, conf) in enumerate(record_beats):
        if previous is not None and conf < min_confidence:
            tokens.append('.')
            continue
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


def _same_class(a, b):
    """Same root and chord class, whatever the bass: two inversions of one chord."""
    return a.root == b.root and a.kind == b.kind


def _on_own_bass(play, chart_chord, usable):
    """True when some usable beat of the play has the chart chord over its own bass,
    so a foreign bass elsewhere walks; without one the bass is held (a pedal)."""
    return any(usable(beat) and same(beat[0], chart_chord) for beat in play)


def _chord_difference(chart, play, min_confidence):
    """Mean confidence of the first differing run in one play, or None.

    A run counts if the chart has no such chord and it covers more than a
    quarter of the bar, or is a passing chord whose root or kind is new, between
    two different chords (not two inversions of one: that is a walking bass). The
    chart's own chord over a bass outside it is a passing bass note, never a run.
    """
    n = len(play)
    allow_none = any(c.kind == 'none' for c, _, _ in chart)
    usable = lambda beat: _usable(beat, min_confidence, allow_none)
    for first, last, chord in _runs(play, usable):
        if any(agrees(chord, c, text) for c, _, text in chart):
            continue
        if any(_same_class(chord, c) and chord.bass not in tones(c) and _on_own_bass(play, c, usable)
               for c, _, _ in chart):
            continue   # the chart's chord over a bass outside it, and over its own: a walking note
        covers = (last - first + 1) / n > QUARTER
        passing = (first > 0 and last < n - 1
                   and usable(play[first - 1]) and usable(play[last + 1])
                   and not _same_class(play[first - 1][0], play[last + 1][0])
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


def _modal_reading(chart_slots, plays, key, min_confidence):
    return Counter(read_bar(chart_slots, p, key, min_confidence) for p in plays).most_common(1)[0][0]


def _simple_bar(chart, beats):
    """At most two chart chords, each starting on a whole beat."""
    return (len(chart) <= RHYTHM_MAX_CHORDS
            and all(abs(start * beats - round(start * beats)) < 1e-6 for _, start, _ in chart))


def bar_finding(chart_slots, plays, key, min_confidence=MIN_CONFIDENCE, min_share=MIN_SHARE,
                rhythm=True):
    """A Finding for this chart bar, or None when the record agrees.

    A bar played once needs ONE_PLAY_CONFIDENCE. Rhythm findings need `rhythm` (the
    caller's word that the record's tempo is the chart's) and a simple bar. A reading
    with a new chord on every beat of a bar of RIFF_BEATS or more is riff notes the
    detector took for chords, never a finding.
    """
    plays = [p for p in plays if p]
    chart = _chart_chords(chart_slots)
    if not plays or not chart:
        return None
    finding = _finding(chart_slots, chart, plays, key, min_confidence, min_share, rhythm)
    if finding is not None and len(plays) == 1 and finding.confidence < ONE_PLAY_CONFIDENCE:
        return None
    if finding is not None and _riff(finding.record):
        return None
    return finding


def _riff(reading):
    """A new chord on every beat of a bar of RIFF_BEATS or more beats."""
    tokens = reading.split()
    return len(tokens) >= RIFF_BEATS and '.' not in tokens


def _finding(chart_slots, chart, plays, key, min_confidence, min_share, rhythm):
    diffs = [(p, _chord_difference(chart, p, min_confidence)) for p in plays]
    chord_plays = [(p, c) for p, c in diffs if c is not None]
    if len(chord_plays) / len(plays) >= min_share:
        reading = _modal_reading(chart_slots, [p for p, _ in chord_plays], key, min_confidence)
        return Finding('chord', reading, sum(c for _, c in chord_plays) / len(chord_plays))
    if not rhythm or not _simple_bar(chart, len(plays[0])):
        return None
    late = [p for p in plays if _rhythm_difference(chart, p, min_confidence)]
    if len(late) / len(plays) >= min_share:
        confs = [c for p in late for _, c in p]
        return Finding('rhythm', _modal_reading(chart_slots, late, key, min_confidence), sum(confs) / len(confs))
    return None


def song_verdict(findings: dict, bar_count: int, flood_share=FLOOD_SHARE) -> str:
    """'not lined up' when over flood_share of the bars are chord findings."""
    flagged = sum(1 for f in findings.values() if f is not None and f.kind == 'chord')
    if bar_count <= 0 or flagged > flood_share * bar_count:
        return 'not lined up'
    return 'lined up'


LOCAL_WINDOW = 5   # consecutive plays looked at together
LOCAL_MOST = 3     # differences among them that mean the line-up slipped there


def play_differs(chart_slots, play, min_confidence=MIN_CONFIDENCE) -> bool:
    """True when this one play has a chord difference with the chart's bar."""
    chart = _chart_chords(chart_slots)
    return bool(chart) and _chord_difference(chart, play, min_confidence) is not None


def unsteady_plays(differs: list) -> set:
    """Indexes (in playing order) of differing plays inside a run where most plays differ.

    A flood in one stretch of a song means the line-up slipped there (a fade, an extra
    bar, a tempo change), as a flood over the whole song does; such plays are dropped.
    """
    out = set()
    for first in range(max(len(differs) - LOCAL_WINDOW + 1, 1)):
        window = range(first, min(first + LOCAL_WINDOW, len(differs)))
        if sum(differs[i] for i in window) >= LOCAL_MOST:
            out.update(i for i in window if differs[i])
    return out


def _passes(keys):
    """A pass number per play: a new pass starts when the section changes or starts over."""
    out, number = [], 0
    for i, (section, bar) in enumerate(keys):
        if i and (section != keys[i - 1][0] or bar <= keys[i - 1][1]):
            number += 1
        out.append(number)
    return out


def kept_repeats(slipped: set, keys: list, differs: list, min_share=MIN_SHARE) -> set:
    """The slipped plays to keep after all: those of a bar that differs in at least
    min_share of all its plays while plays of its section in another pass agree.
    That is a chart error repeated every time round, not a line-up that slipped."""
    passes = _passes(keys)
    kept = set()
    for i in slipped:
        mine = [j for j, k in enumerate(keys) if k == keys[i]]
        if sum(differs[j] for j in mine) / len(mine) < min_share:
            continue
        if any(keys[j][0] == keys[i][0] and passes[j] != passes[i] and not differs[j]
               for j in range(len(keys))):
            kept.add(i)
    return kept
