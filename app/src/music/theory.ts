const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
// C major and A minor have no key signature, but their borrowed chords are
// written flat by convention (Bb, Eb, Ab), so they belong with the flat keys.
const FLAT_KEYS = new Set([
  'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Am', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm',
]);
const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug', '9', 'add9', '6'] as const;

// Major scale intervals and qualities
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
// vii is half-diminished (m7b5), not a plain m7 — Bm7b5 in C, not Bm7.
const MAJOR_7TH_QUALITIES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];

// Minor scale intervals and qualities
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', ''];
// ii is half-diminished in natural minor — Bm7b5 in A minor.
const MINOR_7TH_QUALITIES = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'];

function parseChord(chord: string): { root: string; quality: string } {
  // Handle flat root (e.g., Bb, Eb)
  if (chord.length >= 2 && chord[1] === 'b') {
    return { root: chord.slice(0, 2), quality: chord.slice(2) };
  }
  // Handle sharp root (e.g., C#, F#)
  if (chord.length >= 2 && chord[1] === '#') {
    return { root: chord.slice(0, 2), quality: chord.slice(2) };
  }
  // Single letter root
  return { root: chord.slice(0, 1), quality: chord.slice(1) };
}

const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/**
 * Pitch class of a note name in any spelling, including the Cb, Fb, E# and
 * B# that songbooks use. Cb used to read as unknown, so a chart with Cb7 in
 * it kept that chord at its old pitch when the song was transposed.
 */
function noteToIndex(note: string): number {
  const m = /^([A-G])(#{0,2}|b{0,2})$/.exec(note);
  if (!m) return -1;
  const shift = m[2].startsWith('#') ? m[2].length : -m[2].length;
  return (((LETTER_PC[LETTERS.indexOf(m[1])] + shift) % 12) + 12) % 12;
}

/** A pitch spelled on a given letter (B with pitch 10 is Bb), or null if that needs a double accidental. */
function spellOnLetter(letterIndex: number, pitch: number): string | null {
  const diff = ((pitch - LETTER_PC[letterIndex] + 18) % 12) - 6;
  if (diff === 0) return LETTERS[letterIndex];
  if (diff === 1) return LETTERS[letterIndex] + '#';
  if (diff === -1) return LETTERS[letterIndex] + 'b';
  return null;
}

function indexToNote(index: number, useFlats: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return useFlats ? FLATS[i] : SHARPS[i];
}

/**
 * `letterShift` moves every note name by the same number of letters as the
 * key moves, which keeps the chart's own spelling: down from Eb to D, Cb7
 * becomes Bb7 (not A#7) and Edim7 becomes D#dim7. Without it, sharps or
 * flats follow `useFlats`.
 */
export function transposeChord(chord: string, semitones: number, useFlats: boolean, letterShift?: number): string {
  // Handle slash chords (e.g., C/E)
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    const transposedMain = transposeChord(main, semitones, useFlats, letterShift);
    const transposedBass = transposeChord(bass, semitones, useFlats, letterShift);
    return `${transposedMain}/${transposedBass}`;
  }

  const { root, quality } = parseChord(chord);
  const rootIndex = noteToIndex(root);
  if (rootIndex === -1) return chord; // Unknown root, return as-is
  const newIndex = ((rootIndex + semitones) % 12 + 12) % 12;
  const spelled =
    letterShift === undefined
      ? null
      : spellOnLetter((((LETTERS.indexOf(root[0]) + letterShift) % 7) + 7) % 7, newIndex);
  return `${spelled ?? indexToNote(newIndex, useFlats)}${quality}`;
}

/**
 * Transpose every chord token in a chord line, preserving the exact runs of
 * whitespace so the visual alignment of the chart is untouched.
 */
export function transposeText(text: string, semitones: number, useFlats: boolean, letterShift?: number): string {
  if (!semitones) return text;
  return text
    .split(/(\s+)/)
    .map(token => (token.trim() === '' ? token : transposeChord(token, semitones, useFlats, letterShift)))
    .join('');
}

/**
 * How a chart in `key` is spelled once moved by `semitones`: sharps or flats
 * by the new key, and note letters moved by the same step as the key's.
 */
export function keySpelling(key: string, semitones: number): { useFlats: boolean; letterShift?: number } {
  const useFlats = shouldUseFlats(key, semitones);
  const { root } = parseChord(key);
  const from = noteToIndex(root);
  if (from === -1) return { useFlats };
  const target = indexToNote(from + semitones, useFlats);
  return { useFlats, letterShift: (((LETTERS.indexOf(target[0]) - LETTERS.indexOf(root[0])) % 7) + 7) % 7 };
}

/** A chord line from a chart in `key`, as it reads moved by `semitones`. */
export function transposeInKey(text: string, key: string, semitones: number): string {
  if (!semitones) return text;
  const { useFlats, letterShift } = keySpelling(key, semitones);
  return transposeText(text, semitones, useFlats, letterShift);
}

/**
 * Directions that sit in a chord line but are not chords: "no chord" and
 * repeat counts like (x3). They are drawn smaller so they never read as
 * something to play.
 */
export function isChartMark(token: string): boolean {
  return /^(N\.?C\.?|\(?x\d+\)?)$/i.test(token);
}

export function shouldUseFlats(key: string, semitones: number): boolean {
  // Transpose the key and check if the result is in FLAT_KEYS
  const { root, quality } = parseChord(key);
  const rootIndex = noteToIndex(root);
  if (rootIndex === -1) return false;
  const newIndex = ((rootIndex + semitones) % 12 + 12) % 12;

  // Check both sharp and flat versions against FLAT_KEYS
  const sharpName = SHARPS[newIndex] + quality;
  const flatName = FLATS[newIndex] + quality;
  return FLAT_KEYS.has(sharpName) || FLAT_KEYS.has(flatName);
}

function buildDiatonicChords(key: string, intervals: number[], qualities: string[]): string[] {
  const { root } = parseChord(key);
  const rootIndex = noteToIndex(root);
  const useFlats = FLAT_KEYS.has(key);
  const letter = LETTERS.indexOf(root[0]);

  return intervals.map((interval, i) => {
    const noteIndex = ((rootIndex + interval) % 12 + 12) % 12;
    // Each degree on its own letter: the 7th of F# is E#, not F, and the 4th of Gb is Cb, not B
    const note = spellOnLetter((letter + i) % 7, noteIndex) ?? indexToNote(noteIndex, useFlats);
    return `${note}${qualities[i]}`;
  });
}

export function getDiatonicChords(key: string): string[] {
  const { quality } = parseChord(key);
  const isMinor = quality === 'm';
  return buildDiatonicChords(
    key,
    isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS,
    isMinor ? MINOR_QUALITIES : MAJOR_QUALITIES,
  );
}

export function getDiatonic7ths(key: string): string[] {
  const { quality } = parseChord(key);
  const isMinor = quality === 'm';
  return buildDiatonicChords(
    key,
    isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS,
    isMinor ? MINOR_7TH_QUALITIES : MAJOR_7TH_QUALITIES,
  );
}

export function sectionColor(name: string): string {
  // "Bridge 2" is still a bridge
  const lower = name.toLowerCase().replace(/[\s-_]/g, '').replace(/\d+$/, '');
  if (lower === 'verse') return 'var(--section-verse)';
  if (lower === 'chorus') return 'var(--section-chorus)';
  if (lower === 'bridge') return 'var(--section-bridge)';
  if (lower === 'prechorus') return 'var(--section-prechorus)';
  if (lower === 'intro' || lower === 'outro') return 'var(--section-intro)';
  return 'var(--section-default)';
}

/**
 * The V and V7 of a minor key, which songs in minor nearly always use in
 * place of the natural minor's own v: E and E7 in A minor. Empty for a major key.
 */
export function getMinorDominants(key: string): string[] {
  const { root, quality } = parseChord(key);
  const rootIndex = noteToIndex(root);
  if (quality !== 'm' || rootIndex === -1) return [];
  const pitch = (rootIndex + 7) % 12;
  const note = spellOnLetter((LETTERS.indexOf(root[0]) + 4) % 7, pitch) ?? indexToNote(pitch, FLAT_KEYS.has(key));
  return [note, `${note}7`];
}

/** Sharps or flats for the roots of a key: as the key itself is written, else by its key signature. */
export function keyUsesFlats(key: string): boolean {
  const { root } = parseChord(key);
  if (root.endsWith('#')) return false;
  if (root.endsWith('b')) return true;
  return shouldUseFlats(key, 0);
}

/** The twelve roots, spelled with flats or sharps. */
export function getRoots(useFlats: boolean): string[] {
  return useFlats ? [...FLATS] : [...SHARPS];
}

export function getAllChordNames(useFlats: boolean): string[] {
  const roots = useFlats ? [...FLATS] : [...SHARPS];
  const chords: string[] = [];
  for (const root of roots) {
    for (const quality of QUALITIES) {
      chords.push(`${root}${quality}`);
    }
  }
  return chords;
}
