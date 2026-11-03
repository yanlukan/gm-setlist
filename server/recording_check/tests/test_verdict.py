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

    def test_an_unsure_beat_is_written_as_holding(self):
        # the record's reading is shown to the player: a beat too unsure to count says nothing
        beats = play('B', 'F#/A#', 'G#m') + [(parse('G#'), 0.3)]
        self.assertEqual(read_bar(B_GSM, beats, 'B'), 'B F#/A# G#m .')
        self.assertEqual(read_bar(B_GSM, [(parse('E'), 0.2)] + play('B', 'G#m', 'G#m'), 'B'), 'E B G#m .')

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

    def test_a_bass_outside_the_charts_own_chord_never_flags(self):
        # Last Christmas: a drum or a chromatic bass note on A# under the chart's Bm7
        chart = slots(('Bm7', 0, 1))
        beats = play('Bm', 'Bm/A#', 'Bm/A#', 'Bm')
        self.assertIsNone(bar_finding(chart, [beats] * 3, 'D', 0.5, 0.6))
        self.assertIsNone(bar_finding(slots(('C', 0, 1)), [play('C', 'C/D', 'C/D', 'C')] * 3, 'C', 0.5, 0.6))

    def test_a_passing_chord_sits_between_two_chords_not_two_inversions_of_one(self):
        # Kissing a Fool: the bass walks Eb F G Bb under one Eb chord
        chart = slots(('Eb6', 0, 1))
        beats = play('Eb6', 'Ddim/F', 'Eb/G', 'Eb/Bb')
        self.assertIsNone(bar_finding(chart, [beats] * 2, 'Eb', 0.5, 0.6))

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


class LocalFloodTests(unittest.TestCase):
    def test_a_lone_difference_stays(self):
        from recording_check.verdict import unsteady_plays
        self.assertEqual(unsteady_plays([False, False, True, False, False, True, False]), set())

    def test_a_run_of_differences_is_a_line_up_that_slipped(self):
        from recording_check.verdict import unsteady_plays
        flags = [False, False, True, True, False, True, False, False, False, False]
        self.assertEqual(unsteady_plays(flags), {2, 3, 5})

    def test_play_differs_matches_the_bar_rule(self):
        from recording_check.verdict import play_differs
        self.assertTrue(play_differs(B_GSM, play('B', 'F#/A#', 'G#m', 'G#m')))
        self.assertFalse(play_differs(B_GSM, play('B', 'B', 'G#m', 'G#m')))


class CoordinatorRulingTests(unittest.TestCase):
    def test_a_bar_played_once_needs_three_quarters_confidence(self):
        chart = slots(('C', 0, 1))
        self.assertIsNone(bar_finding(chart, [play('F', 'F', 'F', 'F', conf=0.7)], 'C'))
        self.assertEqual(bar_finding(chart, [play('F', 'F', 'F', 'F', conf=0.8)], 'C').kind, 'chord')
        self.assertEqual(bar_finding(chart, [play('F', 'F', 'F', 'F', conf=0.7)] * 2, 'C').kind, 'chord')

    def test_a_bass_on_the_chords_own_fifth_agrees(self):
        for chart, record in (('D', 'D/A'), ('C', 'C/G'), ('Am', 'Am/E')):
            beats = play(chart, record, record, record)
            self.assertIsNone(bar_finding(slots((chart, 0, 1)), [beats] * 3, 'C'), record)
        # a bass on the third still counts
        self.assertEqual(bar_finding(slots(('D', 0, 1)), [play('D', 'D/F#', 'D/F#', 'D/F#')] * 3, 'D').kind, 'chord')

    def test_an_eleventh_without_its_third_matches_major_minor_or_sus(self):
        for record in ('B', 'Bm', 'Bsus4'):
            self.assertIsNone(bar_finding(slots(('B11', 0, 1)), [play(*[record] * 4)] * 2, 'D'), record)
        self.assertIsNone(bar_finding(slots(('Am11', 0, 1)), [play('A', 'A', 'A', 'A')] * 2, 'C'))
        # a sharp 11 keeps its third; another root still differs
        self.assertEqual(bar_finding(slots(('C7#11', 0, 1)), [play('Cm', 'Cm', 'Cm', 'Cm')] * 2, 'C').kind, 'chord')
        self.assertEqual(bar_finding(slots(('B11', 0, 1)), [play('G', 'G', 'G', 'G')] * 2, 'D').kind, 'chord')

    def test_a_maj9_matches_its_upper_triads(self):
        for record in ('Gm', 'Bb', 'Gm/Eb'):
            self.assertIsNone(bar_finding(slots(('Ebmaj9', 0, 1)), [play(*[record] * 4)] * 2, 'Eb'), record)
        self.assertEqual(bar_finding(slots(('Ebmaj9', 0, 1)), [play('Gm/D', 'Gm/D', 'Gm/D', 'Gm/D')] * 2, 'Eb').kind, 'chord')
        self.assertEqual(bar_finding(slots(('Ebmaj9', 0, 1)), [play('Cm', 'Cm', 'Cm', 'Cm')] * 2, 'Eb').kind, 'chord')

    def test_rhythm_only_on_simple_bars_at_the_charts_tempo(self):
        late = play('E', 'E', 'E', 'B')
        self.assertEqual(bar_finding(E_B, [late] * 3, 'E').kind, 'rhythm')
        self.assertIsNone(bar_finding(E_B, [late] * 3, 'E', rhythm=False))   # tracker not at the chart's tempo
        three = slots(('E', 0, 1 / 3), ('B', 1 / 3, 1 / 3), ('A', 2 / 3, 1 / 3))
        self.assertIsNone(bar_finding(three, [play('E', 'B', 'B', 'A')] * 3, 'E'))
        off = slots(('E', 0, 0.375), ('B', 0.375, 0.625))
        self.assertIsNone(bar_finding(off, [play('E', 'E', 'E', 'B')] * 3, 'E'))


class ReviewRoundTests(unittest.TestCase):
    def test_a_held_pedal_bass_still_counts(self):
        # no beat has G over its own bass, so the C is held, not walking
        self.assertEqual(bar_finding(slots(('G', 0, 1)), [play('G/C', 'G/C', 'G/C', 'G/C')] * 3, 'G').kind, 'chord')

    def test_a_walking_bass_needs_the_chart_chord_on_its_own_bass_in_the_same_play(self):
        self.assertIsNone(bar_finding(slots(('G', 0, 1)), [play('G', 'G/C', 'G/C', 'G')] * 3, 'G'))

    def test_no_rhythm_finding_on_a_three_chord_bar_even_on_whole_beats(self):
        three = slots(('E', 0, 0.25), ('B', 0.25, 0.25), ('A', 0.5, 0.5))
        self.assertIsNone(bar_finding(three, [play('E', 'E', 'B', 'A')] * 3, 'E'))
        two = slots(('E', 0, 0.5), ('A', 0.5, 0.5))
        self.assertEqual(bar_finding(two, [play('E', 'E', 'E', 'A')] * 3, 'E').kind, 'rhythm')

    def test_a_bar_wrong_in_every_pass_is_kept_not_dropped(self):
        from recording_check.verdict import kept_repeats
        keys = [('A', b) for b in range(6)] * 2
        differs = [b in (2, 3, 4) for _, b in keys]
        slipped = {2, 3, 4, 8, 9, 10}
        self.assertEqual(kept_repeats(slipped, keys, differs), slipped)

    def test_a_slip_in_one_pass_only_is_still_dropped(self):
        from recording_check.verdict import kept_repeats
        keys = [('A', b) for b in range(6)] * 2
        differs = [False] * 6 + [False, False, True, True, True, False]
        self.assertEqual(kept_repeats({8, 9, 10}, keys, differs), set())

    def test_a_section_played_once_is_not_kept(self):
        from recording_check.verdict import kept_repeats
        keys = [('A', b) for b in range(6)] + [('B', b) for b in range(6)]
        differs = [False] * 8 + [True] * 4
        self.assertEqual(kept_repeats({8, 9, 10, 11}, keys, differs), set())
