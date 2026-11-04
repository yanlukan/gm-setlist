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

    def test_a_changing_bar_is_written_in_the_charts_chords_on_the_records_beats(self):
        out = line_up(lines(('Verse', 'Gm7 C F')), [bar('Gm Gm C C'), held('F')], 'F')
        self.assertEqual(out['sections'][0]['chords'], '|  Gm7  .  C  .  |  F  |')
        self.assertEqual([b['bar'] for b in out['evidence']['Verse']['bars']], [0])

    def test_a_bar_with_a_change_inside_it_is_unsure(self):
        out = line_up(lines(('Verse', 'C Bb')), [bar('C C Bb Bb')], 'F')
        self.assertEqual(out['sections'][0]['chords'], '|  C  .  Bb  .  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 0, 'chords': 'C . Bb .', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'C Bb'}, {'from': 'Record', 'chords': 'C . Bb .'}]}])

    def test_two_held_bars_are_both_chart(self):
        out = line_up(lines(('Verse', 'C Bb')), [held('C'), held('Bb')], 'F')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  Bb  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_held_bar_takes_the_spelling_of_the_chord_it_holds(self):
        out = line_up(lines(('Verse', 'Am7 F')), [held('Am'), held('Am'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  Am7  |  Am7  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_disputed_bar_is_unsure_with_both_readings(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held('C'), held('G'), held('Em'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |  Am  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 2, 'chords': 'Am', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'Am'}, {'from': 'Record', 'chords': 'Em'}]}])

    def test_a_disputed_change_inside_a_bar_keeps_the_beats_in_both_readings(self):
        out = line_up(lines(('Verse', 'C Dm G')), [bar('C C Em Em'), held('G')], 'C')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 0, 'chords': 'C . Dm .', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'C Dm'}, {'from': 'Record', 'chords': 'C . Em .'}]}])

    def test_an_extra_record_change_the_chart_lacks_is_unsure_against_the_chord_held_over(self):
        out = line_up(lines(('Verse', 'C G F')), [held('C'), held('G'), held('D'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |  G  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 2, 'chords': 'G', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'G'}, {'from': 'Record', 'chords': 'D'}]}])

    def test_a_chart_chord_held_over_from_an_earlier_bar_is_the_bars_chart_reading(self):
        out = line_up(lines(('Verse', 'C F')), [held('C'), held('Em'), held('Em'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  C  |  C  |  F  |')
        self.assertEqual([(b['bar'], b['readings']) for b in out['evidence']['Verse']['bars']], [
            (i, [{'from': 'Chart', 'chords': 'C'}, {'from': 'Record', 'chords': 'Em'}]) for i in (1, 2)])

    def test_a_chart_chord_the_record_lacks_makes_its_bar_unsure(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held('C'), held('G'), held('F')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  .  Am  .  |  F  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 1, 'chords': 'G . Am .', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'G . Am .'}, {'from': 'Record', 'chords': 'G'}]}])

    def test_an_unsure_record_never_confirms_the_chart(self):
        out = line_up(lines(('Verse', 'C G Am F')), [held(n, 0.2) for n in ('C', 'G', 'Am', 'F', 'F')], 'C')
        bars = out['evidence']['Verse']['bars']
        self.assertEqual([b['bar'] for b in bars], [0, 1, 2, 3, 4])
        self.assertTrue(all(b['from'] == 'Unsure' for b in bars))
        # the record agrees only weakly: the chart's reading alone
        self.assertEqual(bars[0]['readings'], [{'from': 'Chart', 'chords': 'C'}])

    def test_every_unsure_bar_has_one_reading_or_two_different_ones(self):
        chart = lines(('Intro', 'C Bb F C'), ('Verse', 'G F F/C C'), ('Chorus', 'Cm Cm7 G'), ('Verse', 'G F C'),
                      ('Outro', 'C Bb'))
        record = ([held('C', 0.3), bar('C C Bb Bb'), held('F'), held('C'), held('G'), held('Dm'), bar('F F C C'),
                   held('C'), held('Cm', 0.2), bar('Cm Cm7 Cm7 Cm7'), held('Em'), held('G'), held('F'), held('C'),
                   bar('C C C Bb', 0.4), held('Bb'), held('Bb')])
        out = line_up(chart, record, 'C')
        entries = [e for name in out['form'] for e in out['evidence'][name]['bars']]
        self.assertEqual({len(e['readings']) for e in entries}, {1, 2})
        for entry in entries:
            readings = entry['readings']
            if len(readings) == 1:
                self.assertEqual(readings[0]['from'], 'Chart')
            else:
                self.assertEqual([r['from'] for r in readings], ['Chart', 'Record'])
                self.assertNotEqual(readings[0]['chords'], readings[1]['chords'])

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

    def test_an_unsure_bar_with_a_chart_reading_is_written_in_the_charts_chords(self):
        out = line_up(lines(('Verse', 'Cmaj7 G7 Am')), [held('C'), bar('G G E E'), held('Am')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  Cmaj7  |  G7  |  Am  |')
        written = [cell.strip() for cell in out['sections'][0]['chords'].split('|') if cell.strip()]
        for entry in out['evidence']['Verse']['bars']:
            self.assertEqual(entry['chords'], ' '.join(written[entry['bar']].split()))
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 1, 'chords': 'G7', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'G7'}, {'from': 'Record', 'chords': 'G . E .'}]}])

    def test_a_short_passing_reading_does_not_dispute_the_chart(self):
        out = line_up(lines(('Verse', 'C G')), [bar('C C C F/A'), held('G')], 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_passing_reading_is_left_unpaired_in_the_line_up(self):
        from recording_check.chords import parse as chord
        from recording_check.words import _align, _changes, _chart_chords
        record = [bar('C C C F/A'), held('G')]
        chart = _chart_chords(lines(('Verse', 'C G')))
        changes = _changes(record)
        self.assertEqual(_align(chart, changes), [(0, 0), (None, 1), (1, 2)])
        self.assertEqual(changes[1][2], chord('F/A'))
        out = line_up(lines(('Verse', 'C G')), record, 'C')
        self.assertEqual(out['sections'][0]['chords'], '|  C  |  G  |')
        self.assertEqual(out['evidence']['Verse']['bars'], [])

    def test_a_change_covering_half_the_bar_still_disputes_it(self):
        out = line_up(lines(('Verse', 'C G')), [bar('C C F/A F/A'), held('G')], 'C')
        self.assertEqual(out['evidence']['Verse']['bars'], [
            {'bar': 0, 'chords': 'C', 'from': 'Unsure',
             'readings': [{'from': 'Chart', 'chords': 'C'}, {'from': 'Record', 'chords': 'C . F/A .'}]}])

    def test_a_passing_reading_that_runs_into_the_next_bar_is_no_passing_reading(self):
        out = line_up(lines(('Verse', 'C G')), [bar('C C C F'), bar('F G G G')], 'C')
        self.assertEqual([b['bar'] for b in out['evidence']['Verse']['bars']], [0, 1])

    def test_a_repeated_play_with_unsure_bars_is_not_the_earlier_section(self):
        chart = lines(('Verse', 'C G'), ('Chorus', 'F'), ('Verse', 'C Am'))
        for confidence in (0.9, 0.2):
            out = line_up(chart, [held(n, confidence) for n in ('C', 'G', 'F', 'C', 'G')], 'C')
            self.assertEqual(out['form'], ['Verse', 'Chorus', 'Verse 2'])
            self.assertIn(1, [b['bar'] for b in out['evidence']['Verse 2']['bars']])

    def test_the_same_text_with_other_marks_is_a_new_section(self):
        chart = lines(('Verse', 'C G'), ('Chorus', 'F'), ('Verse', 'C G'))
        out = line_up(chart, [held(n) for n in ('C', 'G', 'F', 'C', 'Em')], 'C')
        self.assertEqual(out['form'], ['Verse', 'Chorus', 'Verse 2'])
        self.assertEqual(out['sections'][2]['chords'], out['sections'][0]['chords'])
        self.assertEqual(out['evidence']['Verse']['bars'], [])
        self.assertEqual([b['bar'] for b in out['evidence']['Verse 2']['bars']], [1])

    def test_a_name_ending_in_a_number_is_numbered_in_brackets(self):
        chart = lines(('Pre-Chorus 2', 'C G'), ('Chorus', 'F'), ('Pre-Chorus 2', 'Am G'), ('Chorus', 'F'),
                      ('Pre-Chorus 2', 'Dm G'))
        record = [held(n) for n in ('C', 'G', 'F', 'Am', 'G', 'F', 'Dm', 'G')]
        out = line_up(chart, record, 'C')
        self.assertEqual(out['form'], ['Pre-Chorus 2', 'Chorus', 'Pre-Chorus 2 (2)', 'Chorus', 'Pre-Chorus 2 (3)'])

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
        self.assertEqual(out['sections'][0]['chords'], '|  Cmaj7  |  G/B  |  Am7  .  F  .  |  C  |')
        # bar 1: G against G/B; bar 2: a change inside the bar
        self.assertEqual([b['bar'] for b in out['evidence']['Verse']['bars']], [1, 2])


if __name__ == '__main__':
    unittest.main()
