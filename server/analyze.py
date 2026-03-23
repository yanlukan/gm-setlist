#!/usr/bin/env python3
"""
Audio analysis script. Accepts an audio file path, outputs JSON to stdout.
Uses Essentia for chords/key/tempo and librosa for section segmentation.
"""
import sys
import json
import warnings
warnings.filterwarnings('ignore')

# Enharmonic correction: pick sharp/flat spelling based on key
SHARP_KEYS = {'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
              'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m'}
FLAT_KEYS = {'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
             'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'}

ENHARMONIC_TO_SHARP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Ebm': 'D#m', 'Gbm': 'F#m', 'Abm': 'G#m', 'Bbm': 'A#m',
}
ENHARMONIC_TO_FLAT = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
    'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm',
}

def fix_enharmonic(chord, key):
    """Respell chord to match the key's sharp/flat convention."""
    if not chord or chord == 'N':
        return chord
    use_sharps = key in SHARP_KEYS
    if use_sharps:
        return ENHARMONIC_TO_SHARP.get(chord, chord)
    else:
        return ENHARMONIC_TO_FLAT.get(chord, chord)

def simplify_chord_sequence(chords):
    """
    Find the shortest repeating pattern in a chord sequence.
    e.g., [Am, C, G, F, Am, C, G, F] → [Am, C, G, F]
    """
    if len(chords) <= 4:
        return chords

    # Try pattern lengths from 2 to half the sequence
    for plen in range(2, len(chords) // 2 + 1):
        pattern = chords[:plen]
        matches = True
        for i in range(plen, len(chords)):
            if chords[i] != pattern[i % plen]:
                matches = False
                break
        if matches:
            return pattern

    # No exact repeat — try approximate: if first half ≈ second half
    half = len(chords) // 2
    if half >= 2:
        first = chords[:half]
        second = chords[half:half*2]
        match_count = sum(1 for a, b in zip(first, second) if a == b)
        if match_count / half > 0.7:  # 70% match = close enough
            return first

    return chords


def analyze(file_path):
    import essentia.standard as es
    import numpy as np

    # Load audio
    loader = es.MonoLoader(filename=file_path, sampleRate=44100)
    audio = loader()

    results = {}

    # --- Key detection ---
    key_extractor = es.KeyExtractor()
    key, scale, key_confidence = key_extractor(audio)
    results['key'] = key + ('m' if scale == 'minor' else '')
    results['keyConfidence'] = round(float(key_confidence), 3)

    # --- BPM / tempo ---
    rhythm_extractor = es.RhythmExtractor2013(method='multifeature')
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)
    results['bpm'] = round(float(bpm))
    results['beats'] = [round(float(b), 3) for b in beats]

    # --- Time signature estimation ---
    if len(beats_intervals) > 4:
        median_interval = float(np.median(beats_intervals))
        results['timeSignature'] = '4/4'
    else:
        results['timeSignature'] = '4/4'

    # --- Chord detection ---
    frame_size = 8192
    hop_size = 4096
    sr = 44100

    w = es.Windowing(type='blackmanharris62')
    spectrum = es.Spectrum()
    spectral_peaks = es.SpectralPeaks(
        sampleRate=sr, magnitudeThreshold=0.00001,
        minFrequency=20, maxFrequency=3500, maxPeaks=60
    )
    hpcp = es.HPCP(
        size=36, referenceFrequency=440,
        harmonics=8, bandPreset=True,
        minFrequency=20, maxFrequency=3500,
        sampleRate=sr
    )
    chords_detection = es.ChordsDetection(hopSize=hop_size, sampleRate=sr)

    hpcp_frames = []
    for frame in es.FrameGenerator(audio, frameSize=frame_size, hopSize=hop_size):
        windowed = w(frame)
        spec = spectrum(windowed)
        freqs, mags = spectral_peaks(spec)
        h = hpcp(freqs, mags)
        hpcp_frames.append(h)

    detected_key = results['key']

    if hpcp_frames:
        hpcp_array = np.array(hpcp_frames)
        chords, strengths = chords_detection(hpcp_array)

        chord_timeline = []
        current_chord = None
        current_start = 0
        current_strengths = []

        for i, (chord, strength) in enumerate(zip(chords, strengths)):
            time = i * hop_size / sr
            # Fix enharmonic spelling to match key
            chord = fix_enharmonic(chord, detected_key)
            if chord != current_chord:
                if current_chord and current_chord != 'N':
                    chord_timeline.append({
                        'chord': current_chord,
                        'time': round(current_start, 3),
                        'duration': round(time - current_start, 3),
                        'confidence': round(float(np.mean(current_strengths)), 3)
                    })
                current_chord = chord
                current_start = time
                current_strengths = [float(strength)]
            else:
                current_strengths.append(float(strength))

        if current_chord and current_chord != 'N':
            end_time = len(audio) / sr
            chord_timeline.append({
                'chord': current_chord,
                'time': round(current_start, 3),
                'duration': round(end_time - current_start, 3),
                'confidence': round(float(np.mean(current_strengths)), 3)
            })

        # Filter out very short chords (< 0.5s) — likely detection noise
        chord_timeline = [c for c in chord_timeline if c['duration'] >= 0.5]

        results['chords'] = chord_timeline
    else:
        results['chords'] = []

    # --- Section detection via librosa Laplacian segmentation ---
    try:
        import librosa
        from sklearn.cluster import KMeans
        from collections import Counter

        # Use lower sr and larger hop for speed on long songs
        y_lib, sr_lib = librosa.load(file_path, sr=11025)
        duration = len(y_lib) / sr_lib
        hop_seg = 2048  # larger hop = fewer frames = faster

        # Extract features for segmentation
        chroma = librosa.feature.chroma_cqt(y=y_lib, sr=sr_lib, hop_length=hop_seg)
        mfcc = librosa.feature.mfcc(y=y_lib, sr=sr_lib, n_mfcc=13, hop_length=hop_seg)

        # Stack and normalize
        features = np.vstack([chroma, mfcc])
        features = librosa.util.normalize(features, axis=1)

        # Subsample if too many frames (> 2000)
        n_frames = features.shape[1]
        subsample = max(1, n_frames // 2000)
        if subsample > 1:
            features = features[:, ::subsample]

        # Build recurrence matrix
        R = librosa.segment.recurrence_matrix(
            features, width=3, mode='affinity', sym=True
        )
        R_enhanced = librosa.segment.path_enhance(R, 15)

        # Normalized Laplacian
        degree = R_enhanced.sum(axis=1, keepdims=True) + 1e-8
        L = np.eye(R_enhanced.shape[0]) - R_enhanced / degree

        # Eigen decomposition
        eigenvalues, eigenvectors = np.linalg.eigh(L)

        # Estimate number of sections (4-10)
        diffs = np.diff(eigenvalues[:20])
        k = max(4, min(10, int(np.argmax(diffs[2:]) + 3)))

        # Cluster frames
        km = KMeans(n_clusters=k, random_state=0, n_init=10)
        frame_labels = km.fit_predict(eigenvectors[:, :k])

        # Convert frame labels to time-based sections
        effective_hop = hop_seg * subsample
        frame_times = librosa.frames_to_time(
            np.arange(len(frame_labels)), sr=sr_lib, hop_length=effective_hop
        )

        # Merge consecutive same-label frames into sections
        raw_sections = []
        current_label = frame_labels[0]
        current_start = 0.0
        for i in range(1, len(frame_labels)):
            if frame_labels[i] != current_label:
                raw_sections.append({
                    'cluster': int(current_label),
                    'start': round(current_start, 3),
                    'end': round(frame_times[i], 3),
                })
                current_label = frame_labels[i]
                current_start = frame_times[i]
        raw_sections.append({
            'cluster': int(current_label),
            'start': round(current_start, 3),
            'end': round(duration, 3),
        })

        # Filter out very short sections (< 5s) — merge with previous
        merged = []
        for sec in raw_sections:
            if sec['end'] - sec['start'] < 5.0 and merged:
                merged[-1]['end'] = sec['end']
            else:
                merged.append(sec)

        # --- Smart heuristic labeling ---
        # Strategy: use position, repetition, and song structure conventions
        #
        # Typical pop structure:
        #   Intro → Verse → (Pre-Chorus) → Chorus → Verse → Chorus → Bridge → Chorus → Outro
        #
        # Rules:
        # 1. First cluster seen = likely Intro or Verse
        # 2. First REPEATED cluster = likely Chorus (choruses repeat)
        # 3. Cluster that appears only once (not first/last) = Bridge or Solo
        # 4. First section if short or unique = Intro
        # 5. Last section if short or unique = Outro
        # 6. Section right before a chorus (different cluster) = Pre-Chorus or Verse

        cluster_counts = Counter(s['cluster'] for s in merged)
        total_sections = len(merged)

        # Track first appearance order of each cluster
        first_seen = {}
        for i, sec in enumerate(merged):
            if sec['cluster'] not in first_seen:
                first_seen[sec['cluster']] = i

        # Find the chorus cluster: most repeated cluster that isn't only
        # at the start/end. If tied, pick the one first seen later (choruses
        # typically appear after verses).
        repeating = {c: cnt for c, cnt in cluster_counts.items() if cnt >= 2}
        if repeating:
            # Among repeating clusters, chorus = the one first seen latest
            # (verses come first, choruses come after)
            chorus_cluster = max(repeating.keys(), key=lambda c: first_seen[c])
        else:
            chorus_cluster = -1

        # Verse cluster: most common repeating cluster that isn't chorus
        verse_candidates = {c: cnt for c, cnt in repeating.items() if c != chorus_cluster}
        if verse_candidates:
            verse_cluster = max(verse_candidates.keys(), key=lambda c: verse_candidates[c])
        else:
            # If only one repeating cluster, the first-seen cluster is verse
            non_chorus = [c for c in first_seen if c != chorus_cluster]
            verse_cluster = non_chorus[0] if non_chorus else -1

        # Assign names
        sections = []
        cluster_label_map = {}  # track what we've named each cluster
        instance_count = {}     # count instances per label type

        for i, sec in enumerate(merged):
            c = sec['cluster']
            sec_duration = sec['end'] - sec['start']

            # Intro: first section, if short (<25s) or unique cluster
            if i == 0 and (sec_duration < 25 or cluster_counts[c] == 1):
                name = 'Intro'
            # Outro: last section, if short (<25s) or unique cluster
            elif i == total_sections - 1 and (sec_duration < 25 or cluster_counts[c] == 1):
                name = 'Outro'
            # Already assigned this cluster a name — reuse it
            elif c in cluster_label_map:
                base = cluster_label_map[c]
                instance_count[base] = instance_count.get(base, 1) + 1
                name = f'{base} {instance_count[base]}'
            # Chorus cluster
            elif c == chorus_cluster:
                name = 'Chorus'
                cluster_label_map[c] = 'Chorus'
                instance_count['Chorus'] = 1
            # Verse cluster
            elif c == verse_cluster:
                name = 'Verse'
                cluster_label_map[c] = 'Verse'
                instance_count['Verse'] = 1
            # Unique cluster (appears once) = Bridge or Solo
            elif cluster_counts[c] == 1:
                # If it's between two choruses, it's a Bridge
                name = 'Bridge'
            # Pre-chorus: appears right before chorus, repeats but isn't verse/chorus
            elif (i + 1 < total_sections and merged[i + 1]['cluster'] == chorus_cluster
                  and cluster_counts[c] >= 2):
                name = 'Pre-Chorus'
                cluster_label_map[c] = 'Pre-Chorus'
                instance_count['Pre-Chorus'] = 1
            else:
                name = 'Section'
                cluster_label_map[c] = 'Section'

            sections.append({
                'name': name,
                'start': sec['start'],
                'end': sec['end'],
            })

        # Merge consecutive same-base-name sections
        # (e.g., Verse + Verse 2 back-to-back = one longer Verse)
        final_sections = [sections[0]]
        for sec in sections[1:]:
            prev_base = final_sections[-1]['name'].split()[0]
            curr_base = sec['name'].split()[0]
            if prev_base == curr_base:
                final_sections[-1]['end'] = sec['end']
            else:
                final_sections.append(sec)

        # Renumber after merging
        label_counts = {}
        for sec in final_sections:
            base = sec['name'].split()[0]
            label_counts[base] = label_counts.get(base, 0) + 1

        # Only number if there are multiple of the same type
        running = {}
        for sec in final_sections:
            base = sec['name'].split()[0]
            running[base] = running.get(base, 0) + 1
            if label_counts[base] > 1:
                sec['name'] = f'{base} {running[base]}'
            else:
                sec['name'] = base

        results['sections'] = final_sections

    except Exception as e:
        results['sections'] = [{
            'name': 'Full Song',
            'start': 0,
            'end': round(len(audio) / sr, 3),
        }]
        results['sectionError'] = str(e)

    return results

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: analyze.py <audio_file_path>'}))
        sys.exit(1)

    try:
        result = analyze(sys.argv[1])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
