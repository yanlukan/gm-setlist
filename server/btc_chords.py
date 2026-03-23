"""
BTC (Bi-directional Transformer for Chords) wrapper for chord detection.
Uses the large vocabulary model (170 classes: 12 roots x 14 qualities + N + X).
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

    model_path = os.path.join(BTC_DIR, 'test', 'btc_model_large_voca.pt')
    _model = BTC_model(config=_config.model).to(device)

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    _mean = checkpoint['mean']
    _std = checkpoint['std']
    _model.load_state_dict(checkpoint['model'])
    _model.eval()

    _idx_to_chord = idx2voca_chord()


def detect_chords(audio_path):
    """
    Detect chords from an audio file using BTC large vocab model.

    Returns list of dicts: [{chord, time, duration, confidence}, ...]
    """
    _load_model()

    device = torch.device('cpu')
    n_timestep = _config.model['timestep']

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

    return chords
