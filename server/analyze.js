import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python3');
const SCRIPT = path.join(__dirname, 'analyze.py');

export function analyzeLocal(filePath, onProgress, startTimeHint = 0) {
  return new Promise((resolve, reject) => {
    onProgress?.({ stage: 'analyzing', message: 'Analyzing audio (chords, key, tempo, sections)...' });

    const args = [SCRIPT, filePath];
    if (startTimeHint > 0) args.push(String(startTimeHint));

    const proc = spawn(PYTHON, args, {
      timeout: 600000, // 10 min — librosa segmentation is slow on long songs
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        // Filter out Python warnings from stderr
        const errorLines = stderr.split('\n').filter(l => !l.includes('Warning') && !l.includes('FutureWarning') && l.trim());
        return reject(new Error(`Analysis failed: ${errorLines.join(' ') || 'unknown error (exit code ' + code + ')'}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));

        onProgress?.({ stage: 'formatting', message: 'Formatting results...' });

        const formatted = formatResults(result);
        resolve(formatted);
      } catch (err) {
        reject(new Error('Failed to parse analysis results'));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start analysis: ${err.message}`));
    });
  });
}

/**
 * Find the shortest repeating pattern in a chord sequence.
 * e.g., [Am, C, G, F, Am, C, G, F] → [Am, C, G, F]
 */
function simplifyChords(chords) {
  if (chords.length <= 4) return chords;

  // Try exact repeating patterns (length 2 to half)
  for (let plen = 2; plen <= Math.floor(chords.length / 2); plen++) {
    const pattern = chords.slice(0, plen);
    let matches = true;
    for (let i = plen; i < chords.length; i++) {
      if (chords[i] !== pattern[i % plen]) {
        matches = false;
        break;
      }
    }
    if (matches) return pattern;
  }

  // Try approximate: if first half ≈ second half (70%+ match)
  const half = Math.floor(chords.length / 2);
  if (half >= 2) {
    const first = chords.slice(0, half);
    const second = chords.slice(half, half * 2);
    const matchCount = first.filter((c, i) => second[i] === c).length;
    if (matchCount / half > 0.7) return first;
  }

  // If still too many chords (>12), just keep the most common ones in order
  if (chords.length > 12) {
    const seen = new Set();
    const unique = [];
    for (const c of chords) {
      if (!seen.has(c)) {
        seen.add(c);
        unique.push(c);
      }
    }
    return unique;
  }

  return chords;
}

function formatResults(raw) {
  const { key, keyConfidence, bpm, timeSignature, chords, sections, musicStart } = raw;

  const formattedSections = sections.map(section => {
    const sectionChords = chords.filter(c =>
      c.time >= section.start && c.time < section.end
    );

    // Deduplicate consecutive same chords
    const deduped = [];
    for (const c of sectionChords) {
      if (deduped.length === 0 || deduped[deduped.length - 1].chord !== c.chord) {
        deduped.push(c);
      }
    }

    // Find repeating pattern to simplify
    const chordNames = deduped.map(c => c.chord);
    const simplified = simplifyChords(chordNames);
    const simplifiedDetail = simplified.map(name => {
      const match = deduped.find(c => c.chord === name);
      return { chord: name, confidence: match ? match.confidence : 0 };
    });

    const avgConfidence = simplifiedDetail.length > 0
      ? simplifiedDetail.reduce((sum, c) => sum + c.confidence, 0) / simplifiedDetail.length
      : 0;

    return {
      name: section.name,
      chords: simplified.join('  '),
      chordsDetail: simplifiedDetail,
      confidence: Math.round(avgConfidence * 100),
    };
  });

  const overallConfidence = formattedSections.length > 0
    ? Math.round(formattedSections.reduce((s, sec) => s + sec.confidence, 0) / formattedSections.length)
    : 0;

  return {
    source: 'local',
    key,
    keyConfidence: Math.round(keyConfidence * 100),
    bpm,
    timeSignature,
    musicStart: musicStart || 0,
    sections: formattedSections,
    confidence: overallConfidence,
    canRefine: true,
  };
}
