"""Read a recording for a new song: one JSON request on stdin, one JSON answer on stdout.

request: {"title", "recording": "/path", "timeSignature"?, "key"?, "bpm"?,
          "chart"?: <export-charts entry, barred>, "chordLines"?: [{section, chords}]}
answer:  {"recording": <file name only>, "duration", "key", "bpm", "timeSignature",
          "tuning", "route": "chart" | "words" | "record",
          "check"? (chart), "sections"?, "form"?, "evidence"? (words, record)}
Progress goes to stderr. A missing or unreadable recording, a bad request, compound time
(6/8, 9/8, 12/8) with no barred chart, or an answer that is not JSON exits 2.
A bpm given lays the record's bars at that tempo (doubled or halved from the tracker).
See recording_check/README.md.
"""
import contextlib
import datetime
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from recording_check import audio  # noqa: E402
from recording_check.check import cache_file, check_song  # noqa: E402
from recording_check.key import fold_bpm, fold_ratio, key_from_analysis  # noqa: E402
from recording_check.skeleton import parts, record_bars, tracker_tempo, unsure_evidence  # noqa: E402
from recording_check.words import line_up  # noqa: E402

COMPOUND = {6, 9, 12}   # 6/8, 9/8, 12/8 count three eighths to a beat; 3/8 is three beats
TEMPO_WARN = 0.10       # warn when the bars' tempo is further than this share from the bpm given
SLOWEST_GIVEN, FASTEST_GIVEN = 20, 400   # a given bpm outside this is refused (bars are laid at it)


def beats_per_bar(time_signature):
    try:
        top, bottom = (int(n) for n in str(time_signature).split('/'))
    except ValueError:
        raise ValueError(f'bad time signature {time_signature!r}') from None
    if top < 1 or bottom < 1:
        raise ValueError(f'bad time signature {time_signature!r}')
    return top // 3 if bottom == 8 and top in COMPOUND else top


def _fail(message, path=None):
    """One line on stderr, the recording's folder never in it; exit 2."""
    if path:
        message = message.replace(path, os.path.basename(path))
    print(' '.join(message.split()), file=sys.stderr)
    sys.exit(2)


def _request(stdin):
    try:
        request = json.load(stdin)
    except ValueError as error:
        _fail(f'the request is not valid JSON ({error})')
    if not isinstance(request, dict) or not request.get('title') or not request.get('recording'):
        _fail('the request needs a title and a recording')
    return request


def _settings(request):
    """(time signature, beats per bar, bpm given or None), checked before the record is read."""
    chart = request.get('chart') or {}
    if not isinstance(chart, dict):
        raise ValueError('the chart is not an export-charts entry')
    signature = request.get('timeSignature') or chart.get('timeSignature') or '4/4'
    per_bar = beats_per_bar(signature)
    top, bottom = str(signature).split('/')
    if not request.get('chart') and int(bottom) == 8 and int(top) in COMPOUND:
        # the tracker may count the eighth or the dotted quarter, and a double or half fold
        # cannot turn one into the other: bars cut there would be wrong, so none are made
        raise ValueError(f'{signature}: bars are not read off the record in compound time; '
                         'add the song with a barred chart (--chart)')
    bpm = request['bpm'] if request.get('bpm') is not None else chart.get('bpm')
    if bpm is not None and (isinstance(bpm, bool) or not isinstance(bpm, (int, float))
                            or not (math.isfinite(bpm) and SLOWEST_GIVEN <= bpm <= FASTEST_GIVEN)):
        raise ValueError(f'bpm {bpm!r} is not a tempo ({SLOWEST_GIVEN} to {FASTEST_GIVEN})')
    return signature, per_bar, bpm


def _record_bars(analysis, key, per_bar, bpm, title):
    """The record's bars, laid toward the bpm given; a warning when they still sit far from it."""
    if bpm and analysis.get('bpm', 0) > 0:   # a tracker with no tempo: beat_grid uses its beats
        grid = analysis['bpm'] * fold_ratio(analysis['bpm'], bpm)
        if abs(grid / bpm - 1) > TEMPO_WARN:
            print(f'{title}: warning: the song is at {bpm:g} bpm but the tracker reads '
                  f"{analysis['bpm']:g}, so its bars are laid at {grid:g} bpm; check the bars "
                  'or the bpm', file=sys.stderr)
    return record_bars(analysis, key, per_bar, bpm)


def _answer(request, full, analyze, signature, per_bar, given):
    title = request['title']
    print(f'{title}: reading {os.path.basename(full)}', file=sys.stderr)
    analysis = analyze(full, cache_file(audio.CACHE_DIR, title, full))
    chart = request.get('chart')
    key = request.get('key') or (chart or {}).get('key') or key_from_analysis(analysis)
    bpm = given if given is not None else fold_bpm(tracker_tempo(analysis))
    answer = {'recording': os.path.basename(full), 'duration': analysis['duration'],
              'key': key, 'bpm': bpm, 'timeSignature': signature,
              'tuning': analysis['tuning']}
    if chart:
        entry = dict(chart, key=key, bpm=bpm, timeSignature=signature,
                     beatsPerBar=chart.get('beatsPerBar') or per_bar)
        today = datetime.date.today().isoformat()
        # the analysis is already read: the record is read once
        cached = lambda _path, _cache: analysis   # noqa: E731
        answer.update(route='chart', check=check_song(entry, full, cached, audio.CACHE_DIR, today))
    else:
        bars = _record_bars(analysis, key, per_bar, given, title)
        lines = request.get('chordLines')
        if lines:
            answer.update(route='words', **line_up(lines, bars, key))
        else:
            sections, form = parts([bar['text'] for bar in bars])
            answer.update(route='record', sections=sections, form=form,
                          evidence=unsure_evidence(sections))
    return answer


def main(argv=None, analyze=audio.analyze, stdin=sys.stdin, stdout=sys.stdout):
    request = _request(stdin)
    full = os.path.expanduser(str(request['recording']))
    if not os.path.isfile(full):
        _fail(f"{request['title']}: no recording at {full}", full)
    try:
        signature, per_bar, given = _settings(request)
    except Exception as error:   # a bad request is one line, never a traceback
        _fail(f"{request['title']}: {error}", full)
    try:
        with contextlib.redirect_stdout(sys.stderr):   # stdout carries only the answer
            answer = _answer(request, full, analyze, signature, per_bar, given)
    except Exception as error:
        _fail(f"{request['title']}: cannot read the recording ({type(error).__name__}: {error})", full)
    try:   # NaN is not JSON: the app could not read it back
        text = json.dumps(answer, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as error:
        _fail(f"{request['title']}: cannot write the answer ({type(error).__name__}: {error})", full)
    stdout.write(text + '\n')
    return answer


if __name__ == '__main__':
    main()
