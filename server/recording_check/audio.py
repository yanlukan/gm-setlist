"""Read one recording: beats, BTC chords, bass and chroma frames, tuning; cached as JSON.

The analysis is a plain dict so the line-up and the tests never need audio:
  tuning   cents the record sits off concert pitch (Faith about +34)
  bpm      the beat tracker's tempo, often double or half the chart's
  beats    beat times in seconds from the tracker
  hop      seconds between frames
  chroma   one 12-bin chroma per frame, tuned to the record (C = 0)
  bass     one 12-bin bass-band energy per frame, from a CQT from E1
  chords   BTC timeline [{chord, time, duration, confidence}], times on the record
  beat_chroma / beat_bass  the same, summed per tracker beat (for reading by hand)
  source   the recording's size and modified time: a replaced recording is read again
"""
import json
import os
import re
import sys
import tempfile

import numpy as np

SERVER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(SERVER, 'data', 'recording-check')


def _btc_server() -> str:
    """The server folder holding btc_chords.py and its btc/ model: $BTC_SERVER, this
    checkout's own server/ when it has the model, else the main checkout beside a worktree."""
    if os.environ.get('BTC_SERVER'):
        return os.environ['BTC_SERVER']
    if os.path.isdir(os.path.join(SERVER, 'btc', 'test')):
        return SERVER
    repo = os.path.dirname(SERVER)
    main = re.sub(r'-[^-/]+$', '', repo)   # cheetsheetForGuitarPlaying-rework -> cheetsheetForGuitarPlaying
    return os.path.join(main, 'server')
VERSION = 4          # bump when the frames change; BTC output is kept unless its own version changes
BTC_VERSION = 1
SR = 22050
HOP = 1024           # about 46 ms
BASS_FMIN = 'E1'
BASS_OCTAVES = 2     # E1 to about D#3: where a bass guitar's notes sit
BASS_BPO = 36        # three bins a semitone; only the centre bin is kept, so a note
                     # does not leak into its neighbours (12 bins a semitone did)


def slug(title: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')


def _fold(spectrum, first_pc, per_semitone=1):
    """CQT magnitudes (bins x frames) folded to 12 pitch-class energies, centre bins only."""
    out = np.zeros((12, spectrum.shape[1]))
    for i in range(0, spectrum.shape[0], per_semitone):
        out[(first_pc + i // per_semitone) % 12] += spectrum[i] ** 2
    return out


def _frames(y, sr, tuning_semis):
    import librosa
    harmonic = librosa.effects.harmonic(y, margin=2.0)
    # librosa's tuning is in fractions of one CQT bin, not of a semitone
    chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr, hop_length=HOP, bins_per_octave=36,
                                        tuning=tuning_semis * 3)
    cqt = np.abs(librosa.cqt(harmonic, sr=sr, hop_length=HOP, fmin=librosa.note_to_hz(BASS_FMIN),
                             n_bins=BASS_BPO * BASS_OCTAVES, bins_per_octave=BASS_BPO,
                             tuning=tuning_semis * BASS_BPO / 12))
    bass = _fold(cqt, 4, BASS_BPO // 12)   # E = 4
    n = min(chroma.shape[1], bass.shape[1])
    return chroma[:, :n].T, bass[:, :n].T


def _beats(path):
    import essentia.standard as es
    audio = es.MonoLoader(filename=path, sampleRate=44100)()
    bpm, beats, _, _, _ = es.RhythmExtractor2013(method='multifeature')(audio)
    return float(bpm), [float(b) for b in beats]


def _btc(y, sr, cents):
    """BTC on the record brought to concert pitch by playing it back slower or faster."""
    import soundfile as sf
    server = _btc_server()
    if not os.path.isfile(os.path.join(server, 'btc_chords.py')):
        raise FileNotFoundError(f'btc_chords.py is not in {server}: set $BTC_SERVER to the server '
                                'folder that holds btc_chords.py and its btc/ model')
    if server not in sys.path:
        sys.path.insert(0, server)
    from btc_chords import detect_chords
    ratio = 2 ** (-cents / 1200)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        name = tmp.name
    try:
        sf.write(name, y, int(round(sr * ratio)))
        chords = detect_chords(name)
    finally:
        os.unlink(name)
    for c in chords:   # back to the record's own clock
        c['time'] = round(c['time'] * ratio, 3)
        c['duration'] = round(c['duration'] * ratio, 3)
    return chords


def span(frames, hop, start, end):
    """Frames summed between two times, each frame weighted by its overlap."""
    frames = np.asarray(frames, dtype=float)
    out = np.zeros(frames.shape[1])
    first, last = int(np.floor(start / hop)), int(np.ceil(end / hop))
    for i in range(max(first, 0), min(last, len(frames))):
        overlap = min(end, (i + 1) * hop) - max(start, i * hop)
        if overlap > 0:
            out += frames[i] * overlap
    return out


def _per_beat(frames, hop, beats):
    edges = list(beats) + [beats[-1] + (beats[-1] - beats[-2] if len(beats) > 1 else 0.5)]
    return [np.round(span(frames, hop, a, b), 4).tolist() for a, b in zip(edges, edges[1:])]


def source_of(path) -> dict:
    """What tells one recording file from its replacement: its size and modified time."""
    stat = os.stat(path)
    return {'size': stat.st_size, 'mtime_ns': stat.st_mtime_ns}


def _usable_cache(path, cache_path) -> dict:
    """The cache when it is of this very recording, else {}. A cache of another file name
    (the cache is keyed by its stem) or of a replaced recording (another size or modified
    time) keeps nothing, not even BTC's chords. A cache written before recordings were
    stamped is taken as this recording's: it is trusted and stamped (analyze)."""
    if not os.path.exists(cache_path):
        return {}
    with open(cache_path) as f:
        cached = json.load(f)
    if cached.get('recording') not in (None, os.path.basename(path)):
        return {}
    if 'source' in cached and cached['source'] != source_of(path):
        return {}
    return cached


def _write(cache_path, analysis) -> bool:
    """Best effort, whole or not at all: a temporary file of its own in the cache folder
    (so runs writing the same cache at once never clash), then put in place. A cache
    that cannot be written (a read-only folder, a full disk) is left as it was and the
    analysis is still returned; no temporary file is left behind."""
    temporary = None
    try:
        folder = os.path.dirname(cache_path)
        os.makedirs(folder, exist_ok=True)
        handle, temporary = tempfile.mkstemp(dir=folder, suffix='.part')
        with os.fdopen(handle, 'w') as f:
            json.dump(analysis, f)
        os.chmod(temporary, 0o644)
        os.replace(temporary, cache_path)
        return True
    except OSError:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
        return False


def analyze(path: str, cache_path: str) -> dict:
    """The analysis of one recording, read from the cache when it is up to date."""
    cached = _usable_cache(path, cache_path)
    if cached.get('version') == VERSION:
        if 'source' not in cached:
            cached['source'] = source_of(path)
            _write(cache_path, cached)
        return cached
    analysis = _read(path, cached)
    analysis['source'] = source_of(path)
    if not _write(cache_path, analysis):   # never the folder: the repo's output is public
        print(f'{os.path.basename(path)}: the analysis could not be cached; it is read again next time',
              file=sys.stderr)
    return analysis


def _read(path, cached) -> dict:
    """The recording read afresh; BTC's chords are kept from `cached` (this recording's
    older cache) when BTC and the tuning are unchanged."""
    import librosa
    y, sr = librosa.load(path, sr=SR, mono=True)
    tuning = float(librosa.estimate_tuning(y=y, sr=sr))
    cents = round(tuning * 100, 1)
    chroma, bass = _frames(y, sr, tuning)
    bpm, beats = _beats(path)
    hop = HOP / SR
    if cached.get('btc_version') == BTC_VERSION and cached.get('tuning') == cents:
        chords = cached['chords']
    else:
        chords = _btc(y, sr, cents)
    analysis = {
        'version': VERSION, 'btc_version': BTC_VERSION, 'recording': os.path.basename(path),
        'duration': round(len(y) / sr, 3), 'tuning': cents, 'bpm': round(bpm, 2),
        'beats': [round(b, 3) for b in beats], 'hop': hop,
        'chroma': np.round(chroma, 4).tolist(), 'bass': np.round(bass / (bass.max() or 1), 5).tolist(),
        'chords': chords,
    }
    analysis['beat_chroma'] = _per_beat(analysis['chroma'], hop, beats)
    analysis['beat_bass'] = _per_beat(analysis['bass'], hop, beats)
    return analysis
