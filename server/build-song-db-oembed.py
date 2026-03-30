"""
Build song DB using Spotify oEmbed (no auth, no rate limit issues).
oEmbed returns title + thumbnail but NOT artist name.
We get artist names separately from the artist_spotify_id in the index.

Usage:
  cd server && .venv/bin/python3 build-song-db-oembed.py
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
import base64

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
INDEX_PATH = os.path.join(DATA_DIR, 'chordonomicon-index.json')
OUTPUT_PATH = os.path.join(DATA_DIR, 'songs-db.json')
PROGRESS_PATH = os.path.join(DATA_DIR, 'oembed-progress.json')

REQUEST_DELAY = 0.2  # 5 req/s for oEmbed — it's lenient


def oembed_title(sid: str) -> str | None:
    url = f'https://open.spotify.com/oembed?url=https://open.spotify.com/track/{sid}'
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get('title', '')
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get('Retry-After', 5))
            print(f'\n  oEmbed rate limit — waiting {retry}s')
            time.sleep(retry + 1)
            return oembed_title(sid)
        return None
    except Exception:
        return None


def oembed_artist(artist_id: str) -> str | None:
    url = f'https://open.spotify.com/oembed?url=https://open.spotify.com/artist/{artist_id}'
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get('title', '')
    except Exception:
        return None


def save_progress(resolved, artists_resolved, next_index):
    with open(PROGRESS_PATH, 'w') as f:
        json.dump({
            'resolved': resolved,
            'artists': artists_resolved,
            'next_index': next_index,
        }, f)


def main():
    print('Loading chord index...')
    with open(INDEX_PATH) as f:
        chord_index = json.load(f)

    all_ids = list(chord_index.keys())
    total = len(all_ids)
    print(f'{total} songs to resolve')

    # Resume
    resolved = {}
    artists_cache = {}
    start_from = 0
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH) as f:
            progress = json.load(f)
            resolved = progress.get('resolved', {})
            artists_cache = progress.get('artists', {})
            start_from = progress.get('next_index', 0)
        print(f'Resuming from {start_from} ({len(resolved)} resolved, {len(artists_cache)} artists cached)')

    start_time = time.time()
    errors = 0

    # Phase 1: Resolve song titles via oEmbed
    print('\n--- Phase 1: Resolving song titles ---')
    for i in range(start_from, total):
        sid = all_ids[i]
        title = oembed_title(sid)

        if title:
            # Also resolve artist if not cached
            artist_sid = chord_index[sid].get('artist_spotify_id', '')
            artist = artists_cache.get(artist_sid, '')
            if artist_sid and not artist:
                artist = oembed_artist(artist_sid) or ''
                if artist:
                    artists_cache[artist_sid] = artist
                time.sleep(REQUEST_DELAY)

            resolved[sid] = {'t': title, 'a': artist}
        else:
            errors += 1

        if (i + 1) % 500 == 0 or i == total - 1:
            elapsed = time.time() - start_time
            done = i + 1 - start_from
            rate = done / max(elapsed, 1)
            eta_hours = (total - i - 1) / max(rate, 0.1) / 3600
            pct = (i + 1) * 100 // total
            print(f'  {pct}% — {len(resolved)}/{total} songs, {len(artists_cache)} artists, {errors} errors, {rate:.1f}/s, ETA ~{eta_hours:.1f}h')
            save_progress(resolved, artists_cache, i + 1)

        time.sleep(REQUEST_DELAY)

    # Phase 2: Build final DB
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
