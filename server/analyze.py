#!/usr/bin/env python3
"""
Audio analysis script. Accepts an audio file path, outputs JSON to stdout.
Uses Essentia for chords/key/tempo and allin1 for section segmentation.
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

    # --- Section detection via allin1 ---
    try:
        import allin1
        analysis = allin1.analyze(file_path)
        sections = []
        label_map = {
            'verse': 'Verse', 'chorus': 'Chorus', 'bridge': 'Bridge',
            'pre-chorus': 'Pre-Chorus', 'intro': 'Intro', 'outro': 'Outro',
            'inst': 'Instrumental', 'solo': 'Solo', 'break': 'Break',
        }
        for segment in analysis.segments:
            label = segment.label.lower().strip()
            name = label_map.get(label, label.title() if label else 'Section')
            sections.append({
                'name': name,
                'start': round(float(segment.start), 3),
                'end': round(float(segment.end), 3),
            })
        results['sections'] = sections
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
