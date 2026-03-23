/**
 * Music AI (Moises) API client — SKELETON.
 * The workflow ID, request format, and response schema below are provisional.
 * MUST be adapted after obtaining an API key and testing against the real API.
 * Docs: https://music.ai/docs/api/reference/
 */

const BASE_URL = 'https://api.music.ai/v1';

export async function analyzeMusicAI(filePath, onProgress) {
  const apiKey = process.env.MUSIC_AI_API_KEY;
  if (!apiKey) throw new Error('Music AI API key not configured');

  const headers = { 'Authorization': apiKey, 'Content-Type': 'application/json' };

  onProgress?.({ stage: 'uploading', message: 'Uploading to Music AI...' });

  const uploadRes = await fetch(`${BASE_URL}/upload`, { headers });
  if (!uploadRes.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, downloadUrl } = await uploadRes.json();

  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': 'audio/wav' },
  });
  if (!putRes.ok) throw new Error('Failed to upload audio file');

  onProgress?.({ stage: 'analyzing', message: 'Music AI analyzing...' });

  const jobRes = await fetch(`${BASE_URL}/job`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'gm-setlist-analysis',
      workflow: 'music-ai/chord-detection',
      params: { inputUrl: downloadUrl },
    }),
  });
  if (!jobRes.ok) throw new Error('Failed to create analysis job');
  const job = await jobRes.json();

  const jobId = job.id;
  let status = 'QUEUED';
  while (status !== 'SUCCEEDED' && status !== 'FAILED') {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${BASE_URL}/job/${jobId}`, { headers });
    if (!statusRes.ok) throw new Error('Failed to check job status');
    const statusData = await statusRes.json();
    status = statusData.status;

    if (status === 'FAILED') {
      throw new Error('Music AI analysis failed: ' + (statusData.error || 'unknown'));
    }
    if (status === 'SUCCEEDED') {
      return formatMusicAIResult(statusData);
    }
  }
}

function formatMusicAIResult(jobData) {
  const result = {
    source: 'music-ai',
    confidence: 95,
    canRefine: false,
    key: jobData.result?.key || 'C',
    bpm: jobData.result?.bpm || 120,
    timeSignature: jobData.result?.timeSignature || '4/4',
    sections: [],
  };

  if (jobData.result?.sections) {
    result.sections = jobData.result.sections.map(s => ({
      name: normalizeSectionName(s.label || s.name || 'Section'),
      chords: (s.chords || []).join('  '),
      confidence: 95,
    }));
  } else if (jobData.result?.chords) {
    result.sections = [{
      name: 'Full Song',
      chords: jobData.result.chords.map(c => c.label || c.chord).join('  '),
      confidence: 95,
    }];
  }

  return result;
}

const SECTION_LABEL_MAP = {
  'verse': 'Verse', 'chorus': 'Chorus', 'bridge': 'Bridge',
  'pre-chorus': 'Pre-Chorus', 'intro': 'Intro', 'outro': 'Outro',
  'inst': 'Instrumental', 'solo': 'Solo', 'break': 'Break',
};

function normalizeSectionName(label) {
  return SECTION_LABEL_MAP[label.toLowerCase().trim()] || label.charAt(0).toUpperCase() + label.slice(1);
}
