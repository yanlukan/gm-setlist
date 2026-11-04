"""Read a recording for a new song: one JSON request on stdin, one JSON answer on stdout.

request: {"title", "recording": "/path", "timeSignature"?, "key"?, "bpm"?,
          "chart"?: <export-charts entry, barred>, "chordLines"?: [{section, chords}]}
answer:  {"recording": <file name only>, "duration", "key", "bpm", "timeSignature",
          "tuning", "route": "chart" | "words" | "record",
          "check"? (chart), "sections"?, "form"?, "evidence"? (words, record)}
Progress goes to stderr. A missing or unreadable recording exits 2.
See recording_check/README.md.
"""
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
    top, bottom = (int(n) for n in time_signature.split('/'))
    return top // 3 if bottom == 8 and top in COMPOUND else top


def _fail(message):
    print(message, file=sys.stderr)
    sys.exit(2)


def main(argv=None, analyze=audio.analyze, stdin=sys.stdin, stdout=sys.stdout):
    request = json.load(stdin)
    title, path = request['title'], request.get('recording')
    full = os.path.expanduser(path) if path else None
    if not full or not os.path.isfile(full):
        _fail(f'{title}: no recording at the given path')
    try:
        print(f'{title}: reading {os.path.basename(full)}', file=sys.stderr)
        analysis = analyze(full, cache_file(audio.CACHE_DIR, title, full))
    except Exception as error:
        _fail(f'{title}: cannot read the recording ({error})')
    chart = request.get('chart')
    signature = request.get('timeSignature') or (chart or {}).get('timeSignature') or '4/4'
    key = request.get('key') or (chart or {}).get('key') or key_from_analysis(analysis)
    bpm = request.get('bpm') or (chart or {}).get('bpm') or fold_bpm(analysis['bpm'])
    answer = {'recording': os.path.basename(full), 'duration': analysis['duration'],
              'key': key, 'bpm': bpm, 'timeSignature': signature,
              'tuning': analysis['tuning']}
    if chart:
        entry = dict(chart, key=key, bpm=bpm, timeSignature=signature,
                     beatsPerBar=chart.get('beatsPerBar') or beats_per_bar(signature))
        today = datetime.date.today().isoformat()
        # the same cache file, so the record is read once
        cached = lambda _path, _cache: analysis   # noqa: E731
        answer.update(route='chart', check=check_song(entry, full, cached, audio.CACHE_DIR, today))
    else:
        bars = record_bars(analysis, key, beats_per_bar(signature))
        lines = request.get('chordLines')
        if lines:
            answer.update(route='words', **line_up(lines, bars, key))
        else:
            sections, form = parts([bar['text'] for bar in bars])
            answer.update(route='record', sections=sections, form=form,
                          evidence=unsure_evidence(sections))
    stdout.write(json.dumps(answer, ensure_ascii=False) + '\n')
    return answer


if __name__ == '__main__':
    main()
