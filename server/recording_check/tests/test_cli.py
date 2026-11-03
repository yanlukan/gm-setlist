"""The command line: songs are checked one after another, and failures are reported."""
import json
import os
import tempfile
import unittest

import check_recording
from recording_check.tests.synthetic import analysis, chart

BARS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'E', 'Dm', 'Bb', 'A']


def per_beat(bars):
    return [name for bar in bars for name in bar.split() for _ in range(4 // len(bar.split()))]


class CliTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.audio = self.path('song.m4a')
        open(self.audio, 'w').close()
        self.records = {}

    def path(self, name):
        return os.path.join(self.dir.name, name)

    def fake_analyze(self, path, cache_path):
        return self.records[os.path.basename(path)]

    def run_tool(self, charts, recordings, *extra):
        with open(self.path('charts.json'), 'w') as f:
            json.dump(charts, f)
        with open(self.path('recordings.json'), 'w') as f:
            json.dump(recordings, f)
        args = ['--charts', self.path('charts.json'), '--recordings', self.path('recordings.json'),
                '--out', self.path('out.json'), '--report', self.path('report.md'),
                '--cache', self.path('cache'), *extra]
        check_recording.main(args, analyze=self.fake_analyze)
        with open(self.path('out.json')) as f:
            return json.load(f)

    def test_a_missing_recording_is_reported_not_fatal(self):
        self.records['song.m4a'] = analysis(per_beat(BARS), lead=1.0)
        out = self.run_tool([chart('Gone', BARS), chart('Here', BARS)],
                            {'Gone': self.path('nothing.m4a'), 'Here': self.audio})
        self.assertEqual(out['Gone']['verdict'], 'no recording')
        self.assertEqual(out['Gone']['bars'], [])
        self.assertEqual(out['Here']['verdict'], 'lined up')
        self.assertEqual(out['Here']['recording'], 'song.m4a')
        self.assertEqual(out['Here']['bars'], [])
        self.assertTrue(os.path.exists(self.path('report.md')))

    def test_a_song_without_a_map_entry_or_song_order(self):
        skipped = dict(chart('Papa', BARS), played=[], skipped='no song order')
        out = self.run_tool([skipped, chart('Unmapped', BARS)], {'Papa': self.audio})
        self.assertEqual(out['Papa']['verdict'], 'no song order')
        self.assertEqual(out['Unmapped']['verdict'], 'no recording')

    def test_ear_and_record_bars_are_never_findings(self):
        # the record plays D in bars 2 (Ear), 6 (Record) and 10 (no hand evidence)
        record = list(BARS)
        for i in (2, 6, 10):
            record[i] = 'D'
        self.records['song.m4a'] = analysis(per_beat(record), lead=1.0)
        song = chart('Song', BARS, evidence={2: 'Ear', 6: 'Record'})
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'lined up')
        self.assertEqual([(b['bar'], b['kind'], b['record']) for b in out['bars']], [(10, 'chord', 'D . . .')])
        self.assertEqual(out['bars'][0]['chords'], 'Bb')
        self.assertEqual(len(out['bars'][0]['at']), 1)

    def test_a_section_taken_from_the_record_is_never_a_finding(self):
        record = list(BARS)
        record[10] = 'D'
        self.records['song.m4a'] = analysis(per_beat(record), lead=1.0)
        out = self.run_tool([chart('Song', BARS, section_from='Record')], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'lined up')
        self.assertEqual(out['bars'], [])

    def test_one_song_is_merged_into_the_earlier_output(self):
        self.records['song.m4a'] = analysis(per_beat(BARS), lead=1.0)
        charts = [chart('One', BARS), chart('Two', BARS)]
        maps = {'One': self.audio, 'Two': self.audio}
        self.run_tool(charts, maps)
        out = self.run_tool(charts, {'One': self.path('nothing.m4a'), 'Two': self.audio}, '--song', 'One')
        self.assertEqual(out['One']['verdict'], 'no recording')
        self.assertEqual(out['Two']['verdict'], 'lined up')

    def test_a_chart_longer_than_its_recording_is_not_lined_up(self):
        self.records['song.m4a'] = analysis(per_beat(BARS[:4]), lead=0.5, tail=0.5)
        out = self.run_tool([chart('Song', BARS)], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'not lined up')
        self.assertEqual(out['bars'], [])

    def test_a_stretch_where_the_record_has_other_chords_is_dropped_not_flagged(self):
        # the last five bars of the record are some other music: a slip, not five findings
        bars = BARS + BARS
        record = bars[:19] + ['F#', 'C#', 'G#m', 'D#m', 'A#']
        self.records['song.m4a'] = analysis(per_beat(record), lead=1.0)
        song = chart('Song', bars)
        song['sections'][0]['bars'] += [dict(b, bar=b['bar'] + 12) for b in song['sections'][0]['bars']]
        song['played'] = [{'section': 'A', 'bar': i} for i in range(24)]
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual(out['bars'], [])

    def test_rhythm_findings_need_the_tracker_at_the_charts_tempo(self):
        bars = ['C', 'Am', 'F G', 'C', 'Am', 'F G', 'E', 'Dm']
        record = per_beat(bars)
        record[10] = 'F'   # 'F G' changes a beat late, F F F G, in both plays
        song = chart('Song', bars + bars)
        song['sections'][0]['bars'] += [dict(b, bar=b['bar'] + 8) for b in song['sections'][0]['bars']]
        song['played'] = [{'section': 'A', 'bar': i % 8} for i in range(16)]
        self.records['song.m4a'] = analysis(record + record, lead=1.0)
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual([(b['bar'], b['kind']) for b in out['bars']], [(2, 'rhythm')])
        self.records['song.m4a'] = analysis(record + record, lead=1.0, tracker=2.0)
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual(out['bars'], [])

    def test_unchecked_bars_and_no_score_in_the_output(self):
        bars = BARS + BARS
        record = bars[:19] + ['F#', 'C#', 'G#m', 'D#m', 'A#']
        self.records['song.m4a'] = analysis(per_beat(record), lead=1.0)
        song = chart('Song', bars)
        song['sections'][0]['bars'] += [dict(b, bar=b['bar'] + 12) for b in song['sections'][0]['bars']]
        song['played'] = [{'section': 'A', 'bar': i} for i in range(24)]
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'lined up')
        self.assertEqual(out['unchecked'], [{'section': 'A', 'bar': b} for b in range(19, 24)])
        self.assertNotIn('score', out)
        with open(self.path('report.md')) as f:
            text = f.read()
        self.assertIn('Unchecked', text)
        self.assertIn('Score', text)

    def test_more_than_a_quarter_of_the_plays_slipping_is_not_lined_up(self):
        record = BARS[:7] + ['F#', 'C#', 'G#m', 'D#m', 'A#']
        self.records['song.m4a'] = analysis(per_beat(record), lead=1.0)
        out = self.run_tool([chart('Song', BARS)], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'not lined up')
        self.assertEqual(out['bars'], [])

    def test_a_section_wrong_in_every_pass_gives_findings_not_a_silent_drop(self):
        verse = BARS + ['C', 'Am', 'F', 'G']   # 16 bars: 3 wrong stays under the song's flood
        wrong = list(verse)
        wrong[2:5] = ['F#', 'C#', 'G#m']
        song = chart('Song', verse)
        song['played'] = [{'section': 'A', 'bar': b} for _ in range(3) for b in range(16)]
        self.records['song.m4a'] = analysis(per_beat(wrong * 3), lead=1.0)
        out = self.run_tool([song], {'Song': self.audio})['Song']
        self.assertEqual(out['verdict'], 'lined up')
        self.assertEqual(sorted(b['bar'] for b in out['bars'] if b['kind'] == 'chord'), [2, 3, 4])
        self.assertEqual(out['unchecked'], [])

    def test_the_cache_is_keyed_by_title_and_file_name(self):
        from recording_check.check import cache_file
        self.assertEqual(os.path.basename(cache_file('c', "Freedom! '90", '/x/2-05 Freedom! 90.m4a')),
                         'freedom-90--2-05-freedom-90.json')

    def test_no_btc_model_is_a_clear_error(self):
        from recording_check import audio
        old = os.environ.get('BTC_SERVER')
        os.environ['BTC_SERVER'] = self.dir.name
        try:
            with self.assertRaisesRegex(FileNotFoundError, 'BTC_SERVER'):
                audio._btc(None, 22050, 0)
        finally:
            if old is None:
                del os.environ['BTC_SERVER']
            else:
                os.environ['BTC_SERVER'] = old


if __name__ == '__main__':
    unittest.main()
