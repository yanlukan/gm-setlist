import { describe, it, expect } from 'vitest';
import {
  transposeChord,
  transposeText,
  shouldUseFlats,
  getDiatonicChords,
  getDiatonic7ths,
  getMinorDominants,
  keyUsesFlats,
  sectionColor,
  getAllChordNames,
  isChartMark,
  transposeInKey,
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

describe('isChartMark', () => {
  it('knows "no chord" and repeat counts are not chords', () => {
    for (const token of ['N.C.', 'NC', 'n.c.', '(x3)', 'x2', '(x12)']) expect(isChartMark(token), token).toBe(true);
    for (const token of ['C', 'Cm7', 'Bbm', 'Dsus4', 'G/B', 'x', '(x)']) expect(isChartMark(token), token).toBe(false);
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

  it('spells each degree on its own letter, as the key signature has it', () => {
    // Was Fdim in F#, and B in Gb and Ebm
    expect(getDiatonicChords('F#')).toEqual(['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim']);
    expect(getDiatonicChords('Gb')).toEqual(['Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ebm', 'Fdim']);
    expect(getDiatonicChords('Ebm')).toEqual(['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db']);
    expect(getDiatonic7ths('F#')[6]).toBe('E#m7b5');
  });

  it('returns 7 chords', () => {
    expect(getDiatonicChords('D')).toHaveLength(7);
  });
});

describe('getDiatonic7ths', () => {
  it('returns correct 7th chords for C major', () => {
    // The seventh degree is half-diminished: Bm7b5, not Bm7.
    expect(getDiatonic7ths('C')).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
  });

  it('returns correct 7th chords for A minor', () => {
    // The second degree of natural minor is half-diminished: Bm7b5.
    expect(getDiatonic7ths('Am')).toEqual(['Am7', 'Bm7b5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
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

  it('returns true for C — borrowed chords in C are written flat', () => {
    // C has no key signature, but its non-diatonic chords are spelled Bb/Eb/Ab
    // by convention. Spelling them A#/D#/G# on a chart is wrong and slows
    // reading on stage.
    expect(shouldUseFlats('C', 0)).toBe(true);
  });

  it('accounts for transposition', () => {
    // C transposed up 5 = F, which is a flat key
    expect(shouldUseFlats('C', 5)).toBe(true);
    // C transposed up 7 = G, not a flat key
    expect(shouldUseFlats('C', 7)).toBe(false);
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

  it('colours a numbered section like its family', () => {
    expect(sectionColor('Bridge 2')).toBe('var(--section-bridge)');
    expect(sectionColor('Verse 3')).toBe('var(--section-verse)');
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

describe('chord spelling when transposing', () => {
  it('writes the flat seventh of C as Bb, not A#', () => {
    // I'm Your Man down a tone: D -> C, so the bVII must read Bb.
    const useFlats = shouldUseFlats('D', -2)
    expect(transposeText('D  G  C  D  G  C', -2, useFlats)).toBe('C  F  Bb  C  F  Bb')
  })

  it('keeps sharp keys sharp', () => {
    const useFlats = shouldUseFlats('C', 2)
    expect(transposeText('C  F  G', 2, useFlats)).toBe('D  G  A')
    expect(shouldUseFlats('C', 2)).toBe(false)
  })

  it('preserves the spacing of the chart', () => {
    expect(transposeText('A   B     C', 1, false)).toBe('A#   C     C#')
  })
})

describe('moving a chart to another key keeps its own spelling', () => {
  const book = 'Eb6  Edim7  Fm7  Cb(b5)  Bb7  Cb7  Abm6  Fdim/Eb  Db/C  Ebmaj9';

  it('moves the Cb, Fb, E# and B# that songbooks use', () => {
    // Cb used to be unreadable, so a Cb7 stayed at its old pitch
    expect(transposeChord('Cb7', 1, true)).toBe('C7');
    expect(transposeChord('Fb', 1, false)).toBe('F');
    expect(transposeChord('E#m', -1, false)).toBe('Em');
    expect(transposeChord('B#', 1, false)).toBe('C#');
  });

  it('reads Kissing a Fool in D the way the book reads in Eb', () => {
    // Bb7, not A#7; the passing chord up to Em7 is D#dim7
    expect(transposeInKey(book, 'Eb', -1)).toBe('D6  D#dim7  Em7  Bb(b5)  A7  Bb7  Gm6  Edim/D  C/B  Dmaj9');
  });

  it('comes back to exactly the same spelling, so edits made in D store the book\'s names', () => {
    expect(transposeInKey(transposeInKey(book, 'Eb', -1), 'D', 1)).toBe(book);
  });
});

describe('getMinorDominants', () => {
  it('gives the major V and V7 of a minor key', () => {
    expect(getMinorDominants('Am')).toEqual(['E', 'E7']);
    expect(getMinorDominants('Bbm')).toEqual(['F', 'F7']);
    expect(getMinorDominants('C#m')).toEqual(['G#', 'G#7']);
    expect(getMinorDominants('Gm')).toEqual(['D', 'D7']);
  });

  it('gives nothing for a major key', () => {
    expect(getMinorDominants('C')).toEqual([]);
  });
});

describe('keyUsesFlats', () => {
  it('follows how the key itself is written', () => {
    expect(keyUsesFlats('F#')).toBe(false);
    expect(keyUsesFlats('Gb')).toBe(true);
    expect(keyUsesFlats('C')).toBe(true);
    expect(keyUsesFlats('G')).toBe(false);
  });
});
