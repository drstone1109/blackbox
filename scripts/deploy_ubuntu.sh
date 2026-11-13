#!/bin/bash
# ==============================================================
# Blackbox ERP - Ubuntu Server One-Click Deployment Script
# ==============================================================

set -e

echo "=== 1. Updating APT and installing system prerequisites ==="
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git curl ufw

echo "=== 2. Setting up Python Virtual Environment ==="
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 3. Initializing Database ==="
python3 -c "from database.connection import init_db; init_db(); print('Database verified.')"

echo "=== 4. Configuring Firewall ==="
sudo ufw allow 22/tcp || true
sudo ufw allow 8000/tcp || true

echo "=== 5. Setting up Systemd 24x7 Daemon Service ==="
CURRENT_USER=$(whoami)
SCRIPT_DIR=$(pwd)

sudo tee /etc/systemd/system/blackbox.service > /dev/null <<EOF
[Unit]
Description=Blackbox ERP Production Service
After=network.target

[Service]
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1
Environment=APP_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable blackbox.service
sudo systemctl restart blackbox.service

echo ""
echo "=========================================================="
echo "✅ Blackbox ERP is now running 24x7 on your Ubuntu Server!"
echo "Status check: sudo systemctl status blackbox"
echo "Server logs:  sudo journalctl -u blackbox -f"
echo "Local access: http://$(hostname -I | awk '{print $1}'):8000"
echo "=========================================================="

