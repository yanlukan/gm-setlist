"""add_song: one JSON request in, one JSON answer out; the record is read once."""
import contextlib
import io
import json
import os
import tempfile
import unittest

import add_song
from recording_check.tests.synthetic import analysis, chart

BARS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G']


def per_beat(bars):
    return [n for bar in bars for n in bar.split() for _ in range(4 // len(bar.split()))]


class AddSongTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.audio = os.path.join(self.dir.name, 'song.m4a')
        open(self.audio, 'w').close()
        self.calls = 0

    def fake(self, path, cache):
        self.calls += 1
        return analysis(per_beat(BARS), lead=1.0)

    def run_tool(self, **request):
        request.setdefault('title', 'Test Song')
        request.setdefault('recording', self.audio)
        out = io.StringIO()
        add_song.main(analyze=self.fake, stdin=io.StringIO(json.dumps(request)), stdout=out)
        return json.loads(out.getvalue())

    def test_route_record_when_no_chart(self):
        answer = self.run_tool()
        self.assertEqual(answer['route'], 'record')
        self.assertEqual(answer['recording'], 'song.m4a')
        self.assertEqual(answer['timeSignature'], '4/4')
        self.assertTrue(answer['sections'] and answer['form'])
        self.assertTrue(all(b['from'] == 'Unsure'
                            for e in answer['evidence'].values() for b in e['bars']))

    def test_request_key_and_bpm_win(self):
        answer = self.run_tool(key='G', bpm=90)
        self.assertEqual((answer['key'], answer['bpm']), ('G', 90))

    def test_route_words_for_chord_lines(self):
        lines = [{'section': 'Verse', 'chords': ['C', 'Am', 'F', 'G']},
                 {'section': 'Verse', 'chords': ['C', 'Am', 'F', 'G']}]
        answer = self.run_tool(chordLines=lines)
        self.assertEqual(answer['route'], 'words')
        self.assertIn('sections', answer)
        self.assertIn('evidence', answer)

    def test_route_chart_runs_the_check(self):
        answer = self.run_tool(chart=chart('Test Song', BARS))
        self.assertEqual(answer['route'], 'chart')
        self.assertEqual(answer['check']['verdict'], 'lined up')
        self.assertEqual(self.calls, 1)

    def test_the_answer_names_the_recording_by_file_name_only(self):
        for extra in ({}, {'chart': chart('Test Song', BARS)}):
            answer = self.run_tool(**extra)
            self.assertNotIn('/', answer['recording'])
            self.assertNotIn(self.dir.name, json.dumps(answer))

    def test_a_missing_recording_exits_2(self):
        with self.assertRaises(SystemExit) as raised:
            self.run_tool(recording=os.path.join(self.dir.name, 'nothing.m4a'))
        self.assertEqual(raised.exception.code, 2)

    def fails(self, raw, analyze=None):
        err = io.StringIO()
        with contextlib.redirect_stderr(err), self.assertRaises(SystemExit) as raised:
            add_song.main(analyze=analyze or self.fake, stdin=io.StringIO(raw), stdout=io.StringIO())
        self.assertEqual(raised.exception.code, 2)
        self.assertNotIn('Traceback', err.getvalue())
        self.assertNotIn(self.dir.name, err.getvalue())
        return err.getvalue()

    def test_stdout_carries_only_the_answer(self):
        def noisy(path, cache):
            print('loading model...')
            return self.fake(path, cache)
        out, err = io.StringIO(), io.StringIO()
        request = json.dumps({'title': 'T', 'recording': self.audio})
        real = io.StringIO()
        with contextlib.redirect_stdout(real), contextlib.redirect_stderr(err):
            add_song.main(analyze=noisy, stdin=io.StringIO(request), stdout=out)
        self.assertEqual(real.getvalue(), '')
        self.assertEqual(json.loads(out.getvalue())['route'], 'record')
        self.assertIn('loading model', err.getvalue())

    def test_invalid_json_exits_2(self):
        self.fails('{nope')

    def test_missing_title_exits_2(self):
        self.fails(json.dumps({'recording': self.audio}))

    def test_bad_time_signature_exits_2(self):
        self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'timeSignature': 'fast'}))

    def test_a_reading_that_raises_exits_2_without_the_path(self):
        def boom(path, cache):
            raise ValueError(f'no beats in {path}')
        message = self.fails(json.dumps({'title': 'T', 'recording': self.audio}), boom)
        self.assertIn('song.m4a', message)

    def test_beats_per_bar(self):
        self.assertEqual([add_song.beats_per_bar(s) for s in ('4/4', '3/4', '6/8', '12/8', '7/8')],
                         [4, 3, 2, 4, 7])
