"""Check one song against its recording: line it up, read each play, decide each bar."""
import math
import os
import sys

from recording_check.align import align, played_slots
from recording_check.audio import slug
from recording_check.reading import bar_beats
from recording_check.second_opinion import gate
from recording_check.verdict import (FLOOD_SHARE, bar_finding, kept_repeats, play_differs,
                                    song_verdict, unsteady_plays)

RHYTHM_TEMPO = 0.10   # tracker within this share of the chart's bpm for rhythm findings
HAND = {'Ear', 'Record'}   # hand evidence wins: such a bar is never a finding


def _entry(recording, today, verdict, shift=0, bars=None, score=None, unchecked=None):
    """unchecked: bars left with no play to judge, every play lost to a slipped line-up."""
    out = {'recording': recording, 'checked': today, 'shift': shift, 'verdict': verdict,
           'bars': bars or [], 'unchecked': unchecked or []}
    if score is not None:
        out['score'] = score
    return out


def cache_file(cache_dir, title, path):
    """The analysis cache, keyed by title and recording file name."""
    stem = os.path.splitext(os.path.basename(path))[0]
    return os.path.join(cache_dir, f'{slug(title)}--{slug(stem)}.json')


def _hand_bars(chart):
    """(section, bar) pairs whose evidence, or whose section's, is Ear or Record."""
    out = set()
    for section in chart['sections']:
        for bar in section['bars']:
            if (bar.get('evidence') or section.get('from')) in HAND:
                out.add((section['name'], bar['bar']))
    return out


def _bar_info(chart):
    return {(s['name'], b['bar']): b for s in chart['sections'] for b in s['bars']}


def check_song(chart, path, analyze, cache_dir, today):
    """The song's entry for recording-check.json."""
    name = os.path.basename(path) if path else None
    if chart.get('skipped') or not chart.get('played'):
        return _entry(name, today, 'no song order')
    if not path or not os.path.isfile(os.path.expanduser(path)):
        return _entry(name, today, 'no recording')
    try:
        analysis = analyze(os.path.expanduser(path), cache_file(cache_dir, chart['title'], path))
    except Exception as error:   # an unreadable file is reported like a missing one
        print(f"{chart['title']}: cannot read the recording ({error})", file=sys.stderr)
        return _entry(name, today, 'no recording')
    alignment = align(chart, analysis)
    if not math.isfinite(alignment.score):   # the chart does not fit in the recording
        return _entry(name, today, 'not lined up', alignment.shift)
    findings, starts, slipped, unchecked = find_bars(chart, analysis, alignment)
    # every bar by hand: nothing to flag, which is not a failed line-up
    verdict = song_verdict(findings, len(findings)) if findings else 'lined up'
    if slipped > FLOOD_SHARE * len(chart['played']):
        verdict = 'not lined up'
    bars = []
    if verdict == 'lined up':
        info = _bar_info(chart)
        for key, finding in findings.items():
            if finding is None:
                continue
            bars.append({'section': key[0], 'bar': key[1], 'chords': info[key]['chords'],
                         'kind': finding.kind, 'record': finding.record,
                         'confidence': round(finding.confidence, 2),
                         'at': [round(t, 1) for t in starts[key]]})
    return _entry(name, today, verdict, alignment.shift, bars, alignment.score, unchecked)


def find_bars(chart, analysis, alignment):
    """Per checkable chart bar its Finding (or None) and play start times; and how many
    plays were dropped because the line-up slipped in their stretch of the song."""
    hand = _hand_bars(chart)
    read = []
    for entry, bar_slot, (start, end) in zip(chart['played'], played_slots(chart), alignment.bars):
        beats = bar_beats(analysis, start, end, chart['beatsPerBar'], chart['key'], alignment.shift)
        beats = gate(analysis, start, end, beats, bar_slot, alignment.shift)
        read.append(((entry['section'], entry['bar']), bar_slot, start, beats))
    # hand bars count as evidence of the line-up, never as findings
    differs = [play_differs(slot, beats) for _, slot, _, beats in read]
    slipped = unsteady_plays(differs)
    slipped -= kept_repeats(slipped, [key for key, _, _, _ in read], differs)
    plays, starts, bar_slots = {}, {}, {}
    for i, (key, slot, start, beats) in enumerate(read):
        if key in hand:
            continue
        starts.setdefault(key, []).append(start)
        plays.setdefault(key, [])
        if i not in slipped:
            plays[key].append(beats)
        bar_slots[key] = slot
    # rhythm only when the tracker runs at the chart's own tempo, not half or double
    rhythm = abs(analysis['bpm'] / chart['bpm'] - 1) <= RHYTHM_TEMPO
    findings = {key: bar_finding(bar_slots[key], plays[key], chart['key'], rhythm=rhythm)
                for key in plays}
    unchecked = [{'section': k[0], 'bar': k[1]} for k in plays if not plays[k]]
    return findings, starts, len(slipped), unchecked
