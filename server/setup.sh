#!/bin/bash
# Setup script for GM Setlist server
# Run from the server/ directory: ./setup.sh

set -e

echo "=== GM Setlist Server Setup ==="

# Node dependencies
echo "Installing Node.js dependencies..."
npm install

# Python venv
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "Installing Python dependencies..."
.venv/bin/pip install --upgrade pip
.venv/bin/pip install essentia librosa scikit-learn numpy torch pyyaml mir_eval

# BTC chord detection model
if [ ! -d "btc" ]; then
  echo "Cloning BTC chord detection model..."
  git clone https://github.com/jayg996/BTC-ISMIR19.git btc

  # Patch for modern Python/NumPy
  sed -i '' 's/np\.float)/np.float64)/g' btc/utils/transformer_modules.py 2>/dev/null || \
  sed -i 's/np\.float)/np.float64)/g' btc/utils/transformer_modules.py

  sed -i '' "s/yaml.load(f))/yaml.load(f, Loader=yaml.SafeLoader))/g" btc/utils/hparams.py 2>/dev/null || \
  sed -i "s/yaml.load(f))/yaml.load(f, Loader=yaml.SafeLoader))/g" btc/utils/hparams.py

  echo "BTC model ready (170 chord classes)"
else
  echo "BTC already present, skipping..."
fi

# yt-dlp for YouTube imports
if ! command -v yt-dlp &>/dev/null; then
  echo "Installing yt-dlp..."
  pip3 install yt-dlp
else
  echo "yt-dlp already installed"
fi

echo ""
echo "=== Setup complete ==="
echo "Start the server with: npm run dev"
