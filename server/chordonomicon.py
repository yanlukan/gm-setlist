"""
Chordonomicon search service.
Downloads the 666K song chord dataset, indexes it by Spotify ID,
and provides search via Spotify's public oEmbed endpoint.
"""
import json
import os
import re
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
INDEX_PATH = os.path.join(DATA_DIR, 'chordonomicon-index.json')


def parse_chords(raw: str) -> list[dict]:
    """Parse Chordonomicon chord string into sections.

    Input:  '<intro_1> C G <verse_1> Am F C G ...'
    Output: [{'name': 'Intro', 'chords': 'C  G'}, {'name': 'Verse', 'chords': 'Am  F  C  G'}, ...]
    """
    sections = []
    current_name = None
    current_chords: list[str] = []

    # Normalize chord names: Amin -> Am, Csmin -> C#m, etc.
    def normalize_chord(c: str) -> str:
        # Handle sharp notation: Cs -> C#, Fs -> F#, etc.
        c = re.sub(r'^([A-G])s(?=[a-z]|$)', r'\1#', c)
        # Handle slash chords with sharp: A/Cs -> A/C#
        c = re.sub(r'/([A-G])s$', r'/\1#', c)
        # Amin -> Am, Emin -> Em
        c = c.replace('min', 'm')
        # maj -> maj (keep as is)
        # dim, aug, sus already fine
        # no3d -> no3 (uncommon, keep as is)
        return c

    section_names = {
        'intro': 'Intro', 'verse': 'Verse', 'chorus': 'Chorus',
        'bridge': 'Bridge', 'solo': 'Solo', 'outro': 'Outro',
        'prechorus': 'Pre-Chorus', 'pre_chorus': 'Pre-Chorus',
        'interlude': 'Interlude', 'instrumental': 'Instrumental',
    }

    tokens = raw.split()
    for token in tokens:
        # Section marker like <verse_1>, <chorus_2>
        m = re.match(r'<(\w+?)_\d+>', token)
        if m:
            # Save previous section
            if current_name and current_chords:
                sections.append({
                    'name': current_name,
                    'chords': '  '.join(current_chords),
                })
            base = m.group(1).lower()
            current_name = section_names.get(base, base.title())
            current_chords = []
        else:
            # It's a chord
            current_chords.append(normalize_chord(token))

    # Save last section
    if current_name and current_chords:
        sections.append({
            'name': current_name,
            'chords': '  '.join(current_chords),
        })

    return sections


def build_index():
    """Download Chordonomicon and build a Spotify ID -> sections index."""
    os.makedirs(DATA_DIR, exist_ok=True)

    print("Loading Chordonomicon dataset from HuggingFace...")
    from datasets import load_dataset
    ds = load_dataset('ailsntua/Chordonomicon', split='train')

    index = {}
    skipped = 0
    for row in ds:
        sid = row.get('spotify_song_id')
        if not sid or sid == 'None':
            skipped += 1
            continue

        sections = parse_chords(row['chords'])
        if not sections:
            skipped += 1
            continue

        index[sid] = {
            'sections': sections,
            'genre': row.get('main_genre') or '',
            'decade': int(row['decade']) if row.get('decade') else None,
            'artist_spotify_id': row.get('spotify_artist_id') or '',
        }

    print(f"Indexed {len(index)} songs ({skipped} skipped)")

    with open(INDEX_PATH, 'w') as f:
        json.dump(index, f, separators=(',', ':'))

    size_mb = os.path.getsize(INDEX_PATH) / (1024 * 1024)
    print(f"Index saved to {INDEX_PATH} ({size_mb:.1f} MB)")


def load_index() -> dict:
    """Load the pre-built index."""
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(
            f"Index not found at {INDEX_PATH}. Run: python chordonomicon.py build"
        )
    with open(INDEX_PATH) as f:
        return json.load(f)


def lookup(spotify_id: str, index: dict) -> dict | None:
    """Look up a song by Spotify track ID."""
    return index.get(spotify_id)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python chordonomicon.py build     - Build the index from HuggingFace")
        print("  python chordonomicon.py lookup <spotify_id>  - Look up a song")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == 'build':
        build_index()
    elif cmd == 'lookup' and len(sys.argv) >= 3:
        idx = load_index()
        result = lookup(sys.argv[2], idx)
        if result:
            print(json.dumps(result, indent=2))
        else:
            print("Not found")
    else:
        print(f"Unknown command: {cmd}")
