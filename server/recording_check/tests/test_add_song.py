"""add_song: one JSON request in, one JSON answer out; the record is read once."""
import contextlib
import io
import json
import os
import tempfile
import unittest

import numpy as np

import add_song
from recording_check.key import fold_bpm
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

    def test_a_bad_time_signature_stops_before_the_record_is_read(self):
        for signature in ('fast', '0/4', '4/0'):
            message = self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'timeSignature': signature}))
            self.assertIn('bad time signature', message)
            self.assertNotIn('cannot read the recording', message)
        self.assertEqual(self.calls, 0)

    def test_a_reading_that_raises_exits_2_without_the_path(self):
        def boom(path, cache):
            raise ValueError(f'no beats in {path}')
        message = self.fails(json.dumps({'title': 'T', 'recording': self.audio}), boom)
        self.assertIn('song.m4a', message)

    def test_beats_per_bar(self):
        self.assertEqual([add_song.beats_per_bar(s) for s in ('4/4', '3/4', '6/8', '12/8', '7/8', '3/8', '9/8')],
                         [4, 3, 2, 4, 7, 3, 3])

    def test_a_given_bpm_lays_the_bars_at_that_tempo(self):
        at_tracker = self.run_tool()
        doubled = self.run_tool(bpm=200)   # the tracker reads 100
        self.assertEqual(doubled['bpm'], 200)
        self.assertEqual(len(doubled['form']), 2 * len(at_tracker['form']))

    def run_noting(self, **request):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            answer = self.run_tool(**request)
        return answer, err.getvalue()

    def test_a_given_bpm_far_from_the_tracker_is_warned(self):
        answer, err = self.run_noting(bpm=150)
        self.assertEqual(answer['bpm'], 150)
        self.assertIn('bars are laid at 200 bpm', err)
        for near in (100, 104, 50):
            self.assertNotIn('bars are laid', self.run_noting(bpm=near)[1])

    def test_a_tracker_with_no_tempo_still_takes_a_given_bpm(self):
        def no_tempo(path, cache):
            return dict(self.fake(path, cache), bpm=0)
        out = io.StringIO()
        with contextlib.redirect_stderr(io.StringIO()):
            add_song.main(analyze=no_tempo, stdout=out,
                          stdin=io.StringIO(json.dumps({'title': 'T', 'recording': self.audio, 'bpm': 100})))
        self.assertEqual(json.loads(out.getvalue())['bpm'], 100)

    def test_a_tracker_with_no_tempo_writes_the_tempo_of_its_beats(self):
        def no_tempo(path, cache):
            return dict(self.fake(path, cache), bpm=0)
        out = io.StringIO()
        with contextlib.redirect_stderr(io.StringIO()):
            add_song.main(analyze=no_tempo, stdout=out,
                          stdin=io.StringIO(json.dumps({'title': 'T', 'recording': self.audio})))
        fake = self.fake(self.audio, None)
        spacing = (fake['beats'][-1] - fake['beats'][0]) / (len(fake['beats']) - 1)
        self.assertEqual(json.loads(out.getvalue())['bpm'], fold_bpm(60 / spacing))

    def test_a_bpm_given_as_zero_or_out_of_range_exits_2(self):
        for bpm in (0, 0.0, 19, 401, 30000, 1e9):
            message = self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'bpm': bpm}))
            self.assertIn('bpm', message)
        message = self.fails(json.dumps({'title': 'T', 'recording': self.audio,
                                         'chart': dict(chart('T', BARS), bpm=0)}))
        self.assertIn('bpm', message)
        self.assertEqual(self.calls, 0)
        self.assertEqual(self.run_tool(bpm=20)['bpm'], 20)
        self.assertEqual(self.run_tool(bpm=400)['bpm'], 400)

    def test_a_bpm_that_is_not_a_tempo_exits_2(self):
        for bpm in ('fast', -3):
            message = self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'bpm': bpm}))
            self.assertIn('bpm', message)
        self.assertEqual(self.calls, 0)

    def test_compound_time_with_no_barred_chart_is_refused_before_reading(self):
        for signature in ('6/8', '9/8', '12/8'):
            message = self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'timeSignature': signature}))
            self.assertIn(signature, message)
            self.assertIn('barred chart', message)
        self.assertEqual(self.calls, 0)
        self.assertEqual(self.run_tool(timeSignature='3/8')['timeSignature'], '3/8')

    def test_compound_time_with_a_barred_chart_runs_the_check(self):
        answer = self.run_tool(chart=chart('Test Song', BARS), timeSignature='6/8')
        self.assertEqual(answer['route'], 'chart')

    def test_a_chart_that_is_not_an_object_exits_2(self):
        message = self.fails(json.dumps({'title': 'T', 'recording': self.audio, 'chart': ['C']}))
        self.assertIn('chart', message)

    def test_an_answer_that_cannot_be_written_exits_2(self):
        for bad in (np.float32(1.5), float('nan')):
            def odd(path, cache, bad=bad):
                return dict(self.fake(path, cache), duration=bad)
            message = self.fails(json.dumps({'title': 'T', 'recording': self.audio}), odd)
            self.assertIn('cannot write the answer', message)
