"""Lining a chart's played bars up with a recording's beats (synthetic, no audio)."""
import unittest

from recording_check.align import Alignment, align
from recording_check.tests.synthetic import analysis, chart

BARS = ['C', 'Am', 'F', 'G', 'E', 'Dm', 'Bb', 'A']
BPM = 100
BEAT = 60 / BPM


def per_beat(bars):
    return [name for bar in bars for name in bar.split() for _ in range(4 // len(bar.split()))]


class AlignTests(unittest.TestCase):
    def test_silence_double_time_and_a_semitone_up(self):
        lead = 8 * BEAT   # two bars of silence before the chart starts
        record = analysis(per_beat(BARS), bpm=BPM, lead=lead, shift=1, tracker=2.0, phase=0.07)
        result = align(chart('Song', BARS, bpm=BPM), record)
        self.assertIsInstance(result, Alignment)
        self.assertEqual(result.shift, 1)
        self.assertEqual(len(result.bars), len(BARS))
        for i, (start, end) in enumerate(result.bars):
            self.assertLess(abs(start - (lead + 4 * i * BEAT)), BEAT / 2, f'bar {i} starts at {start}')
            self.assertGreater(end, start)

    def test_half_time_tracker_and_no_shift(self):
        lead = 3.1
        record = analysis(per_beat(BARS), bpm=BPM, lead=lead, tracker=0.5, phase=0.4)
        result = align(chart('Song', BARS, bpm=BPM), record)
        self.assertEqual(result.shift, 0)
        for i, (start, _) in enumerate(result.bars):
            self.assertLess(abs(start - (lead + 4 * i * BEAT)), BEAT / 2)

    def test_a_tracker_that_races_for_a_while_does_not_squash_the_bars(self):
        # the tracker loses the pulse over bars 3 to 5 and reports beats a third too fast
        bars = BARS + BARS
        lead = 2.0
        record = analysis(per_beat(bars), bpm=BPM, lead=lead)
        racing = [b for b in record['beats'] if not lead + 12 * BEAT <= b < lead + 24 * BEAT]
        racing += [lead + 12 * BEAT + k * BEAT * 0.75 for k in range(16)]
        record['beats'] = sorted(racing)
        result = align(chart('Song', bars, bpm=BPM), record)
        for i, (start, _) in enumerate(result.bars):
            self.assertLess(abs(start - (lead + 4 * i * BEAT)), BEAT / 2, f'bar {i} starts at {start}')

    def test_a_tracker_at_three_halves_of_the_tempo(self):
        # a 12/8 feel: the tracker counts dotted beats, neither double nor half time
        lead = 1.3
        record = analysis(per_beat(BARS), bpm=BPM, lead=lead, tracker=1.5, phase=0.1)
        result = align(chart('Song', BARS, bpm=BPM), record)
        for i, (start, _) in enumerate(result.bars):
            self.assertLess(abs(start - (lead + 4 * i * BEAT)), BEAT / 2, f'bar {i} starts at {start}')

    def test_a_better_fit_scores_higher(self):
        record = analysis(per_beat(BARS), bpm=BPM, lead=2.0)
        good = align(chart('Song', BARS, bpm=BPM), record)
        wrong = align(chart('Song', ['F#', 'D#m', 'B', 'C#', 'A#', 'G#m', 'E', 'D#'], bpm=BPM), record)
        self.assertGreater(good.score, wrong.score)


if __name__ == '__main__':
    unittest.main()
