"""Check the charts against the player's own recordings.

Usage, from server/:
  $PY check_recording.py [--song "<title>"] [--charts recording_check/charts.json]
See recording_check/README.md.
"""
import argparse
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from recording_check import audio  # noqa: E402
from recording_check.check import check_song  # noqa: E402
from recording_check.report import report  # noqa: E402


def _args(argv):
    parser = argparse.ArgumentParser(description='Line the charts up with the recordings.')
    parser.add_argument('--song', help='check only this title; the others keep their last result')
    parser.add_argument('--charts', default=os.path.join(HERE, 'recording_check', 'charts.json'))
    parser.add_argument('--recordings', default=os.path.join(HERE, 'recording_check', 'recordings.local.json'))
    parser.add_argument('--out', default=os.path.join(HERE, '..', 'app', 'src', 'data', 'recording-check.json'))
    parser.add_argument('--report', default=os.path.join(HERE, '..', 'docs', 'recording-check', 'report.md'))
    parser.add_argument('--cache', default=audio.CACHE_DIR)
    return parser.parse_args(argv)


def _read(path, default):
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


def _write(path, text):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text)


def main(argv=None, analyze=audio.analyze):
    args = _args(argv)
    charts = _read(args.charts, [])
    recordings = _read(args.recordings, {})
    if args.song and not any(c['title'] == args.song for c in charts):
        sys.exit(f'No chart is called {args.song!r}.')
    today = datetime.date.today().isoformat()
    earlier = _read(args.out, {}) if args.song else {}
    results = {}
    for chart in charts:
        title = chart['title']
        if args.song and title != args.song:
            if title in earlier:
                results[title] = earlier[title]
            continue
        entry = check_song(chart, recordings.get(title), analyze, args.cache, today)
        kinds = [b['kind'] for b in entry['bars']]
        print(f"{title}: {entry['verdict']}, shift {entry['shift']:+d}, "
              f"{kinds.count('chord')} chord, {kinds.count('rhythm')} rhythm", file=sys.stderr)
        results[title] = entry
    shipped = {t: {k: v for k, v in e.items() if k != 'score'} for t, e in results.items()}
    _write(args.out, json.dumps(shipped, indent=1, ensure_ascii=False) + '\n')
    _write(args.report, report(results))
    return results


if __name__ == '__main__':
    main()
