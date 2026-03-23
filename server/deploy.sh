#!/bin/bash
# Deploy gm-setlist-server to DigitalOcean droplet
# Usage: ./deploy.sh

DROPLET_IP="144.126.224.140"
DROPLET_USER="root"
APP_DIR="/opt/gm-setlist-server"

echo "Deploying to $DROPLET_IP..."

# Sync server files (exclude node_modules, .venv, .env)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.venv' \
  --exclude '.env' \
  --exclude '*.pyc' \
  ./ "$DROPLET_USER@$DROPLET_IP:$APP_DIR/"

# Install dependencies and restart
ssh "$DROPLET_USER@$DROPLET_IP" << 'EOF'
cd /opt/gm-setlist-server

# Install Node.js if needed
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install yt-dlp if needed
if ! command -v yt-dlp &> /dev/null; then
  pip3 install yt-dlp
fi

npm install --production

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> IMPORTANT: Edit /opt/gm-setlist-server/.env and add your MUSIC_AI_API_KEY"
fi

# Create/update systemd service
cat > /etc/systemd/system/gm-setlist.service << 'SERVICE'
[Unit]
Description=GM Setlist Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gm-setlist-server
ExecStart=/usr/bin/node index.js
Restart=on-failure
EnvironmentFile=/opt/gm-setlist-server/.env

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable gm-setlist
systemctl restart gm-setlist
echo "Service restarted. Status:"
systemctl status gm-setlist --no-pager
EOF

echo "Done! Set up DNS: api.stratlab.uk -> $DROPLET_IP"
