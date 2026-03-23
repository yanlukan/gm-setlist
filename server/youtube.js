import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const TMP_DIR = path.join(os.tmpdir(), 'gm-setlist');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Strip playlist/radio params from YouTube URL — keep only the video.
 */
function cleanYouTubeUrl(url) {
  try {
    const u = new URL(url);
    const videoId = u.searchParams.get('v');
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
    return url; // youtu.be or shorts — pass through
  } catch {
    return url;
  }
}

export async function extractAudio(url, onProgress) {
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
  if (!ytRegex.test(url)) throw new Error('Invalid YouTube URL');

  const cleanUrl = cleanYouTubeUrl(url);
  onProgress?.({ stage: 'downloading', message: 'Downloading audio...' });
  const outputPath = path.join(TMP_DIR, `${Date.now()}`);

  try {
    // Get metadata first (execFile = no shell, safe with special chars)
    const { stdout: metaJson } = await execFileAsync(
      'yt-dlp', ['--dump-json', '--no-download', cleanUrl],
      { timeout: 30000 }
    );
    const meta = JSON.parse(metaJson);
    if (meta.duration > 600) throw new Error('Video exceeds 10-minute limit');

    // Download audio as wav
    await execFileAsync(
      'yt-dlp', ['-x', '--audio-format', 'wav', '--audio-quality', '0',
        '-o', `${outputPath}.%(ext)s`, cleanUrl],
      { timeout: 120000 }
    );

    const filePath = `${outputPath}.wav`;
    if (!fs.existsSync(filePath)) throw new Error('Download failed — audio file not created');

    return {
      filePath,
      title: meta.title || 'Unknown',
      artist: meta.artist || meta.uploader || 'Unknown',
      duration: meta.duration || 0,
    };
  } catch (err) {
    const possibleFiles = [`${outputPath}.wav`, `${outputPath}.webm`, `${outputPath}.m4a`];
    possibleFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });

    if (err.message.includes('Video unavailable') || err.message.includes('Private video')) {
      throw new Error('Video unavailable or region-restricted. Try uploading the audio file directly.');
    }
    if (err.message.includes('429') || err.message.includes('Too Many Requests')) {
      throw new Error('YouTube download temporarily blocked. Try again in a few minutes or upload the file.');
    }
    throw err;
  }
}

export async function searchYouTube(query, maxResults = 5) {
  try {
    const { stdout } = await execFileAsync(
      'yt-dlp', ['--flat-playlist', '--dump-json', `ytsearch${maxResults}:${query}`],
      { timeout: 15000 }
    );

    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const item = JSON.parse(line);
      return {
        id: item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        title: item.title,
        duration: item.duration ? formatDuration(item.duration) : '?',
        durationSec: item.duration || 0,
        thumbnail: item.thumbnails?.[0]?.url || '',
      };
    });
  } catch (err) {
    throw new Error('YouTube search failed. Try again.');
  }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function cleanupFile(filePath) {
  try { fs.unlinkSync(filePath); } catch {}
}
