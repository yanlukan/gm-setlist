"""Reading one beat of the record: BTC's chord over the bass read (synthetic, no audio)."""
import unittest

from recording_check.chords import parse, same
from recording_check.reading import bar_beats, beat_chord

HOP = 0.05


def record(btc, chroma_notes, bass, bass_share=1.0, conf=0.9, seconds=1.0):
    """One second of record: BTC says `btc`; chroma holds `chroma_notes`; the bass band
    holds pitch class `bass` at `bass_share` of its energy (the rest spread evenly)."""
    frames = int(seconds / HOP)
    weights = chroma_notes if isinstance(chroma_notes, dict) else dict.fromkeys(chroma_notes, 1.0)
    chroma = [[weights.get(pc, 0.0) for pc in range(12)]] * frames
    rest = (1 - bass_share) / 11
    bass_row = [bass_share if pc == bass else rest for pc in range(12)]
    return {'hop': HOP, 'chroma': chroma, 'bass': [bass_row] * frames,
            'chords': [{'chord': btc, 'time': 0.0, 'duration': seconds, 'confidence': conf}]}


B, AS, FS, CS, DS = 11, 10, 6, 1, 3


class BeatChordTests(unittest.TestCase):
    def test_the_bass_comes_from_the_bass_read(self):
        chord, conf = beat_chord(record('B', {B, DS, FS}, DS), 0, 1, 'B')
        self.assertTrue(same(chord, parse('B/D#')))
        self.assertEqual(conf, 0.9)

    def test_a_bass_outside_btcs_chord_that_the_chroma_backs_is_read_again(self):
        chord, _ = beat_chord(record('B', {FS, AS, CS}, AS), 0, 1, 'B')
        self.assertTrue(same(chord, parse('F#/A#')))

    def test_a_walk_down_bass_is_read_as_the_key_chord_it_is_root_or_third_of(self):
        # Faith's Pre-Chorus on the record: BTC hears B, the bass walks to A#, and the beat's
        # chroma fits B and F# about as well. In B the key chords holding A# as root or
        # third are A#dim and F#; F# fits best. Not D#m, which holds A# as its fifth.
        faith = {AS: 1.0, B: 0.74, 9: 0.61, DS: 0.51, FS: 0.49, 8: 0.48, 2: 0.38, CS: 0.22}
        chord, _ = beat_chord(record('B', faith, AS), 0, 1, 'B')
        self.assertTrue(same(chord, parse('F#/A#')))

    def test_a_bass_no_key_chord_holds_stays_a_passing_note(self):
        chord, _ = beat_chord(record('B', {B, DS, FS}, 7), 0, 1, 'B')   # G under B
        self.assertTrue(same(chord, parse('B/G')))

    def test_a_passing_bass_under_a_held_chord_stays_on_that_chord(self):
        chord, _ = beat_chord(record('B', {B, DS, FS}, CS), 0, 1, 'B')   # C#m does not fit
        self.assertTrue(same(chord, parse('B/C#')))

    def test_confidence_is_the_lower_of_chord_and_bass(self):
        _, conf = beat_chord(record('B', {B, DS, FS}, B, bass_share=0.4, conf=0.9), 0, 1, 'B')
        self.assertAlmostEqual(conf, (0.4 - 0.2) / 0.3, places=3)
        _, conf = beat_chord(record('B', {B, DS, FS}, B, conf=0.3), 0, 1, 'B')
        self.assertEqual(conf, 0.3)

    def test_an_unsure_bass_gives_root_position_at_low_confidence(self):
        chord, conf = beat_chord(record('B', {B, DS, FS}, DS, bass_share=0.25), 0, 1, 'B')
        self.assertTrue(same(chord, parse('B')))
        self.assertLess(conf, 0.5)

    def test_no_bass_at_all_cannot_count(self):
        silent = record('B', {B, DS, FS}, B)
        silent['bass'] = [[0.0] * 12] * 20
        chord, conf = beat_chord(silent, 0, 1, 'B')
        self.assertTrue(same(chord, parse('B')))
        self.assertEqual(conf, 0.0)

    def test_a_gap_in_btcs_timeline_is_no_chord(self):
        gap = record('B', {B, DS, FS}, B)
        gap['chords'][0]['duration'] = 0.3
        chord, conf = beat_chord(gap, 0, 1, 'B')
        self.assertEqual(chord.kind, 'none')
        self.assertEqual(conf, 0.0)


class BarBeatsTests(unittest.TestCase):
    def test_beats_are_moved_back_to_the_chart_pitch(self):
        up = record('C', {0, 4, 7}, 0, seconds=2.0)   # the record a semitone above a chart in B
        beats = bar_beats(up, 0, 2.0, 4, 'B', semitones=1)
        self.assertEqual(len(beats), 4)
        self.assertTrue(all(same(c, parse('B')) for c, _ in beats))


class HeldBassTests(unittest.TestCase):
    def test_a_one_frame_hit_does_not_change_the_beats_bass(self):
        # an A beat with a loud one-frame hit on Bb (a backbeat drum the CQT reads as a note)
        beat = record('A', {9, 1, 4}, 9)
        hit = [0.0] * 12
        hit[10] = 30.0
        beat['bass'] = list(beat['bass'])
        beat['bass'][10] = hit
        chord, conf = beat_chord(beat, 0, 1, 'D')
        self.assertTrue(same(chord, parse('A')))
        self.assertGreaterEqual(conf, 0.5)

    def test_a_bass_held_through_most_of_the_beat_counts(self):
        beat = record('A', {9, 1, 4}, 9)
        held = [0.05] * 12
        held[1] = 1.0
        beat['bass'] = [held] * 14 + list(beat['bass'][14:])   # C# for 0.7 of the beat
        chord, _ = beat_chord(beat, 0, 1, 'D')
        self.assertTrue(same(chord, parse('A/C#')))

    def test_no_note_held_is_an_unsure_bass(self):
        beat = record('A', {9, 1, 4}, 9)
        rows = []
        for pc in (4, 1, 9):   # three notes, a third of the beat each: none held
            row = [0.05] * 12
            row[pc] = 1.0
            rows += [row] * 7
        beat['bass'] = rows[:20]
        chord, conf = beat_chord(beat, 0, 1, 'D')
        self.assertTrue(same(chord, parse('A')))
        self.assertLess(conf, 0.5)


if __name__ == '__main__':
    unittest.main()
