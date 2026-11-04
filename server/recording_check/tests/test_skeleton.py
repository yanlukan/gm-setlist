import unittest

import numpy as np

from recording_check.skeleton import bar_starts, parts, record_bars, unsure_evidence
from recording_check.tests.synthetic import analysis


def starts_of(record, bar_length=4):
    return bar_starts(record['beats'], record['chroma'], record['hop'], bar_length)


class BarPhaseTest(unittest.TestCase):
    def test_bar_phase_follows_the_chord_changes(self):
        # beats every 0.5 s, chord changes at beats 2, 6 and 10
        chords = ['N', 'N'] + ['C'] * 4 + ['G'] * 4 + ['Am'] * 4 + ['F'] * 4
        record = analysis(chords, bpm=120)
        starts = starts_of(record)
        self.assertAlmostEqual(starts[0], record['beats'][2])
        self.assertEqual(starts, record['beats'][2::4])
        # ten silent seconds of beats before the same changes: the phase stays on the changes
        longer = analysis(chords, bpm=120, lead=10.0)
        starts = starts_of(longer)
        self.assertAlmostEqual(starts[0], longer['beats'][2])
        for t in (11.0, 13.0, 15.0):
            self.assertTrue(any(abs(s - t) < 1e-9 for s in starts))

    def test_ties_take_the_earliest_phase(self):
        record = analysis(['C'] * 16, bpm=120)
        self.assertEqual(starts_of(record), record['beats'][0::4])

    def test_beats_a_little_off_the_music_still_find_the_phase(self):
        record = analysis(['F'] + ['C'] * 4 + ['G'] * 4 + ['Am'] * 4 + ['F'] * 4, bpm=120, phase=0.1)
        self.assertEqual(starts_of(record), record['beats'][1::4])

    def test_a_bar_of_tracker_beats_at_double_time(self):
        # eight tracker beats a bar; the changes fall on tracker beat 2 of 8
        record = analysis(['N'] + ['C'] * 4 + ['G'] * 4 + ['Am'] * 4, bpm=100, tracker=2.0)
        self.assertEqual(starts_of(record, 8), record['beats'][2::8])


class RecordBarsTest(unittest.TestCase):
    def test_a_held_bar_is_one_chord_a_changing_bar_keeps_its_beats(self):
        record = analysis(['C'] * 4 + ['C', 'C', 'G', 'G'] + ['Am'] * 4, bpm=120)
        bars = record_bars(record, 'C')
        self.assertEqual([b['text'] for b in bars], ['C', 'C . G .', 'Am'])
        self.assertEqual(len(bars[0]['beats']), 4)
        self.assertAlmostEqual(bars[0]['start'], 0.0)
        self.assertAlmostEqual(bars[0]['end'], 2.0)

    def test_a_long_intro_does_not_shift_the_bars(self):
        # ten beats of silence: the bars start on the first chord, two beats into a bar of beats
        record = analysis(['C'] * 4 + ['G'] * 4 + ['Am', 'Am', 'F', 'F'] + ['C'] * 4, bpm=120, lead=5.0)
        bars = record_bars(record, 'C')
        self.assertEqual([b['text'] for b in bars], ['C', 'G', 'Am . F .', 'C'])
        self.assertAlmostEqual(bars[0]['start'], 5.0)

    def test_no_chord_inside_the_song_is_written_nc(self):
        record = analysis(['C'] * 4 + ['N'] * 4 + ['G'] * 4, bpm=120)
        self.assertEqual([b['text'] for b in record_bars(record, 'C')], ['C', 'N.C.', 'G'])

    def test_a_final_partial_bar_is_dropped(self):
        record = analysis(['C'] * 4 + ['G'] * 2, bpm=120, tail=0.0)
        self.assertEqual([b['text'] for b in record_bars(record, 'C')], ['C'])

    def test_a_double_time_tracker_gives_bars_at_the_folded_tempo(self):
        record = analysis(['N', 'N'] + ['C'] * 4 + ['G'] * 4 + ['Am', 'Am', 'F', 'F'] + ['C'] * 4,
                          bpm=80, tracker=2.0)
        self.assertEqual(record['bpm'], 160)
        bars = record_bars(record, 'C')
        self.assertEqual([b['text'] for b in bars], ['C', 'G', 'Am . F .', 'C'])
        self.assertAlmostEqual(bars[0]['start'], 1.5)
        self.assertAlmostEqual(bars[0]['end'] - bars[0]['start'], 3.0)

    def test_a_half_time_tracker_gives_bars_at_the_folded_tempo(self):
        record = analysis(['C'] * 4 + ['G'] * 4 + ['Am', 'Am', 'F', 'F'] + ['C'] * 4, bpm=100, tracker=0.5)
        self.assertEqual(record['bpm'], 50)
        bars = record_bars(record, 'C')
        self.assertEqual([b['text'] for b in bars], ['C', 'G', 'Am . F .', 'C'])
        self.assertAlmostEqual(bars[0]['end'] - bars[0]['start'], 2.4)

    def test_three_four(self):
        record = analysis(['C'] * 3 + ['G'] * 3 + ['F', 'G', 'G'], bpm=120)
        self.assertEqual([b['text'] for b in record_bars(record, 'C', 3)], ['C', 'G', 'F G .'])


class PartsTest(unittest.TestCase):
    def test_parts_reuse_a_repeated_line(self):
        texts = ['A', 'B', 'A', 'B', 'C', 'D', 'C . D .', 'D', 'A', 'B', 'A', 'B']
        sections, form = parts(texts)
        self.assertEqual(sections, [
            {'name': 'Part 1', 'chords': '|  A  |  B  |  A  |  B  |'},
            {'name': 'Part 2', 'chords': '|  C  |  D  |  C  .  D  .  |  D  |'},
        ])
        self.assertEqual(form, ['Part 1', 'Part 2', 'Part 1'])

    def test_a_short_last_line_is_its_own_part(self):
        sections, form = parts(['A', 'B', 'A', 'B', 'G', 'C'])
        self.assertEqual([s['chords'] for s in sections], ['|  A  |  B  |  A  |  B  |', '|  G  |  C  |'])
        self.assertEqual(form, ['Part 1', 'Part 2'])

    def test_no_bars_no_parts(self):
        self.assertEqual(parts([]), ([], []))


class UnsureEvidenceTest(unittest.TestCase):
    def test_every_record_only_bar_is_unsure_with_the_records_reading(self):
        sections, _ = parts(['A', 'B', 'A', 'B', 'C', 'D', 'C . D .', 'D'])
        evidence = unsure_evidence(sections)
        self.assertEqual(set(evidence), {'Part 1', 'Part 2'})
        for name, section in evidence.items():
            bars = section['bars']
            self.assertEqual([b['bar'] for b in bars], list(range(4)))
            for bar in bars:
                self.assertEqual(bar['from'], 'Unsure')
                self.assertEqual(bar['readings'], [{'from': 'Record', 'chords': bar['chords']}])
        self.assertEqual([b['chords'] for b in evidence['Part 2']['bars']], ['C', 'D', 'C . D .', 'D'])

    def test_bars_are_counted_across_a_sections_lines(self):
        evidence = unsure_evidence([{'name': 'A', 'chords': '|  C  |  G  |\n|  Am  .  F  .  |'}])
        self.assertEqual([(b['bar'], b['chords']) for b in evidence['A']['bars']],
                         [(0, 'C'), (1, 'G'), (2, 'Am . F .')])


if __name__ == '__main__':
    unittest.main()
