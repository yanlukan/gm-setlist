"""One chord-fit measure for the line-up, the beat reading and the second opinion."""
import unittest

from recording_check.chords import parse
from recording_check.fit import BASS_WEIGHT, chord_fit


class FitTests(unittest.TestCase):
    def test_one_row_and_many_rows_agree(self):
        chroma = [1.0 if pc in (0, 4, 7) else 0.0 for pc in range(12)]
        bass = [1.0 if pc == 0 else 0.0 for pc in range(12)]
        self.assertAlmostEqual(chord_fit(parse('C'), chroma, bass), 1.0)
        rows = chord_fit(parse('C'), [chroma, [0.0] * 12], [bass, [0.0] * 12])
        self.assertAlmostEqual(rows[0], 1.0)
        self.assertEqual(rows[1], 0.0)

    def test_the_bass_weighs_bass_weight(self):
        chroma = [1.0 if pc in (0, 4, 7) else 0.0 for pc in range(12)]
        bass = [1.0 if pc == 4 else 0.0 for pc in range(12)]
        self.assertAlmostEqual(chord_fit(parse('C'), chroma, bass), 1 - BASS_WEIGHT)
        self.assertAlmostEqual(chord_fit(parse('C/E'), chroma, bass), 1.0)
        self.assertAlmostEqual(chord_fit(parse('C'), chroma), 1.0)


if __name__ == '__main__':
    unittest.main()
