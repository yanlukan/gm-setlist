import unittest

import numpy as np

from recording_check.key import (MAJOR_PROFILE, MINOR_PROFILE, fold_bpm, fold_ratio, key_from_analysis,
                                 key_of)
from recording_check.tests.synthetic import analysis


def profile(values, tonic):
    return list(np.roll(np.asarray(values), tonic))


class KeyTest(unittest.TestCase):
    def test_major_and_minor_profiles(self):
        self.assertEqual(key_of(profile(MAJOR_PROFILE, 0)), 'C')
        self.assertEqual(key_of(profile(MINOR_PROFILE, 9)), 'Am')
        self.assertEqual(key_of(profile(MAJOR_PROFILE, 6)), 'F#')
        self.assertEqual(key_of(profile(MAJOR_PROFILE, 10)), 'Bb')

    def test_names_sharp_and_flat_keys(self):
        names = [key_of(profile(MAJOR_PROFILE, t)) for t in range(12)]
        self.assertEqual(names, ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])
        minors = [key_of(profile(MINOR_PROFILE, t)) for t in range(12)]
        self.assertEqual(minors, ['Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'])

    def test_silence_reads_as_c(self):
        self.assertEqual(key_of([0] * 12), 'C')

    def test_key_from_a_record(self):
        record = analysis(['G', 'G', 'C', 'C', 'D', 'D', 'G', 'G'] * 4)
        self.assertEqual(key_from_analysis(record), 'G')

    def test_fold_bpm(self):
        self.assertEqual(fold_bpm(192), 96)
        self.assertEqual(fold_bpm(48), 96)
        self.assertEqual(fold_bpm(70.4), 70)
        self.assertEqual(fold_bpm(139.6), 70)
        with self.assertRaises(ValueError):
            fold_bpm(0)


if __name__ == '__main__':
    unittest.main()

    def test_the_written_tempo_is_the_tracker_times_the_fold_and_in_range(self):
        for bpm in (139.4, 139.5, 139.6, 139.99, 140, 69.7, 69.75, 69.8, 70, 279.2, 34.9, 34.87, 279):
            ratio = fold_ratio(bpm)
            self.assertEqual(fold_bpm(bpm), round(bpm * ratio), bpm)
            self.assertTrue(70 <= fold_bpm(bpm) < 140, bpm)
            self.assertEqual(np.log2(ratio) % 1, 0, bpm)   # only doubled or halved
        self.assertEqual((fold_ratio(139.6), fold_ratio(69.75), fold_ratio(69.7)), (0.5, 1, 2))

    def test_a_given_tempo_folds_the_tracker_toward_it(self):
        self.assertEqual(fold_ratio(160, 160), 1)
        self.assertEqual(fold_ratio(80, 160), 2)
        self.assertEqual(fold_ratio(100, 45), 0.5)
        self.assertEqual(fold_ratio(100, 150), 2)     # nearest by ratio: 200 is 1.33x, 100 is 1.5x
        self.assertEqual(fold_ratio(100, 140), 1)
        for bad in (0, -5, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                fold_ratio(100, bad)
