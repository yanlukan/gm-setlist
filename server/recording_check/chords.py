"""Chord names: parse the chart's and BTC's spellings, compare, spell, shift."""
import re
from dataclasses import dataclass

NO_CHORD = {'N', 'N.C.', 'NC', 'X'}
SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
FLAT_KEYS = {'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
             'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'}
LETTERS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
DEGREES = {1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9}
SUFFIX = {'maj': '', 'min': 'm', 'dim': 'dim', 'aug': 'aug', 'sus': 'sus4', 'power': '5'}

_ROOT = re.compile(r'^([A-G])([#b]?)(.*)$')
_QUALITY = re.compile(r'^(?:maj|min|dim|hdim|aug|sus|add|m|M|\+|°|ø|\d|[#b]|\([^)]*\)|-)*$')
_NOTE = re.compile(r'^([A-G])([#b]?)$')
_DEGREE = re.compile(r'^([#b]?)(\d{1,2})$')
_HALF_DIM = re.compile(r'^(m|min)7\(?b5\)?$')


@dataclass(frozen=True)
class Chord:
    """A chord as root and bass pitch classes (C = 0) and a kind."""
    root: int
    kind: str
    bass: int


NONE = Chord(-1, 'none', -1)


def _kind(rest: str) -> str:
    """The chord's class; 6ths, 7ths, 9ths and other extensions are ignored."""
    if rest.startswith(('dim', 'hdim', 'ø', '°')) or _HALF_DIM.match(rest):
        return 'dim'
    if rest.startswith(('aug', '+')):
        return 'aug'
    if 'sus' in rest:
        return 'sus'
    if rest == '5':
        return 'power'
    if rest.startswith('m') and not rest.startswith('maj'):
        return 'min'
    return 'maj'


def _bass(text: str, root: int):
    """A bass written as a note name (chart) or a scale degree (BTC)."""
    note = _NOTE.match(text)
    if note:
        return (LETTERS[note.group(1)] + _accidental(note.group(2))) % 12
    degree = _DEGREE.match(text)
    if degree and int(degree.group(2)) in DEGREES:
        return (root + DEGREES[int(degree.group(2))] + _accidental(degree.group(1))) % 12
    return None


def _accidental(sign: str) -> int:
    return {'#': 1, 'b': -1}.get(sign, 0)


def parse(symbol: str):
    """Read a chord name from the chart or from BTC; None if it is not a chord."""
    text = symbol.strip()
    if text in NO_CHORD:
        return NONE
    text, _, bass_text = text.partition('/')
    match = _ROOT.match(text.replace(':', '', 1) if ':' in text else text)
    if not match:
        return None
    letter, sign, rest = match.groups()
    if not _QUALITY.match(rest):
        return None
    root = (LETTERS[letter] + _accidental(sign)) % 12
    bass = root
    if bass_text:
        bass = _bass(bass_text, root)
        if bass is None:
            return None
    return Chord(root, _kind(rest), bass)


def same(a: Chord, b: Chord) -> bool:
    """Equal root, kind and bass."""
    return a == b


def shift(chord: Chord, semitones: int) -> Chord:
    """The chord moved by semitones; no chord stays no chord."""
    if chord.kind == 'none':
        return chord
    return Chord((chord.root + semitones) % 12, chord.kind, (chord.bass + semitones) % 12)


def spell(chord: Chord, key: str) -> str:
    """A plain chord name using the key's sharps or flats."""
    if chord.kind == 'none':
        return 'N.C.'
    names = FLAT_NAMES if key in FLAT_KEYS else SHARP_NAMES
    name = names[chord.root] + SUFFIX[chord.kind]
    return name if chord.bass == chord.root else name + '/' + names[chord.bass]
