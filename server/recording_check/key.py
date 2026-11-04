"""A song's key and tempo read off the recording alone, for a song with no chart.

The key is the Krumhansl-Schmuckler estimate: the song's summed chroma is correlated
with the Krumhansl-Kessler major and minor profiles on every tonic, and the best of
the 24 wins (ties go to the first: majors before minors, C upward). Keys are named
the usual way: sharps for C G D A E B F# and their relative minors, flats for
F Bb Eb Ab Db and theirs.

The tempo is the beat tracker's, doubled or halved into [70, 140) bpm: a tracker
often counts in half or double time, and the player fixes a wrong fold in More.
"""
import numpy as np

MAJOR_PROFILE = (6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88)
MINOR_PROFILE = (6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17)
MAJOR_NAMES = ('C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B')
MINOR_NAMES = ('Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm')
SLOWEST = 70     # folded tempo range, slowest included
FASTEST = 140    # fastest excluded


def _correlation(a, b):
    a, b = a - a.mean(), b - b.mean()
    norm = float(np.sqrt((a * a).sum() * (b * b).sum()))
    return float((a * b).sum()) / norm if norm > 0 else 0.0


def key_of(chroma_total) -> str:
    """The key of 12 summed chroma values (C upward); no energy at all reads as C."""
    chroma = np.asarray(chroma_total, dtype=float)
    best, best_score = MAJOR_NAMES[0], -np.inf
    for profile, names in ((MAJOR_PROFILE, MAJOR_NAMES), (MINOR_PROFILE, MINOR_NAMES)):
        for tonic in range(12):
            score = _correlation(chroma, np.roll(np.asarray(profile), tonic))
            if score > best_score + 1e-12:
                best, best_score = names[tonic], score
    return best


def key_from_analysis(analysis) -> str:
    """key_of over every frame's chroma."""
    frames = np.asarray(analysis['chroma'], dtype=float)
    return key_of(frames.sum(axis=0) if frames.size else np.zeros(12))


def fold_bpm(bpm: float) -> int:
    """The tracker's tempo doubled or halved into [70, 140), rounded."""
    bpm = float(bpm)
    if not bpm > 0:
        raise ValueError(f'no tempo to fold: {bpm}')
    while bpm >= FASTEST:
        bpm /= 2
    while bpm < SLOWEST:
        bpm *= 2
    out = int(round(bpm))
    return out // 2 if out >= FASTEST else out   # 139.6 rounds out of range: half of 140
