"""Tests for when the record's chord agrees with a chart chord it is not equal to."""
import unittest

from recording_check.agree import agrees
from recording_check.chords import parse
from recording_check.tests.test_verdict import play, slots
from recording_check.verdict import bar_finding


def agree(record, chart):
    return agrees(parse(record), parse(chart), chart)


class SlashChordTests(unittest.TestCase):
    def test_a_slash_chord_agrees_with_its_bass_chord_a_fifth_below(self):
        self.assertTrue(agree('C', 'G/C'))
        self.assertTrue(agree('Cmaj7', 'G/C'))
        self.assertTrue(agree('D', 'A/D'))

    def test_only_when_the_upper_chord_is_a_fifth_above(self):
        self.assertFalse(agree('C#', 'A/C#'))   # A over its own third: not a fifth above
        self.assertFalse(agree('D', 'G/C'))

    def test_a_bar_of_g_over_c_read_as_c_is_no_finding(self):
        self.assertIsNone(bar_finding(slots(('G/C', 0, 1)), [play('C', 'C', 'C', 'C')] * 2, 'G'))


class InversionTests(unittest.TestCase):
    def test_a_bass_on_the_chords_own_third_or_fifth_agrees(self):
        self.assertTrue(agree('Gm/Bb', 'Gm9'))
        self.assertTrue(agree('D/F#', 'D'))
        self.assertTrue(agree('Abm/B', 'Abm6'))
        self.assertTrue(agree('Am/E', 'Am'))

    def test_another_root_or_kind_or_bass_still_differs(self):
        self.assertFalse(agree('F#/A#', 'B'))   # Faith: A# is not one of B's tones
        self.assertFalse(agree('A/C#', 'D'))    # Last Christmas
        self.assertFalse(agree('Gm/A', 'Gm'))
        self.assertFalse(agree('G/Bb', 'Gm'))

    def test_faith_walk_down_still_flags(self):
        chart = slots(('B', 0, 0.5), ('G#m', 0.5, 0.5))
        self.assertEqual(bar_finding(chart, [play('B', 'F#/A#', 'G#m', 'G#m')] * 3, 'B').kind, 'chord')

    def test_last_christmas_a_over_c_sharp_still_flags(self):
        chart = slots(('D', 0, 1))
        self.assertEqual(bar_finding(chart, [play('D', 'D', 'A/C#', 'A/C#')] * 3, 'D').kind, 'chord')


if __name__ == '__main__':
    unittest.main()
