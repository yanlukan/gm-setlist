"""
Resolve all Chordonomicon Spotify IDs to song titles/artists.
Uses individual track lookups at 2 req/s (conservative, avoids rate limits).
275K songs at 2 req/s = ~38 hours. Saves progress every 500 songs so it can resume.

Usage:
  cd server
  source .env && export SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET
  .venv/bin/python3 build-song-db.py
"""
import json
import os
import sys
import time
import base64
import urllib.request
import urllib.error

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
INDEX_PATH = os.path.join(DATA_DIR, 'chordonomicon-index.json')
OUTPUT_PATH = os.path.join(DATA_DIR, 'songs-db.json')
PROGRESS_PATH = os.path.join(DATA_DIR, 'songs-db-progress.json')

CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID', '')
CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET', '')

REQUEST_DELAY = 0.5  # 2 requests/second — conservative


def get_token() -> str:
    creds = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
    req = urllib.request.Request(
        'https://accounts.spotify.com/api/token',
        data=b'grant_type=client_credentials',
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': f'Basic {creds}',
        },
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data['access_token']


def fetch_track(token: str, sid: str) -> dict | None:
    url = f'https://api.spotify.com/v1/tracks/{sid}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry_after = int(e.headers.get('Retry-After', 30))
            if retry_after > 3600:
                print(f'\n  BANNED for {retry_after}s ({retry_after//3600}h). Saving progress and exiting.')
                print(f'  Run again after the ban expires.')
                return 'BANNED'
            print(f'\n  Rate limited — waiting {retry_after}s...')
            time.sleep(retry_after + 1)
            return fetch_track(token, sid)
        elif e.code == 401:
            return 'REAUTH'
        elif e.code == 404:
            return None
        else:
            print(f'\n  HTTP {e.code} for {sid} — skipping')
            return None


def save_progress(resolved, next_index):
    with open(PROGRESS_PATH, 'w') as f:
        json.dump({'resolved': resolved, 'next_index': next_index}, f)


def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars')
        sys.exit(1)

    print('Loading chord index...')
    with open(INDEX_PATH) as f:
        chord_index = json.load(f)

    all_ids = list(chord_index.keys())
    total = len(all_ids)
    print(f'{total} songs to resolve')

    # Resume from progress
    resolved = {}
    start_from = 0
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH) as f:
            progress = json.load(f)
            resolved = progress.get('resolved', {})
            start_from = progress.get('next_index', 0)
        print(f'Resuming from index {start_from} ({len(resolved)} already resolved)')

    token = get_token()
    token_time = time.time()
    start_time = time.time()
    errors = 0

    for i in range(start_from, total):
        sid = all_ids[i]

        # Refresh token every 50 minutes
        if time.time() - token_time > 3000:
            print('\n  Refreshing token...')
            token = get_token()
            token_time = time.time()

        track = fetch_track(token, sid)

        if track == 'BANNED':
            save_progress(resolved, i)
            sys.exit(1)

        if track == 'REAUTH':
            token = get_token()
            token_time = time.time()
            track = fetch_track(token, sid)
            if track in ('BANNED', 'REAUTH'):
                save_progress(resolved, i)
                sys.exit(1)

        if track and isinstance(track, dict):
            resolved[sid] = {
                't': track['name'],
                'a': ', '.join(a['name'] for a in track['artists']),
            }
        else:
            errors += 1

        # Progress every 500
        if (i + 1) % 500 == 0 or i == total - 1:
            elapsed = time.time() - start_time
            done = i + 1 - start_from
            rate = done / max(elapsed, 1)
            eta_hours = (total - i - 1) / max(rate, 0.1) / 3600
            pct = (i + 1) * 100 // total
            print(f'  {pct}% — {len(resolved)}/{total} resolved, {errors} errors, {rate:.1f} req/s, ETA ~{eta_hours:.1f}h')
            save_progress(resolved, i + 1)

        time.sleep(REQUEST_DELAY)

    # Build final database
    print('\nBuilding final database...')
    songs_db = []
    for sid, chord_entry in chord_index.items():
        meta = resolved.get(sid)
        if not meta:
            continue
        songs_db.append({
            't': meta['t'],
            'a': meta['a'],
            's': chord_entry['sections'],
            'g': chord_entry.get('genre', ''),
        })

    songs_db.sort(key=lambda x: x['t'].lower())

    with open(OUTPUT_PATH, 'w') as f:
        json.dump(songs_db, f, separators=(',', ':'))

    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f'Done! {len(songs_db)} songs saved to {OUTPUT_PATH} ({size_mb:.1f} MB)')

    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)


if __name__ == '__main__':
    main()
