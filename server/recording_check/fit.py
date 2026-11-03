"""How well a chord fits the record's sound: one measure for the line-up, the beat
reading and the second opinion."""
import numpy as np

from recording_check.chords import tones

BASS_WEIGHT = 0.3   # the bass read's part in a fit; the chroma has the rest


def chord_fit(chord, chroma, bass=None):
    """(1 - BASS_WEIGHT) x the cosine of the chroma with the chord's tones, plus
    BASS_WEIGHT x the bass band's share on the chord's bass. Without a bass, the cosine.

    chroma and bass are one 12-bin row, or one row per unit (then one fit per row).
    """
    chroma = np.atleast_2d(np.asarray(chroma, dtype=float))
    vector = np.zeros(12)
    vector[list(tones(chord))] = 1
    norms = np.linalg.norm(chroma, axis=1)
    cosine = np.divide(chroma @ vector, norms * np.linalg.norm(vector),
                       out=np.zeros(len(chroma)), where=norms > 0)
    if bass is None:
        out = cosine
    else:
        bass = np.atleast_2d(np.asarray(bass, dtype=float))
        totals = bass.sum(axis=1)
        share = np.divide(bass[:, chord.bass], totals, out=np.zeros(len(bass)), where=totals > 0)
        out = (1 - BASS_WEIGHT) * cosine + BASS_WEIGHT * share
    return float(out[0]) if out.shape[0] == 1 else out
