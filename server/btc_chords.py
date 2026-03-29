"""
BTC (Bi-directional Transformer for Chords) wrapper for chord detection.
Uses the BTC-PL (pseudo-label) model from ChordMini for improved accuracy.
Large vocabulary: 170 classes (12 roots x 14 qualities + N + X).
"""
import os
import sys
import numpy as np
import torch
import librosa

# Add BTC repo to path
BTC_DIR = os.path.join(os.path.dirname(__file__), 'btc')
sys.path.insert(0, BTC_DIR)

from btc_model import BTC_model
from utils.hparams import HParams
from utils.mir_eval_modules import audio_file_to_features, idx2voca_chord

# Singleton model cache
_model = None
_mean = None
_std = None
_config = None
_idx_to_chord = None


def _load_model():
    global _model, _mean, _std, _config, _idx_to_chord

    if _model is not None:
        return

    device = torch.device('cpu')

    config_path = os.path.join(BTC_DIR, 'run_config.yaml')
    _config = HParams.load(config_path)
    _config.feature['large_voca'] = True
    _config.model['num_chords'] = 170

    model_path = os.path.join(BTC_DIR, 'test', 'btc_model_best.pth')
    _model = BTC_model(config=_config.model).to(device)

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)

    # BTC-PL checkpoint uses different format than original BTC
    if 'model_state_dict' in checkpoint:
        state_dict = checkpoint['model_state_dict']
        # Strip DataParallel prefix if present
        state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}
        _model.load_state_dict(state_dict)
        norm = checkpoint['normalization']
        mean_val = norm['mean'].item() if hasattr(norm['mean'], 'item') else norm['mean']
        std_val = norm['std'].item() if hasattr(norm['std'], 'item') else norm['std']
        _mean = np.full(144, mean_val)
        _std = np.full(144, std_val)
    else:
        # Fallback: original BTC checkpoint format
        _model.load_state_dict(checkpoint['model'])
        _mean = checkpoint['mean']
        _std = checkpoint['std']

    _model.eval()

    _idx_to_chord = idx2voca_chord()


def detect_chords(audio_path, music_start=0):
    """
    Detect chords from an audio file using BTC large vocab model.

    Args:
        audio_path: Path to audio file
        music_start: Skip this many seconds from the start (e.g. spoken intros)

    Returns list of dicts: [{chord, time, duration, confidence}, ...]
    """
    _load_model()

    device = torch.device('cpu')
    n_timestep = _config.model['timestep']

    # If music starts late, trim audio to avoid confusing the model with non-music
    if music_start > 2:
        import tempfile, soundfile as sf
        y, sr = librosa.load(audio_path, sr=_config.mp3['song_hz'], mono=True)
        start_sample = int(music_start * sr)
        y = y[start_sample:]
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        sf.write(tmp.name, y, sr)
        audio_path = tmp.name

    # Extract CQT features
    feature, feature_per_second, song_length = audio_file_to_features(audio_path, _config)
    feature = feature.T
    feature = (feature - _mean) / _std
    time_unit = feature_per_second

    # Pad to multiple of timestep
    num_pad = n_timestep - (feature.shape[0] % n_timestep)
    feature = np.pad(feature, ((0, num_pad), (0, 0)), mode='constant', constant_values=0)
    num_instance = feature.shape[0] // n_timestep

    # Run inference
    chords = []
    start_time = 0.0
    prev_chord = None
    prev_probs = []

    with torch.no_grad():
        feature_tensor = torch.tensor(feature, dtype=torch.float32).unsqueeze(0).to(device)

        for t in range(num_instance):
            chunk = feature_tensor[:, n_timestep * t:n_timestep * (t + 1), :]
            self_attn_output, _ = _model.self_attn_layers(chunk)

            # Get raw logits for confidence
            logits = _model.output_layer.output_projection(self_attn_output)
            probs = torch.softmax(logits, dim=-1).squeeze(0)
            predictions = probs.argmax(dim=-1)

            for i in range(n_timestep):
                frame_idx = n_timestep * t + i
                current_time = time_unit * frame_idx

                # Stop at end of actual audio
                if t == num_instance - 1 and i + num_pad == n_timestep:
                    if prev_chord is not None and prev_chord != 169:  # 169 = N (no chord)
                        avg_conf = float(np.mean(prev_probs))
                        chords.append({
                            'chord': _idx_to_chord[prev_chord],
                            'time': round(start_time, 3),
                            'duration': round(current_time - start_time, 3),
                            'confidence': round(avg_conf, 3),
                        })
                    break

                pred = predictions[i].item()
                conf = probs[i, pred].item()

                if prev_chord is None:
                    prev_chord = pred
                    start_time = current_time
                    prev_probs = [conf]
                    continue

                if pred != prev_chord:
                    if prev_chord != 169:  # skip N (no chord)
                        avg_conf = float(np.mean(prev_probs))
                        chords.append({
                            'chord': _idx_to_chord[prev_chord],
                            'time': round(start_time, 3),
                            'duration': round(current_time - start_time, 3),
                            'confidence': round(avg_conf, 3),
                        })
                    prev_chord = pred
                    start_time = current_time
                    prev_probs = [conf]
                else:
                    prev_probs.append(conf)

    # Clean up temp file if we created one
    if music_start > 2:
        import os as _os
        _os.unlink(audio_path)

    # Offset timestamps back to original audio timeline
    if music_start > 2:
        for c in chords:
            c['time'] = round(c['time'] + music_start, 3)

    return _clean_chords(chords)


def _clean_chords(chords):
    """Post-process BTC output to remove noise and merge fragments.

    Strategy:
    1. Remove very brief low-confidence chords (<1s and <0.5 confidence)
       and absorb their time into the surrounding chord.
    2. Merge consecutive identical chords (caused by noise removal).
    3. Strip chord quality down to root when confidence is low — a low-confidence
       C#:min7 is more likely just C#m or even wrong entirely.
    """
    if not chords:
        return chords

    # Pass 1: Remove brief low-confidence noise chords
    # A chord < 1s with < 0.5 confidence between two identical chords is noise
    cleaned = []
    for i, c in enumerate(chords):
        is_brief = c['duration'] < 1.0
        is_low_conf = c['confidence'] < 0.5

        if is_brief and is_low_conf:
            # Check if surrounding chords are the same — if so, skip this noise
            prev_chord = cleaned[-1]['chord'] if cleaned else None
            next_chord = chords[i + 1]['chord'] if i + 1 < len(chords) else None
            if prev_chord and prev_chord == next_chord:
                # Absorb duration into previous chord
                cleaned[-1]['duration'] = round(
                    cleaned[-1]['duration'] + c['duration'], 3)
                continue

        cleaned.append(c)

    # Pass 2: Merge consecutive identical chords
    merged = []
    for c in cleaned:
        if merged and merged[-1]['chord'] == c['chord']:
            # Weighted average confidence by duration
            prev = merged[-1]
            total_dur = prev['duration'] + c['duration']
            prev['confidence'] = round(
                (prev['confidence'] * prev['duration'] +
                 c['confidence'] * c['duration']) / total_dur, 3)
            prev['duration'] = round(total_dur, 3)
        else:
            merged.append(c)

    # Pass 3: Second noise pass — now catch brief low-conf chords that
    # weren't between identical chords before but are after merging
    final = []
    for i, c in enumerate(merged):
        is_brief = c['duration'] < 0.8
        is_low_conf = c['confidence'] < 0.45
        if is_brief and is_low_conf and final:
            # Absorb into previous
            final[-1]['duration'] = round(
                final[-1]['duration'] + c['duration'], 3)
            continue
        final.append(c)

    return final
