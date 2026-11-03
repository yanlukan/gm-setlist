"""A beat counts against the chart only when the record's own sound backs BTC's reading."""
import unittest

from recording_check.chords import parse
from recording_check.second_opinion import gate

HOP = 0.05


def sound(chroma, bass, seconds=2.0):
    """A record whose chroma holds `chroma` (pc -> weight) and whose bass is pitch class `bass`."""
    frames = int(seconds / HOP)
    row = [chroma.get(pc, 0.0) for pc in range(12)]
    bass_row = [1.0 if pc == bass else 0.05 for pc in range(12)]
    return {'hop': HOP, 'chroma': [row] * frames, 'bass': [bass_row] * frames}


def slots(*items):
    return [{'chord': c, 'start': s, 'length': n} for c, s, n in items]


def beats(*names, conf=0.9):
    return [(parse(n), conf) for n in names]


B_GSM = slots(('B', 0, 0.5), ('G#m', 0.5, 0.5))
CSM = slots(('C#m', 0, 1))


class GateTests(unittest.TestCase):
    def test_agreeing_beats_are_untouched(self):
        out = gate(sound({11: 1, 3: 1, 6: 1}, 11), 0, 2, beats('B', 'B', 'G#m', 'G#m'), B_GSM, 0)
        self.assertEqual([c for _, c in out], [0.9] * 4)

    def test_a_third_the_record_does_not_sound_does_not_count(self):
        # BTC says C# where the chart has C#m, but neither E nor E# sounds: C# and G# only
        out = gate(sound({1: 1.0, 8: 0.4, 2: 0.45}, 1), 0, 2, beats('C#m', 'C#', 'C#', 'C#'), CSM, 0)
        self.assertEqual([c for _, c in out], [0.9, 0, 0, 0])

    def test_a_third_the_record_sounds_counts(self):
        out = gate(sound({1: 1.0, 8: 0.6, 5: 0.8}, 1), 0, 2, beats('C#', 'C#', 'C#', 'C#'), CSM, 0)
        self.assertEqual([c for _, c in out], [0.9] * 4)

    def test_the_bass_backs_a_slash_chord(self):
        # Faith's walk-down: the chroma fits B and F# alike, the bass is on A#
        faith = {10: 1.0, 11: 0.74, 9: 0.61, 3: 0.51, 6: 0.49, 8: 0.48, 2: 0.38, 1: 0.22}
        out = gate(sound(faith, 10), 0.5, 1.0, beats('F#/A#'), slots(('B', 0, 1)), 0)
        self.assertEqual(out[0][1], 0.9)

    def test_a_beat_where_the_chart_has_no_chord_does_not_count(self):
        out = gate(sound({6: 1, 10: 1, 1: 1}, 6), 0, 2, beats('F#', 'F#', 'F#', 'F#'),
                   slots(('F#', 0, 0.5), ('N.C.', 0.5, 0.5)), 0)
        self.assertEqual([c for _, c in out], [0.9, 0.9, 0, 0])

    def test_the_chart_is_compared_at_the_record_pitch(self):
        # the record is a semitone up: its C sounds, read back as B against a chart with E
        out = gate(sound({0: 1, 4: 1, 7: 1}, 0), 0, 2, beats('B', 'B', 'B', 'B'), slots(('E', 0, 1)), 1)
        self.assertEqual([c for _, c in out], [0.9] * 4)
        out = gate(sound({5: 1, 9: 1, 0: 1}, 5), 0, 2, beats('B', 'B', 'B', 'B'), slots(('E', 0, 1)), 1)
        self.assertEqual([c for _, c in out], [0] * 4)


if __name__ == '__main__':
    unittest.main()
