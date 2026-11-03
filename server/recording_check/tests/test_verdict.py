"""Tests for reading a played bar and for the bar and song verdicts."""
import unittest

from recording_check.chords import parse, shift
from recording_check.verdict import Finding, bar_finding, read_bar, song_verdict


def slots(*items):
    """Chart slots from (chord, start, length) triples."""
    return [{'chord': c, 'start': s, 'length': n} for c, s, n in items]


def play(*names, conf=0.9):
    """One played bar of per-beat (chord, confidence) pairs."""
    return [(parse(n), conf) for n in names]


B_GSM = slots(('B', 0, 0.5), ('G#m', 0.5, 0.5))
E_B = slots(('E', 0, 0.5), ('B', 0.5, 0.5))


class ReadBarTests(unittest.TestCase):
    def test_holds_and_changes(self):
        self.assertEqual(read_bar(B_GSM, play('B', 'B', 'G#m', 'G#m'), 'B'), 'B . G#m .')

    def test_a_passing_chord_is_written(self):
        beats = play('B', 'F#/A#', 'G#m', 'G#m')
        self.assertEqual(read_bar(B_GSM, beats, 'B'), 'B F#/A# G#m .')

    def test_agreeing_chord_keeps_chart_spelling(self):
        chart = slots(('Bbmaj9', 0, 0.5), ('Gm7', 0.5, 0.5))
        self.assertEqual(read_bar(chart, play('A#', 'A#', 'G:min', 'G:min'), 'Bb'), 'Bbmaj9 . Gm7 .')

    def test_readings_are_spelled_at_the_chart_pitch(self):
        # record played a semitone up, shifted back; chords the chart lacks use the key's spelling
        up = [(shift(c, -1), 0.9) for c, _ in play('C', 'C', 'Am', 'Am')]
        self.assertEqual(read_bar(B_GSM, up, 'B'), 'B . G#m .')
        other = play('D#', 'D#', 'A#:min', 'A#:min')
        self.assertEqual(read_bar(slots(('C', 0, 1)), other, 'Bb'), 'Eb . Bbm .')
        self.assertEqual(read_bar(slots(('C', 0, 1)), other, 'B'), 'D# . A#m .')

    def test_no_chord(self):
        self.assertEqual(read_bar(slots(('N.C.', 0, 1)), play('N', 'N'), 'C'), 'N.C. .')


class ChordFindingTests(unittest.TestCase):
    def test_a_missed_passing_chord_is_a_chord_finding(self):
        beats = play('B', 'F#/A#', 'G#m', 'G#m')
        f = bar_finding(B_GSM, [beats, beats], 'B', 0.5, 0.6)
        self.assertEqual(f.kind, 'chord')
        self.assertEqual(f.record, 'B F#/A# G#m .')
        self.assertAlmostEqual(f.confidence, 0.9)

    def test_a_different_chord_over_half_the_bar(self):
        beats = play('B', 'B', 'E', 'E')
        f = bar_finding(B_GSM, [beats] * 3, 'B', 0.5, 0.6)
        self.assertEqual((f.kind, f.record), ('chord', 'B . E .'))

    def test_one_play_out_of_three_is_not_enough(self):
        odd = play('B', 'F#/A#', 'G#m', 'G#m')
        ok = play('B', 'B', 'G#m', 'G#m')
        self.assertIsNone(bar_finding(B_GSM, [odd, ok, ok], 'B', 0.5, 0.6))

    def test_two_plays_out_of_three_is_enough(self):
        odd = play('B', 'F#/A#', 'G#m', 'G#m')
        ok = play('B', 'B', 'G#m', 'G#m')
        f = bar_finding(B_GSM, [odd, odd, ok], 'B', 0.5, 0.6)
        self.assertEqual(f.kind, 'chord')
        self.assertEqual(f.record, 'B F#/A# G#m .')

    def test_a_low_confidence_difference_is_not_a_finding(self):
        beats = play('B', 'B', 'E', 'E', conf=0.3)
        self.assertIsNone(bar_finding(B_GSM, [beats, beats], 'B', 0.5, 0.6))

    def test_extension_only_differences_agree(self):
        chart = slots(('Am', 0, 0.5), ('G6', 0.5, 0.5))
        beats = play('A:min7', 'A:min7', 'G:7', 'G:maj')
        self.assertIsNone(bar_finding(chart, [beats, beats], 'C', 0.5, 0.6))

    def test_a_short_run_that_is_not_passing_is_ignored(self):
        beats = play('B', 'B', 'G#m', 'E')   # last beat only, not flanked
        self.assertIsNone(bar_finding(B_GSM, [beats, beats], 'B', 0.5, 0.6))

    def test_a_neighbour_blip_is_not_passing(self):
        beats = play('B', 'E', 'B', 'G#m')   # B E B: neighbour note, not passing
        self.assertIsNone(bar_finding(slots(('B', 0, 0.5), ('G#m', 0.5, 0.5)), [beats] * 2, 'B', 0.5, 0.6))

    def test_slash_bass_difference_counts(self):
        chart = slots(('F#', 0, 1))
        beats = play('F#/A#', 'F#/A#', 'F#/A#', 'F#/A#')
        self.assertEqual(bar_finding(chart, [beats] * 2, 'B', 0.5, 0.6).kind, 'chord')

    def test_no_plays(self):
        self.assertIsNone(bar_finding(B_GSM, [], 'B', 0.5, 0.6))


class RhythmFindingTests(unittest.TestCase):
    def test_same_chords_on_other_beats_is_rhythm(self):
        late = play('E', 'E', 'E', 'B')
        f = bar_finding(E_B, [late, late, late], 'E', 0.5, 0.6)
        self.assertEqual((f.kind, f.record), ('rhythm', 'E . . B'))
        self.assertAlmostEqual(f.confidence, 0.9)

    def test_same_chords_on_the_same_beats_agree(self):
        ok = play('E', 'E', 'B', 'B')
        self.assertIsNone(bar_finding(E_B, [ok, ok], 'E', 0.5, 0.6))

    def test_a_minority_of_plays_is_not_rhythm(self):
        late = play('E', 'E', 'E', 'B')
        ok = play('E', 'E', 'B', 'B')
        self.assertIsNone(bar_finding(E_B, [late, ok, ok], 'E', 0.5, 0.6))

    def test_a_chord_difference_wins_over_rhythm(self):
        beats = play('E', 'E', 'A', 'A')
        self.assertEqual(bar_finding(E_B, [beats] * 2, 'E', 0.5, 0.6).kind, 'chord')


class FixRoundTests(unittest.TestCase):
    def test_a_low_confidence_beat_is_not_a_late_change(self):
        weak = [(parse('E'), .9), (parse('E'), .9), (parse('B'), .4), (parse('B'), .9)]
        self.assertIsNone(bar_finding(E_B, [weak] * 3, 'E', 0.5, 0.6))

    def test_a_record_with_no_chord_is_not_a_finding(self):
        silent = play('B', 'N', 'N', 'G#m')
        self.assertIsNone(bar_finding(B_GSM, [silent] * 3, 'B', 0.5, 0.6))
        fade = [(parse('B'), .9), (parse('B'), .9), (parse('N'), .9), (parse('N'), .9)]
        self.assertIsNone(bar_finding(B_GSM, [fade] * 3, 'B', 0.5, 0.6))
        shifted = play('E', 'E', 'N', 'N')
        self.assertIsNone(bar_finding(E_B, [shifted] * 3, 'E', 0.5, 0.6))

    def test_a_chord_heard_over_a_no_chord_bar_still_flags(self):
        chart = slots(('N.C.', 0, 1))
        beats = play('E', 'E', 'E', 'E')
        self.assertEqual(bar_finding(chart, [beats] * 2, 'E', 0.5, 0.6).kind, 'chord')
        self.assertIsNone(bar_finding(chart, [play('N', 'N', 'N', 'N')] * 2, 'E', 0.5, 0.6))

    def test_a_walking_bass_note_is_not_a_passing_chord(self):
        chart = slots(('C', 0, 1))
        beats = play('C', 'C/2', 'C/3', 'C')
        self.assertIsNone(bar_finding(chart, [beats] * 3, 'C', 0.5, 0.6))

    def test_a_bass_change_over_half_the_bar_still_flags(self):
        chart = slots(('C', 0, 1))
        beats = play('C', 'C/D', 'C/E', 'C/E')
        self.assertEqual(bar_finding(chart, [beats] * 3, 'C', 0.5, 0.6).kind, 'chord')

    def test_a_weak_beat_splits_a_run(self):
        beats = [(parse('B'), .9), (parse('E'), .9), (parse('E'), .3), (parse('E'), .9)]
        self.assertIsNone(bar_finding(B_GSM, [beats] * 3, 'B', 0.5, 0.6))
        beats = [(parse('B'), .9), (parse('E'), .9), (parse('E'), .9), (parse('E'), .3)]
        self.assertEqual(bar_finding(B_GSM, [beats] * 3, 'B', 0.5, 0.6).kind, 'chord')

    def test_song_verdict_ignores_missing_findings(self):
        self.assertEqual(song_verdict({0: None, 1: None}, 4), 'lined up')


class SongVerdictTests(unittest.TestCase):
    chord = Finding('chord', 'B . E .', 0.9)
    rhythm = Finding('rhythm', 'E . . B', 0.9)

    def test_a_song_with_over_a_quarter_of_its_bars_flagged_is_not_lined_up(self):
        self.assertEqual(song_verdict({i: self.chord for i in range(9)}, 32), 'not lined up')
        self.assertEqual(song_verdict({i: self.chord for i in range(8)}, 32), 'lined up')

    def test_rhythm_findings_do_not_count_toward_a_flood(self):
        self.assertEqual(song_verdict({i: self.rhythm for i in range(20)}, 32), 'lined up')


if __name__ == '__main__':
    unittest.main()
