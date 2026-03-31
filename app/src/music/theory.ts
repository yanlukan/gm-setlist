const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);
const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug', '9', 'add9', '6'] as const;

// Major scale intervals and qualities
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const MAJOR_7TH_QUALITIES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7'];

// Minor scale intervals and qualities
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', ''];
const MINOR_7TH_QUALITIES = ['m7', 'm7', 'maj7', 'm7', 'm7', 'maj7', '7'];

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

function noteToIndex(note: string): number {
  let idx = SHARPS.indexOf(note as typeof SHARPS[number]);
  if (idx === -1) {
    idx = FLATS.indexOf(note as typeof FLATS[number]);
  }
  return idx;
}

function indexToNote(index: number, useFlats: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return useFlats ? FLATS[i] : SHARPS[i];
}

export function transposeChord(chord: string, semitones: number, useFlats: boolean): string {
  // Handle slash chords (e.g., C/E)
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    const transposedMain = transposeChord(main, semitones, useFlats);
    const transposedBass = transposeChord(bass, semitones, useFlats);
    return `${transposedMain}/${transposedBass}`;
  }

  const { root, quality } = parseChord(chord);
  const rootIndex = noteToIndex(root);
  if (rootIndex === -1) return chord; // Unknown root, return as-is
  const newIndex = ((rootIndex + semitones) % 12 + 12) % 12;
  const newRoot = indexToNote(newIndex, useFlats);
  return `${newRoot}${quality}`;
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

  return intervals.map((interval, i) => {
    const noteIndex = ((rootIndex + interval) % 12 + 12) % 12;
    const note = indexToNote(noteIndex, useFlats);
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
  const lower = name.toLowerCase().replace(/[\s-_]/g, '');
  if (lower === 'verse') return 'var(--section-verse)';
  if (lower === 'chorus') return 'var(--section-chorus)';
  if (lower === 'bridge') return 'var(--section-bridge)';
  if (lower === 'prechorus') return 'var(--section-prechorus)';
  if (lower === 'intro' || lower === 'outro') return 'var(--section-intro)';
  return 'var(--section-default)';
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
