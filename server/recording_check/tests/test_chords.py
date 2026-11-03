"""Tests for chord parsing, comparing, spelling and shifting."""
import unittest

from recording_check.chords import Chord, parse, same, shift, spell


class ParseTests(unittest.TestCase):
    def test_parses_both_spellings(self):
        self.assertEqual(parse('F#/A#'), Chord(6, 'maj', 10))
        self.assertEqual(parse('A#:min7'), Chord(10, 'min', 10))
        self.assertEqual(parse('Bbmaj9(#11)/D'), Chord(10, 'maj', 2))
        self.assertEqual(parse('N.C.'), Chord(-1, 'none', -1))

    def test_no_chord_spellings(self):
        for s in ('N', 'X', 'N.C.', 'NC'):
            self.assertEqual(parse(s), Chord(-1, 'none', -1))

    def test_not_a_chord(self):
        for s in ('.', '', 'hello', 'Dog', 'H7'):
            self.assertIsNone(parse(s))

    def test_kinds(self):
        self.assertEqual(parse('G#m7b5').kind, 'dim')
        self.assertEqual(parse('Bdim').kind, 'dim')
        self.assertEqual(parse('F#:dim').kind, 'dim')
        self.assertEqual(parse('C#aug').kind, 'aug')
        self.assertEqual(parse('C:aug').kind, 'aug')
        self.assertEqual(parse('E5').kind, 'power')
        self.assertEqual(parse('Dsus4').kind, 'sus')
        self.assertEqual(parse('E:sus4').kind, 'sus')
        for s in ('G6', 'C7(b9)', 'Cmaj7', 'Cadd9', 'G:7', 'C9', 'A13'):
            self.assertEqual(parse(s).kind, 'maj', s)
        for s in ('Dm9', 'Am11', 'Am7', 'A:min', 'Am6'):
            self.assertEqual(parse(s).kind, 'min', s)

    def test_btc_bass_degrees(self):
        self.assertEqual(parse('D:maj/5'), Chord(2, 'maj', 9))
        self.assertEqual(parse('C:7/b7'), Chord(0, 'maj', 10))
        self.assertEqual(parse('C/3'), Chord(0, 'maj', 4))
        self.assertEqual(parse('A:min/b3'), Chord(9, 'min', 0))

    def test_no_slash_bass_is_root(self):
        self.assertEqual(parse('Am7').bass, 9)


class CompareTests(unittest.TestCase):
    def test_sevenths_are_the_same_chord(self):
        self.assertTrue(same(parse('Am7'), parse('A:min')))
        self.assertTrue(same(parse('Bbmaj9(#11)'), parse('A#')))

    def test_a_slash_bass_is_not(self):
        self.assertFalse(same(parse('F#/A#'), parse('F#')))

    def test_kind_matters(self):
        self.assertFalse(same(parse('A'), parse('Am')))


class SpellShiftTests(unittest.TestCase):
    def test_spell_by_key(self):
        self.assertEqual(spell(parse('A#:min'), 'Bb'), 'Bbm')
        self.assertEqual(spell(parse('A#:min'), 'B'), 'A#m')
        self.assertEqual(spell(parse('F#/A#'), 'B'), 'F#/A#')
        self.assertEqual(spell(parse('F#/A#'), 'Bb'), 'Gb/Bb')
        self.assertEqual(spell(parse('N'), 'C'), 'N.C.')

    def test_flat_and_sharp_minor_keys(self):
        self.assertEqual(spell(parse('A#'), 'Gm'), 'Bb')
        self.assertEqual(spell(parse('A#'), 'F#m'), 'A#')
        self.assertEqual(spell(parse('A#'), 'C'), 'Bb')

    def test_kind_suffixes(self):
        self.assertEqual(spell(parse('Bdim'), 'C'), 'Bdim')
        self.assertEqual(spell(parse('Caug'), 'C'), 'Caug')
        self.assertEqual(spell(parse('E5'), 'E'), 'E5')
        self.assertEqual(spell(parse('Dsus4'), 'D'), 'Dsus4')

    def test_shift(self):
        self.assertEqual(shift(parse('A#:min'), 1), parse('Bm'))
        self.assertEqual(shift(parse('B/D#'), 1), parse('C/E'))
        self.assertEqual(shift(parse('B'), -1), parse('Bb'))
        self.assertEqual(shift(parse('N'), 1), Chord(-1, 'none', -1))

    def test_spelling_follows_the_keys_own_scale(self):
        self.assertEqual(spell(parse('A/C#'), 'Dm'), 'A/C#')
        self.assertEqual(spell(parse('C#dim'), 'Dm'), 'C#dim')
        self.assertEqual(spell(parse('D/F#'), 'Gm'), 'D/F#')
        self.assertEqual(spell(parse('D/F#'), 'F'), 'D/F#')
        self.assertEqual(spell(parse('A#'), 'G'), 'Bb')
        self.assertEqual(spell(parse('A#'), 'Am'), 'Bb')

    def test_unusual_diatonic_names(self):
        self.assertEqual(spell(parse('F'), 'C#'), 'E#')
        self.assertEqual(spell(parse('B'), 'Gb'), 'Cb')
        self.assertEqual(spell(parse('C'), 'C#'), 'B#')

    def test_a_flat_degree_takes_its_scale_letter(self):
        # b6 of Eb is Cb, b7 of Db is Cb, b2 of Ebm is Fb, b6 of Ab is Fb
        self.assertEqual(spell(parse('G#m/B'), 'Eb'), 'Abm/Cb')
        self.assertEqual(spell(parse('B'), 'Db'), 'Cb')
        self.assertEqual(spell(parse('E'), 'Ebm'), 'Fb')
        self.assertEqual(spell(parse('E'), 'Ab'), 'Fb')
        self.assertEqual(spell(parse('G#m/B'), 'Abm'), 'Abm/Cb')
        # sharp keys keep their names
        self.assertEqual(spell(parse('G'), 'A'), 'G')
        self.assertEqual(spell(parse('E'), 'F#'), 'E')
        self.assertEqual(spell(parse('Bb'), 'C'), 'Bb')

    def test_sus2_stays_sus2(self):
        self.assertEqual(spell(parse('Dsus2'), 'D'), 'Dsus2')
        self.assertEqual(spell(parse('Dsus4'), 'D'), 'Dsus4')
        self.assertEqual(spell(parse('Dsus'), 'D'), 'Dsus4')
        self.assertTrue(same(parse('Dsus2'), parse('Dsus4')))
        self.assertEqual(spell(shift(parse('Dsus2'), 2), 'E'), 'Esus2')

    def test_dash_and_plus_spellings(self):
        self.assertEqual(parse('C-7').kind, 'min')
        self.assertEqual(parse('C7+').kind, 'aug')
        self.assertEqual(parse('C7#5').kind, 'aug')
        self.assertEqual(parse('Cmaj7#11').kind, 'maj')

    def test_six_nine_is_not_a_slash_bass(self):
        self.assertEqual(parse('C6/9'), Chord(0, 'maj', 0))

    def test_double_flat_is_not_a_chord(self):
        self.assertIsNone(parse('Bbb'))


if __name__ == '__main__':
    unittest.main()
