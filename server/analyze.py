#!/usr/bin/env python3
"""
Audio analysis script. Accepts an audio file path, outputs JSON to stdout.
Uses Essentia for chords/key/tempo and librosa for section segmentation.
"""
import sys
import json
import warnings
warnings.filterwarnings('ignore')

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

    if hpcp_frames:
        hpcp_array = np.array(hpcp_frames)
        chords, strengths = chords_detection(hpcp_array)

        chord_timeline = []
        current_chord = None
        current_start = 0
        current_strengths = []

        for i, (chord, strength) in enumerate(zip(chords, strengths)):
            time = i * hop_size / sr
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

        # Heuristic labeling
        cluster_counts = Counter(s['cluster'] for s in merged)
        total_sections = len(merged)
        sorted_clusters = cluster_counts.most_common()
        chorus_cluster = sorted_clusters[0][0] if sorted_clusters else -1
        verse_cluster = sorted_clusters[1][0] if len(sorted_clusters) > 1 else -1

        sections = []
        verse_count = 0
        chorus_count = 0
        for i, sec in enumerate(merged):
            c = sec['cluster']
            sec_duration = sec['end'] - sec['start']

            if i == 0 and (sec_duration < 20 or cluster_counts[c] == 1):
                name = 'Intro'
            elif i == total_sections - 1 and (sec_duration < 20 or cluster_counts[c] == 1):
                name = 'Outro'
            elif c == chorus_cluster:
                chorus_count += 1
                name = 'Chorus' if chorus_count <= 1 else f'Chorus {chorus_count}'
            elif c == verse_cluster:
                verse_count += 1
                name = 'Verse' if verse_count <= 1 else f'Verse {verse_count}'
            elif cluster_counts[c] == 1:
                name = 'Bridge'
            else:
                name = 'Section'

            sections.append({
                'name': name,
                'start': sec['start'],
                'end': sec['end'],
            })

        # Merge consecutive same-name sections
        final_sections = [sections[0]]
        for sec in sections[1:]:
            if sec['name'] == final_sections[-1]['name']:
                final_sections[-1]['end'] = sec['end']
            else:
                final_sections.append(sec)

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
