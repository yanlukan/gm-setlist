"""audio's cache: a replaced recording of the same name is read again."""
import json
import os
import tempfile
import threading
import unittest
from unittest import mock

from recording_check import audio


class CacheTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.audio = os.path.join(self.dir.name, 'song.m4a')
        self.cache = os.path.join(self.dir.name, 'cache', 'song.json')
        self.record(b'first take')
        self.reads = []
        self.addCleanup(setattr, audio, '_read', audio._read)
        audio._read = self.fake_read

    def record(self, data, mtime=1_000_000):
        with open(self.audio, 'wb') as f:
            f.write(data)
        os.utime(self.audio, (mtime, mtime))

    def fake_read(self, path, cached):
        self.reads.append(dict(cached))
        return {'version': audio.VERSION, 'recording': os.path.basename(path), 'chords': ['read']}

    def write_cache(self, **extra):
        os.makedirs(os.path.dirname(self.cache), exist_ok=True)
        entry = {'version': audio.VERSION, 'recording': 'song.m4a', 'chords': ['cached']}
        entry.update(extra)
        with open(self.cache, 'w') as f:
            json.dump(entry, f)

    def stored(self):
        with open(self.cache) as f:
            return json.load(f)

    def test_a_fresh_read_is_stamped_and_then_reused(self):
        first = audio.analyze(self.audio, self.cache)
        self.assertEqual(first['source'], audio.source_of(self.audio))
        self.assertEqual(self.stored()['source'], first['source'])
        self.assertEqual(audio.analyze(self.audio, self.cache)['chords'], ['read'])
        self.assertEqual(len(self.reads), 1)

    def test_an_unstamped_cache_is_trusted_once_and_stamped(self):
        self.write_cache()
        self.assertEqual(audio.analyze(self.audio, self.cache)['chords'], ['cached'])
        self.assertEqual(self.reads, [])
        self.assertEqual(self.stored()['source'], audio.source_of(self.audio))

    def test_a_replaced_recording_is_read_again_and_keeps_nothing_old(self):
        self.write_cache(source=audio.source_of(self.audio))
        self.record(b'a longer second take', mtime=2_000_000)
        self.assertEqual(audio.analyze(self.audio, self.cache)['chords'], ['read'])
        self.assertEqual(self.reads, [{}])   # not even the old BTC chords are reused
        self.assertEqual(self.stored()['source'], audio.source_of(self.audio))

    def test_a_touched_recording_of_the_same_size_is_read_again(self):
        self.write_cache(source=audio.source_of(self.audio))
        self.record(b'first take', mtime=3_000_000)
        audio.analyze(self.audio, self.cache)
        self.assertEqual(len(self.reads), 1)

    def test_another_file_of_the_same_stem_is_read_again(self):
        self.write_cache(recording='song.mp3')
        audio.analyze(self.audio, self.cache)
        self.assertEqual(self.reads, [{}])

    def test_an_old_version_reuses_btc_only_for_the_same_recording(self):
        self.write_cache(version=audio.VERSION - 1, source=audio.source_of(self.audio))
        audio.analyze(self.audio, self.cache)
        self.assertEqual(self.reads[0]['chords'], ['cached'])

    def test_a_stamp_that_cannot_be_written_still_returns_the_cache(self):
        self.write_cache()
        with mock.patch('recording_check.audio.os.replace', side_effect=PermissionError(13, 'denied', self.cache)):
            self.assertEqual(audio.analyze(self.audio, self.cache)['chords'], ['cached'])
        self.assertEqual(self.reads, [])
        self.assertEqual(os.listdir(os.path.dirname(self.cache)), ['song.json'])   # no temp left behind

    def test_a_read_only_cache_folder_still_returns_the_cache(self):
        self.write_cache()
        folder = os.path.dirname(self.cache)
        os.chmod(folder, 0o555)
        self.addCleanup(os.chmod, folder, 0o755)
        self.assertEqual(audio.analyze(self.audio, self.cache)['chords'], ['cached'])

    def test_stamping_the_same_cache_at_once_never_fails_or_corrupts_it(self):
        errors = []
        for _ in range(3):
            self.write_cache(chroma=[[0.1234] * 12] * 20000)
            def go():
                try:
                    audio.analyze(self.audio, self.cache)
                except Exception as error:   # noqa: BLE001
                    errors.append(error)
            threads = [threading.Thread(target=go) for _ in range(4)]
            [t.start() for t in threads]
            [t.join() for t in threads]
            self.assertEqual(self.stored()['source'], audio.source_of(self.audio))
        self.assertEqual(errors, [])
        self.assertEqual(os.listdir(os.path.dirname(self.cache)), ['song.json'])
