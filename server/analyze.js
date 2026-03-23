import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python3');
const SCRIPT = path.join(__dirname, 'analyze.py');

export function analyzeLocal(filePath, onProgress) {
  return new Promise((resolve, reject) => {
    onProgress?.({ stage: 'analyzing', message: 'Analyzing audio (chords, key, tempo, sections)...' });

    const proc = spawn(PYTHON, [SCRIPT, filePath], {
      timeout: 300000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Analysis failed: ${stderr || 'unknown error'}`));
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

function formatResults(raw) {
  const { key, keyConfidence, bpm, timeSignature, chords, sections } = raw;

  const formattedSections = sections.map(section => {
    const sectionChords = chords.filter(c =>
      c.time >= section.start && c.time < section.end
    );

    const deduped = [];
    for (const c of sectionChords) {
      if (deduped.length === 0 || deduped[deduped.length - 1].chord !== c.chord) {
        deduped.push(c);
      }
    }

    const avgConfidence = deduped.length > 0
      ? deduped.reduce((sum, c) => sum + c.confidence, 0) / deduped.length
      : 0;

    return {
      name: section.name,
      chords: deduped.map(c => c.chord).join('  '),
      chordsDetail: deduped.map(c => ({
        chord: c.chord,
        confidence: c.confidence,
      })),
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
    sections: formattedSections,
    confidence: overallConfidence,
    canRefine: true,
  };
}
