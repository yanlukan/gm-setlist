"""Synthetic charts and recording analyses for the tests: no audio."""
import numpy as np

from recording_check.chords import parse

HOP = 0.05
TONES = {'maj': (0, 4, 7), 'min': (0, 3, 7), 'dim': (0, 3, 6), 'aug': (0, 4, 8),
         'sus': (0, 5, 7), 'power': (0, 7)}


def chart(title, bars, bpm=100, key='C', evidence=None, section_from=None):
    """A one-section chart (section 'A') played once through; bars are chord strings
    of equal-length slots, e.g. 'C' or 'F G'. evidence maps a bar index to Ear/Record."""
    evidence = evidence or {}
    out = []
    for i, text in enumerate(bars):
        names = text.split()
        slots = [{'chord': n, 'start': j / len(names), 'length': 1 / len(names)}
                 for j, n in enumerate(names)]
        out.append({'bar': i, 'chords': text, 'slots': slots, 'evidence': evidence.get(i)})
    return {'title': title, 'key': key, 'bpm': bpm, 'timeSignature': '4/4', 'beatsPerBar': 4,
            'chordsFrom': 'Book', 'sections': [{'name': 'A', 'from': section_from, 'bars': out}],
            'played': [{'section': 'A', 'bar': i} for i in range(len(bars))], 'skipped': None}


def analysis(beats_of_chords, bpm=100, lead=0.0, tail=2.0, shift=0, tracker=1.0, phase=0.0,
             confidence=0.9):
    """An analysis of a record playing one chord name per beat at bpm, after `lead`
    seconds of silence; the tracker reports `tracker` times the tempo, from `phase`."""
    beat = 60 / bpm
    total = lead + beat * len(beats_of_chords) + tail
    frames = int(np.ceil(total / HOP))
    chroma, bass = np.zeros((frames, 12)), np.zeros((frames, 12))
    timeline = []
    for i, name in enumerate(beats_of_chords):
        start = lead + i * beat
        chord = parse(name)
        first, last = int(round(start / HOP)), int(round((start + beat) / HOP))
        if chord.kind != 'none':
            for tone in TONES[chord.kind]:
                chroma[first:last, (chord.root + shift + tone) % 12] = 1.0
            bass[first:last, (chord.bass + shift) % 12] = 1.0
        timeline.append({'chord': name, 'time': start, 'duration': beat, 'confidence': confidence})
    period = beat / tracker
    beats = list(np.arange(phase, total, period))
    return {'tuning': 0.0, 'bpm': bpm * tracker, 'beats': beats, 'hop': HOP,
            'chroma': chroma.tolist(), 'bass': bass.tolist(), 'duration': total,
            'chords': [_shifted(c, shift) for c in timeline if parse(c['chord']).kind != 'none']}


def _shifted(entry, semitones):
    """A BTC timeline entry moved by semitones, written BTC's way (root:quality, no bass)."""
    from recording_check.chords import SHARP_NAMES
    chord = parse(entry['chord'])
    quality = {'maj': '', 'min': ':min', 'dim': ':dim', 'aug': ':aug', 'sus': ':sus4'}[chord.kind]
    return dict(entry, chord=SHARP_NAMES[(chord.root + semitones) % 12] + quality)
