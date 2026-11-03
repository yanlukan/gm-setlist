"""Chord names: parse the chart's and BTC's spellings, compare, spell, shift."""
import re
from dataclasses import dataclass, field

NO_CHORD = {'N', 'N.C.', 'NC', 'X'}
SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
LETTER_ORDER = 'CDEFGAB'
MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]
FLAT_OFFSETS = {3, 8, 10}   # b3, b6, b7 of the major key on the same tonic
MINOR_FLAT_OFFSETS = FLAT_OFFSETS | {1}   # a minor key also flats its b2 (Bb in Am)
LETTERS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
DEGREES = {1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 2, 11: 5, 13: 9}
SUFFIX = {'maj': '', 'min': 'm', 'dim': 'dim', 'aug': 'aug', 'power': '5'}
TONES = {'maj': (0, 4, 7), 'min': (0, 3, 7), 'dim': (0, 3, 6), 'aug': (0, 4, 8),
         'sus': (0, 5, 7), 'power': (0, 7)}   # intervals of each chord class (sus4)

_ROOT = re.compile(r'^([A-G])([#b]?)(.*)$')
_QUALITY = re.compile(r'^(?:maj|min|dim|hdim|aug|sus|add|m|M|\+|°|ø|\d|[#b]\d{1,2}|\([^)]*\)|-)*$')
_NOTE = re.compile(r'^([A-G])([#b]?)$')
_DEGREE = re.compile(r'^([#b]?)(\d{1,2})$')
_HALF_DIM = re.compile(r'^(m|min)7\(?b5\)?$')


@dataclass(frozen=True)
class Chord:
    """A chord as root and bass pitch classes (C = 0) and a kind."""
    root: int
    kind: str
    bass: int
    sus: int = field(default=4, compare=False)   # 2 or 4, only used to spell a sus chord


NONE = Chord(-1, 'none', -1)


def _kind(rest: str) -> str:
    """The chord's class; 6ths, 7ths, 9ths and other extensions are ignored."""
    if rest.startswith(('dim', 'hdim', 'ø', '°')) or _HALF_DIM.match(rest):
        return 'dim'
    if rest.startswith(('aug', '+')) or '+' in rest or re.search(r'#5(?!\d)', rest):
        return 'aug'
    if 'sus' in rest:
        return 'sus'
    if rest == '5':
        return 'power'
    if rest.startswith('-') or rest.startswith('m') and not rest.startswith('maj'):
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
    if text.endswith('6') and bass_text == '9':
        bass_text = ''
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
    return Chord(root, _kind(rest), bass, 2 if 'sus2' in rest else 4)


def same(a: Chord, b: Chord) -> bool:
    """Equal root, kind and bass."""
    return a == b


def tones(chord: Chord) -> set:
    """The chord's pitch classes (root, third or sus note, fifth); none for no chord."""
    if chord.kind == 'none':
        return set()
    intervals = (0, 2, 7) if chord.kind == 'sus' and chord.sus == 2 else TONES[chord.kind]
    return {(chord.root + t) % 12 for t in intervals}


def shift(chord: Chord, semitones: int) -> Chord:
    """The chord moved by semitones; no chord stays no chord."""
    if chord.kind == 'none':
        return chord
    return Chord((chord.root + semitones) % 12, chord.kind, (chord.bass + semitones) % 12, chord.sus)


def _key_names(key: str) -> list:
    """Pitch class -> note name for a key: its own scale first, then b3/b6/b7 flat, else sharp."""
    match = re.match(r'^([A-G])([#b]?)(m?)$', key)
    letter, sign, minor = match.groups() if match else ('C', '', '')
    tonic = (LETTERS[letter] + _accidental(sign)) % 12
    names = [None] * 12
    scale = MINOR_SCALE if minor else MAJOR_SCALE
    first = LETTER_ORDER.index(letter)
    for i, offset in enumerate(scale):
        pc = (tonic + offset) % 12
        note = LETTER_ORDER[(first + i) % 7]
        diff = (pc - LETTERS[note] + 6) % 12 - 6
        names[pc] = note + {-1: 'b', 0: '', 1: '#'}.get(diff, '?')
    if minor:   # the raised 7th is part of a minor key's chords
        pc = (tonic + 11) % 12
        if names[pc] is None:
            note = LETTER_ORDER[(first + 6) % 7]
            diff = (pc - LETTERS[note] + 6) % 12 - 6
            names[pc] = note + {-1: 'b', 0: '', 1: '#'}.get(diff, '?')
    flats = MINOR_FLAT_OFFSETS if minor else FLAT_OFFSETS
    for pc in range(12):
        if names[pc] is None or '?' in names[pc]:
            names[pc] = (FLAT_NAMES if (pc - tonic) % 12 in flats else SHARP_NAMES)[pc]
    return names


def spell(chord: Chord, key: str) -> str:
    """A plain chord name using the key's own spelling."""
    if chord.kind == 'none':
        return 'N.C.'
    names = _key_names(key)
    suffix = ('sus' + str(chord.sus)) if chord.kind == 'sus' else SUFFIX[chord.kind]
    name = names[chord.root] + suffix
    return name if chord.bass == chord.root else name + '/' + names[chord.bass]
