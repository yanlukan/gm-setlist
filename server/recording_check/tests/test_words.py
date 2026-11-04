import json
import unittest

from recording_check.chords import parse
from recording_check.skeleton import _bar_text, record_bars
from recording_check.tests.synthetic import analysis
from recording_check.words import line_up


def bar(beat_chords, confidence=0.9, key='C'):
    """A record bar as skeleton.record_bars writes it, one chord name per beat."""
    beats = [(parse(name), confidence) for name in beat_chords.split()]
    return {'start': 0.0, 'end': 2.0, 'text': _bar_text(beats, key), 'beats': beats}


def held(name, confidence=0.9):
    return bar(' '.join([name] * 4), confidence)


def lines(*pairs):
    return [{'section': section, 'chords': chords.split()} for section, chords in pairs]


class LineUpTest(unittest.TestCase):
    def test_agreeing_bars_take_the_charts_spelling(self):
        out = line_up(lines(('Verse', 'Gm7 C')), [held('Gm'), held('C')], 'F')
        self.assertEqual(out['sections'], [{'name': 'Verse', 'chords': '|  Gm7  |  C  |'}])
        self.assertEqual(out['form'], ['Verse'])
        self.assertEqual(out['evidence'], {'Verse': {'from': 'Chart', 'bars': []}})

    def test_a_chart_bar_keeps_the_records_beats(self):
        out = line_up(lines(('Verse', 'Gm7 C F')), [bar('Gm Gm C C'), held('F')], 'F')
        self.assertEqual(out['sections'][0]['chords'], '|  Gm7  .  C  .  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_held_bar_takes_the_spelling_of_the_chord_it_holds(self):
        out = line_up(lines(('Verse', 'Am7 F')), [held('Am'), held('Am'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  Am7  |  Am7  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_disputed_bar_is_unsure_with_both_readings(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held('C'), held('G'), held('Em'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |  Em  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 2, 'chords': 'Em', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'Am'}, {'from': 'Record', 'chords': 'Em'}]}])

    def test_a_disputed_change_inside_a_bar_keeps_the_beats_in_both_readings(self):
        out = line_up(lines(('Verse', 'C Dm G')), [bar('C C Em Em'), held('G')], 'C')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 0, 'chords': 'C . Em .', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'C . Dm .'}, {'from': 'Record', 'chords': 'C . Em .'}]}])

    def test_an_extra_record_change_the_chart_lacks_is_unsure_record_only(self):
        out = line_up(lines(('Verse', 'C G F')), [held('C'), held('G'), held('D'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |  D  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 2, 'chords': 'D', 'from': 'Unsure', 'readings': [{'from': 'Record', 'chords': 'D'}]}])

    def test_a_chart_chord_the_record_lacks_makes_its_bar_unsure(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held('C'), held('G'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 1, 'chords': 'G', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'G . Am .'}, {'from': 'Record', 'chords': 'G'}]}])

    def test_an_unsure_record_never_confirms_the_chart(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held(n, 0.2) for n in ('C', 'G', 'Am', 'F', 'F')], 'C')
        bars = out['evidence']['Verse']['bars']
        self.assertEqual([b['bar'] for b in bars], [0, 1, 2, 3, 4])
        self.assertTrue(all(b['from'] == 'Unsure' for b in bars))
        self.assertEqual(bars[0]['readings'], [{'from': 'Chart', 'chords': 'C'}, {'from': 'Record', 'chords': 'C'}])

    def test_sections_come_from_the_charts_names_and_the_song_order_repeats_them(self):
        chart = lines(('Verse', 'C G'), ('Chorus', 'F C'), ('Verse', 'C G'))
        record = [held(n) for n in ('C', 'G', 'F', 'C', 'C', 'G')]
        out = line_up(chart, record, 'C')
        self.assertEqual(out['sections'], [{'name': 'Verse', 'chords': '|  C  |  G  |'},
                                           {'name': 'Chorus', 'chords': '|  F  |  C  |'}])
        self.assertEqual(out['form'], ['Verse', 'Chorus', 'Verse'])

    def test_a_section_played_again_differently_gets_a_number(self):
        chart = lines(('Verse', 'C G'), ('Verse', 'Am F'), ('Chorus', 'F C'), ('Verse', 'C G'))
        record = [held(n) for n in ('C', 'G', 'Am', 'F', 'F', 'C', 'C', 'E')]
        out = line_up(chart, record, 'C')
        self.assertEqual([s['name'] for s in out['sections']], ['Verse', 'Chorus', 'Verse 2'])
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |\n|  Am  |  F  |')
        self.assertEqual(out['form'], ['Verse', 'Chorus', 'Verse 2'])
        self.assertEqual([b['bar'] for b in out['evidence']['Verse 2']['bars']], [1])

    def test_nothing_of_the_charts_text_but_chords_reaches_the_output(self):
        chart = [{'section': 'Verse', 'chords': ['C', 'la', 'G', 'lala', '(x2)']}]
        out = line_up(chart, [held('C'), held('G')], 'C')
        self.assertNotIn('la', json.dumps(out))
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |')

    def test_no_chart_chords_gives_the_records_parts_all_unsure(self):
        out = line_up([], [held('C'), held('G')], 'C')
        self.assertEqual(out['form'], ['Part 1'])
        self.assertEqual([b['from'] for b in out['evidence']['Part 1']['bars']], ['Unsure', 'Unsure'])

    def test_bars_off_a_synthetic_record(self):
        record = analysis(['C'] * 4 + ['G'] * 4 + ['A:min', 'A:min', 'F', 'F'] + ['C'] * 4, bpm=120)
        out = line_up(lines(('Verse', 'Cmaj7 G/B Am7 F C')), record_bars(record, 'C'), 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  Cmaj7  |  G  |  Am7  .  F  .  |  C  |')
        self.assertEqual([b['bar'] for b in out['evidence']['Verse']['bars']], [1])


if __name__ == '__main__':
    unittest.main()
