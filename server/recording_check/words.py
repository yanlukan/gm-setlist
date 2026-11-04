"""A trusted chord chart with no bar lines (chords over words) lined up with the record's bars.

The record's bars (skeleton.record_bars) are collapsed to their chord changes: a
bar's first chord when it differs from the chord sounding at the end of the bar
before, and every change inside a bar. A Needleman-Wunsch line-up pairs the chart's
chords, in playing order, with those changes: cost 0 when agree.agrees, 1 when they
differ, GAP_COST for a chart chord or a change with no partner. A bar that holds the
chord of the bar before may also take a chart chord, at no cost when it takes none,
so a chart naming one chord twice across a line (F C | C G) keeps both.

Each record bar belongs to the chart line of the chart chord paired with its first
paired change; a bar with none belongs to the line before. The chart's lines give
the sections: a run of lines with one section name is one play of it, a name played
again with the same bars reuses its section, else it is named `<name> 2`, `<name> 3`...

A bar is Chart, written in the chart's spelling on the record's beats, when every
chord written in it (each change, and the chord held over from the bar before) comes
from an agreeing chart chord on a beat of at least MIN_CONFIDENCE, and no chart chord
the record lacks falls inside it. Every other bar is Unsure, with the chart's reading
(when a chart chord falls in it) and the record's. Detector chords are never fact.
"""
from recording_check.agree import agrees
from recording_check.chords import parse, same
from recording_check.skeleton import _line, parts, unsure_evidence
from recording_check.verdict import MIN_CONFIDENCE

GAP_COST = 1.0   # a chart chord or a record change with no partner
HOLD = '.'


def _chart_chords(chart_lines):
    """The chart's chords in playing order as (line index, Chord, text); words never get here."""
    out = []
    for index, line in enumerate(chart_lines):
        for text in line.get('chords', []):
            chord = parse(text)
            if chord is not None:
                out.append((index, chord, text.strip()))
    return out


def _tokens(bar):
    """The bar's tokens on its beats: a held bar's single chord sits on beat 0."""
    tokens = bar['text'].split()
    return tokens + [HOLD] * (len(bar['beats']) - len(tokens))


def _changes(bars):
    """Every chord written in a bar: (bar, beat, Chord, confidence, is a change).
    A bar's first chord held over from the bar before is written too, as no change."""
    out, previous = [], None
    for b, bar in enumerate(bars):
        for beat, token in enumerate(_tokens(bar)):
            if token == HOLD:
                continue
            chord, conf = bar['beats'][beat]
            change = previous is None or beat > 0 or not same(chord, previous)
            out.append((b, beat, chord, conf, change))
            previous = chord
    return out


def _skip(item):
    """What leaving a record item unpaired costs: a chord held over from the bar before is free."""
    return GAP_COST if item[4] else 0.0


def _align(chart, changes):
    """Needleman-Wunsch: a list of (chart index or None, change index or None) in order."""
    n, m = len(chart), len(changes)
    cost = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        cost[i][0] = i * GAP_COST
    for j in range(1, m + 1):
        cost[0][j] = cost[0][j - 1] + _skip(changes[j - 1])

    def pair(i, j):
        _, chord, text = chart[i]
        return 0.0 if agrees(changes[j][2], chord, text) else 1.0

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost[i][j] = min(cost[i - 1][j - 1] + pair(i - 1, j - 1),
                             cost[i - 1][j] + GAP_COST, cost[i][j - 1] + _skip(changes[j - 1]))
    path, i, j = [], n, m
    while i or j:
        if i and j and abs(cost[i][j] - cost[i - 1][j - 1] - pair(i - 1, j - 1)) < 1e-9:
            path.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i and (not j or abs(cost[i][j] - cost[i - 1][j] - GAP_COST) < 1e-9):
            path.append((i - 1, None))
            i -= 1
        else:
            path.append((None, j - 1))
            j -= 1
    return path[::-1]


def _per_bar(bars, chart, changes, path):
    """Per bar: its chart line, whether it is Chart, its chart spelling and the chart's reading."""
    info = [{'line': None, 'sure': True, 'chart': {}, 'extra': []} for _ in bars]
    where = {}   # change index -> chart index
    gapped = []  # (chart index, change index before it or None)
    last = None
    for c, r in path:
        if r is not None:
            last = r
            if c is not None:
                where[r] = c
        else:
            gapped.append((c, last))
    held = None   # (chart index, agreed) of the chord sounding
    for r, (b, beat, chord, conf, change) in enumerate(changes):
        here = info[b]
        c = where.get(r)
        if change or c is not None:   # a held chord the chart names again starts its chord anew
            held = None if c is None else (c, agrees(chord, chart[c][1], chart[c][2]))
            if c is not None and here['line'] is None:
                here['line'] = chart[c][0]
        if held is None or not held[1] or conf < MIN_CONFIDENCE:
            here['sure'] = False
        if held is not None:
            here['chart'][beat] = chart[held[0]][2]
    for c, r in gapped:
        b = changes[r][0] if r is not None else 0
        if b < len(info):
            info[b]['sure'] = False
            info[b]['extra'].append((changes[r][1] if r is not None else -1, chart[c][2]))
            if info[b]['line'] is None:
                info[b]['line'] = chart[c][0]
    line = 0
    for here in info:
        line = here['line'] if here['line'] is not None else line
        here['line'] = line
    return info


def _written(tokens):
    """Tokens in the bar format: one chord when it holds the whole bar."""
    return tokens[0] if all(t == HOLD for t in tokens[1:]) else ' '.join(tokens)


def _chart_spelling(bar, here):
    tokens = [here['chart'].get(i, t) if t != HOLD else t for i, t in enumerate(_tokens(bar))]
    return _written(tokens)


def _chart_reading(bar, here):
    """The chart chords falling in the bar on the record's beats, or None when there are none.
    Chart chords the record lacks share out the beats between the change before them and
    the next; where they do not fit on beats, the bar is written as its chords alone."""
    if not here['chart'] and not here['extra']:
        return None
    n = len(bar['beats'])
    placed = dict(here['chart'])
    at = [(float(beat), text) for beat, text in placed.items()]
    groups = {}
    for after, text in here['extra']:
        groups.setdefault(after, []).append(text)
    fits = True
    for after, texts in groups.items():
        end = min([beat for beat in placed if beat > after] + [n])
        for i, text in enumerate(texts):
            spot = after + (end - after) * (i + 1) / (len(texts) + 1)
            at.append((spot, text))
            beat = int(spot)
            if beat <= after or beat >= end or beat in placed:
                fits = False
            placed[beat] = text
    if not fits or 0 not in placed:   # the bar opens on a record change the chart lacks
        return ' '.join(text for _, text in sorted(at, key=lambda item: item[0]))
    return _written([placed.get(i, HOLD) for i in range(n)])


def _sections(chart_lines, bars, info):
    """Plays of the chart's sections: [(name, [[bar index, ...] per chart line])]."""
    plays = []
    for b, here in enumerate(info):
        name = chart_lines[here['line']]['section']
        if not plays or plays[-1][0] != name:
            plays.append((name, [], []))
        if plays[-1][2][-1:] != [here['line']]:
            plays[-1][2].append(here['line'])
            plays[-1][1].append([])
        plays[-1][1][-1].append(b)
    return [(name, lines) for name, lines, _ in plays]


def line_up(chart_lines: list, bars: list, key: str) -> dict:
    """The record's bars written from a chart with no bar lines (Task 1's chordLines).

    Returns {'sections': [{'name', 'chords'}], 'form': [names], 'evidence': {name:
    {'from': 'Chart', 'bars': [Unsure bars]}}}. key is the chart's key; the record's
    readings are already spelled in it.
    """
    chart = _chart_chords(chart_lines)
    if not chart:   # nothing to line up with: the record's own parts, every bar Unsure
        sections, form = parts([bar['text'] for bar in bars])
        return {'sections': sections, 'form': form, 'evidence': unsure_evidence(sections)}
    changes = _changes(bars)
    info = _per_bar(bars, chart, changes, _align(chart, changes))
    sections, form, evidence, by_chords = [], [], {}, {}
    for name, lines in _sections(chart_lines, bars, info):
        texts = [[_chart_spelling(bars[b], info[b]) if info[b]['sure'] else bars[b]['text'] for b in line]
                 for line in lines]
        chords = '\n'.join(_line(line) for line in texts)
        if (name, chords) in by_chords:
            form.append(by_chords[(name, chords)])
            continue
        taken = {s['name'] for s in sections}
        unique, n = name, 1
        while unique in taken:
            n += 1
            unique = f'{name} {n}'
        by_chords[(name, chords)] = unique
        sections.append({'name': unique, 'chords': chords})
        form.append(unique)
        unsure, index = [], 0
        for line, line_texts in zip(lines, texts):
            for b, text in zip(line, line_texts):
                if not info[b]['sure']:
                    readings = [{'from': 'Record', 'chords': ' '.join(bars[b]['text'].split())}]
                    chart_reading = _chart_reading(bars[b], info[b])
                    if chart_reading is not None:
                        readings.insert(0, {'from': 'Chart', 'chords': chart_reading})
                    unsure.append({'bar': index, 'chords': ' '.join(text.split()), 'from': 'Unsure',
                                   'readings': readings})
                index += 1
        evidence[unique] = {'from': 'Chart', 'bars': unsure}
    return {'sections': sections, 'form': form, 'evidence': evidence}
