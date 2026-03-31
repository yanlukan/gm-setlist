"""
Resolve Chordonomicon Spotify IDs to song titles using a user OAuth token.
Safe rate: 1 request per second (well under Spotify's limits).
Saves progress every 200 songs. Resumable.

Usage:
  .venv/bin/python3 resolve-chordonomicon.py <spotify_user_token>
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
INDEX_PATH = os.path.join(DATA_DIR, 'chordonomicon-index.json')
OUTPUT_PATH = os.path.join(DATA_DIR, 'songs-db-full.json')
PROGRESS_PATH = os.path.join(DATA_DIR, 'resolve-progress.json')

DELAY = 1.0  # 1 request per second — very conservative


def fetch_track(token, sid):
    req = urllib.request.Request(
        f'https://api.spotify.com/v1/tracks/{sid}',
        headers={'Authorization': f'Bearer {token}'},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get('Retry-After', 30))
            print(f'\n  Rate limited! Waiting {retry}s...')
            time.sleep(retry + 1)
            return fetch_track(token, sid)
        elif e.code == 401:
            print('\n  Token expired. Save your progress and restart with a new token.')
            return 'EXPIRED'
        elif e.code == 404:
            return None
        else:
            return None
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        print('Usage: python resolve-chordonomicon.py <spotify_user_token>')
        sys.exit(1)

    token = sys.argv[1]

    print('Loading chord index...')
    with open(INDEX_PATH) as f:
        chord_index = json.load(f)

    all_ids = list(chord_index.keys())
    total = len(all_ids)

    # Resume
    resolved = {}
    start_from = 0
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH) as f:
            p = json.load(f)
            resolved = p.get('resolved', {})
            start_from = p.get('next', 0)
        print(f'Resuming from {start_from} ({len(resolved)} already done)')
    else:
        print(f'{total} songs to resolve at {DELAY}s/req')

    start_time = time.time()
    errors = 0

    for i in range(start_from, total):
        sid = all_ids[i]
        track = fetch_track(token, sid)

        if track == 'EXPIRED':
            # Save and exit
            with open(PROGRESS_PATH, 'w') as f:
                json.dump({'resolved': resolved, 'next': i}, f)
            print(f'Saved progress at {i}/{total} ({len(resolved)} resolved)')
            print('Get a new token and run again — it will resume.')
            sys.exit(0)

        if track and isinstance(track, dict):
            resolved[sid] = {
                't': track['name'],
                'a': ', '.join(a['name'] for a in track['artists']),
            }
        else:
            errors += 1

        # Progress every 200
        if (i + 1) % 200 == 0:
            elapsed = time.time() - start_time
            done = i + 1 - start_from
            rate = done / max(elapsed, 1)
            remaining = total - i - 1
            eta_h = remaining / max(rate, 0.01) / 3600
            print(f'  {(i+1)*100//total}% | {len(resolved)}/{total} | {errors} errors | {rate:.1f}/s | ETA {eta_h:.1f}h')
            with open(PROGRESS_PATH, 'w') as f:
                json.dump({'resolved': resolved, 'next': i + 1}, f)

        time.sleep(DELAY)

    # Build final DB
    print('\nBuilding final database...')
    songs_db = []
    for sid, entry in chord_index.items():
        meta = resolved.get(sid)
        if not meta:
            continue
        songs_db.append({
            't': meta['t'],
            'a': meta['a'],
            's': entry['sections'],
            'g': entry.get('genre', ''),
        })
    songs_db.sort(key=lambda x: x['t'].lower())

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(songs_db, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f'Done! {len(songs_db)} songs saved ({size_mb:.1f} MB)')

    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)


if __name__ == '__main__':
    main()
