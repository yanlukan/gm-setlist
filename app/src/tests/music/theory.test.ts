import { describe, it, expect } from 'vitest';
import {
  transposeChord,
  shouldUseFlats,
  getDiatonicChords,
  getDiatonic7ths,
  getCurrentKey,
  sectionColor,
  getAllChordNames,
} from '../../music/theory';

describe('transposeChord', () => {
  it('transposes a major chord up', () => {
    expect(transposeChord('C', 2, false)).toBe('D');
    expect(transposeChord('G', 5, false)).toBe('C');
  });

  it('transposes a minor chord', () => {
    expect(transposeChord('Am', 3, false)).toBe('Cm');
    expect(transposeChord('Em', 2, false)).toBe('F#m');
  });

  it('uses flats when requested', () => {
    expect(transposeChord('C', 1, true)).toBe('Db');
    expect(transposeChord('A', 1, true)).toBe('Bb');
    expect(transposeChord('Em', 2, true)).toBe('Gbm');
  });

  it('uses sharps when not using flats', () => {
    expect(transposeChord('C', 1, false)).toBe('C#');
    expect(transposeChord('A', 1, false)).toBe('A#');
  });

  it('handles slash chords', () => {
    expect(transposeChord('C/E', 2, false)).toBe('D/F#');
    expect(transposeChord('Am/G', 3, true)).toBe('Cm/Bb');
  });

  it('handles 7th chords', () => {
    expect(transposeChord('Am7', 2, false)).toBe('Bm7');
    expect(transposeChord('Cmaj7', 4, false)).toBe('Emaj7');
    expect(transposeChord('G7', 1, true)).toBe('Ab7');
  });

  it('wraps around the octave', () => {
    expect(transposeChord('B', 1, false)).toBe('C');
    expect(transposeChord('A', 5, false)).toBe('D');
    expect(transposeChord('G#', 4, false)).toBe('C');
  });

  it('transposes down (negative semitones)', () => {
    expect(transposeChord('D', -2, false)).toBe('C');
    expect(transposeChord('C', -1, true)).toBe('B');
    expect(transposeChord('Am', -3, false)).toBe('F#m');
  });

  it('returns original chord for zero semitones', () => {
    expect(transposeChord('C', 0, false)).toBe('C');
    expect(transposeChord('F#m', 0, false)).toBe('F#m');
  });
});

describe('getDiatonicChords', () => {
  it('returns correct triads for C major', () => {
    expect(getDiatonicChords('C')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  });

  it('returns correct triads for A minor', () => {
    expect(getDiatonicChords('Am')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  it('returns correct triads for G major', () => {
    expect(getDiatonicChords('G')).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
  });

  it('uses flats for flat keys', () => {
    const chords = getDiatonicChords('F');
    expect(chords).toEqual(['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']);
  });

  it('uses flats for Bb major', () => {
    const chords = getDiatonicChords('Bb');
    expect(chords).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim']);
  });

  it('returns 7 chords', () => {
    expect(getDiatonicChords('D')).toHaveLength(7);
  });
});

describe('getDiatonic7ths', () => {
  it('returns correct 7th chords for C major', () => {
    expect(getDiatonic7ths('C')).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7']);
  });

  it('returns correct 7th chords for A minor', () => {
    expect(getDiatonic7ths('Am')).toEqual(['Am7', 'Bm7', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
  });
});

describe('shouldUseFlats', () => {
  it('returns true for F', () => {
    expect(shouldUseFlats('F', 0)).toBe(true);
  });

  it('returns false for G', () => {
    expect(shouldUseFlats('G', 0)).toBe(false);
  });

  it('returns true for Dm', () => {
    expect(shouldUseFlats('Dm', 0)).toBe(true);
  });

  it('returns false for C', () => {
    expect(shouldUseFlats('C', 0)).toBe(false);
  });

  it('accounts for transposition', () => {
    // C transposed up 5 = F, which is a flat key
    expect(shouldUseFlats('C', 5)).toBe(true);
    // C transposed up 7 = G, not a flat key
    expect(shouldUseFlats('C', 7)).toBe(false);
  });
});

describe('getCurrentKey', () => {
  it('returns editedKey when provided', () => {
    expect(getCurrentKey('C', 'G')).toBe('G');
  });

  it('returns originalKey when editedKey is undefined', () => {
    expect(getCurrentKey('C')).toBe('C');
    expect(getCurrentKey('Am', undefined)).toBe('Am');
  });
});

describe('sectionColor', () => {
  it('returns verse color', () => {
    expect(sectionColor('verse')).toBe('var(--section-verse)');
    expect(sectionColor('Verse')).toBe('var(--section-verse)');
  });

  it('returns chorus color', () => {
    expect(sectionColor('chorus')).toBe('var(--section-chorus)');
    expect(sectionColor('Chorus')).toBe('var(--section-chorus)');
  });

  it('returns bridge color', () => {
    expect(sectionColor('bridge')).toBe('var(--section-bridge)');
  });

  it('returns pre-chorus color', () => {
    expect(sectionColor('pre-chorus')).toBe('var(--section-prechorus)');
    expect(sectionColor('Pre-Chorus')).toBe('var(--section-prechorus)');
    expect(sectionColor('prechorus')).toBe('var(--section-prechorus)');
  });

  it('returns intro color for intro and outro', () => {
    expect(sectionColor('intro')).toBe('var(--section-intro)');
    expect(sectionColor('outro')).toBe('var(--section-intro)');
    expect(sectionColor('Intro')).toBe('var(--section-intro)');
  });

  it('returns default for unknown sections', () => {
    expect(sectionColor('solo')).toBe('var(--section-default)');
    expect(sectionColor('unknown')).toBe('var(--section-default)');
  });
});

describe('getAllChordNames', () => {
  it('returns 144 chord names', () => {
    expect(getAllChordNames(false)).toHaveLength(144);
    expect(getAllChordNames(true)).toHaveLength(144);
  });

  it('includes basic chords', () => {
    const chords = getAllChordNames(false);
    expect(chords).toContain('C');
    expect(chords).toContain('Am7');
    expect(chords).toContain('F#dim');
  });

  it('uses flats when requested', () => {
    const chords = getAllChordNames(true);
    expect(chords).toContain('Bb');
    expect(chords).toContain('Ebm');
    expect(chords).not.toContain('C#');
    expect(chords).toContain('Db');
  });

  it('uses sharps when not using flats', () => {
    const chords = getAllChordNames(false);
    expect(chords).toContain('C#');
    expect(chords).toContain('F#');
    expect(chords).not.toContain('Db');
  });
});
