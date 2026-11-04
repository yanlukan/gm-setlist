"""Read a recording for a new song: one JSON request on stdin, one JSON answer on stdout.

request: {"title", "recording": "/path", "timeSignature"?, "key"?, "bpm"?,
          "chart"?: <export-charts entry, barred>, "chordLines"?: [{section, chords}]}
answer:  {"recording": <file name only>, "duration", "key", "bpm", "timeSignature",
          "tuning", "route": "chart" | "words" | "record",
          "check"? (chart), "sections"?, "form"?, "evidence"? (words, record)}
Progress goes to stderr. A missing or unreadable recording exits 2.
See recording_check/README.md.
"""
import contextlib
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from recording_check import audio  # noqa: E402
from recording_check.check import cache_file, check_song  # noqa: E402
from recording_check.key import fold_bpm, key_from_analysis  # noqa: E402
from recording_check.skeleton import parts, record_bars, unsure_evidence  # noqa: E402
from recording_check.words import line_up  # noqa: E402

COMPOUND = {6, 9, 12}   # 6/8, 9/8, 12/8 count three eighths to a beat


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


def _signature(request):
    """The time signature and its beats per bar, checked before the record is read."""
    chart = request.get('chart') or {}
    signature = request.get('timeSignature') or chart.get('timeSignature') or '4/4'
    try:
        return signature, beats_per_bar(signature)
    except ValueError as error:
        _fail(f"{request['title']}: {error}")


def _answer(request, full, analyze, signature, per_bar):
    title = request['title']
    print(f'{title}: reading {os.path.basename(full)}', file=sys.stderr)
    analysis = analyze(full, cache_file(audio.CACHE_DIR, title, full))
    chart = request.get('chart')
    key = request.get('key') or (chart or {}).get('key') or key_from_analysis(analysis)
    bpm = request.get('bpm') or (chart or {}).get('bpm') or fold_bpm(analysis['bpm'])
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
        bars = record_bars(analysis, key, per_bar)
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
    signature, per_bar = _signature(request)
    try:
        with contextlib.redirect_stdout(sys.stderr):   # stdout carries only the answer
            answer = _answer(request, full, analyze, signature, per_bar)
    except Exception as error:
        _fail(f"{request['title']}: cannot read the recording ({type(error).__name__}: {error})", full)
    stdout.write(json.dumps(answer, ensure_ascii=False) + '\n')
    return answer


if __name__ == '__main__':
    main()
