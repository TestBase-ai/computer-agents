#!/bin/bash
set -e

echo "============================================"
echo "Testbase GCE VM Setup"
echo "============================================"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo bash setup-vm.sh"
  exit 1
fi

echo "Step 1: Installing Node.js 20..."
# Install Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

echo ""
echo "Step 2: Installing system dependencies..."
apt-get update
apt-get install -y git curl ca-certificates apt-transport-https gnupg

echo ""
echo "Step 3: Installing Google Cloud SDK..."
# Install Google Cloud SDK (if not already installed)
if ! command -v gcloud &> /dev/null; then
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | \
        tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
        gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    apt-get update
    apt-get install -y google-cloud-cli
fi

echo "gcloud version: $(gcloud --version | head -n 1)"

echo ""
echo "Step 4: Creating testbase user..."
# Create testbase user if it doesn't exist
if ! id -u testbase > /dev/null 2>&1; then
    useradd -m -s /bin/bash testbase
fi

echo ""
echo "Step 5: Setting up application directory..."
# App directory should already exist from deployment
# Just ensure permissions are correct
chown -R testbase:testbase /opt/testbase-cloud

# Files should already be copied by deploy.sh
echo "Application files already in place"

echo ""
echo "Step 6: Installing dependencies..."
cd /opt/testbase-cloud
npm install --production

echo ""
echo "Step 7: Setting up systemd service..."
# Copy systemd service file
if [ -f "./deployment/testbase-cloud.service" ]; then
    cp ./deployment/testbase-cloud.service /etc/systemd/system/
else
    cat > /etc/systemd/system/testbase-cloud.service <<EOF
[Unit]
Description=Testbase Cloud Agent Server
After=network.target

[Service]
Type=simple
User=testbase
WorkingDirectory=/opt/testbase-cloud
Environment="NODE_ENV=production"
Environment="PORT=8080"
Environment="DEBUG=false"
EnvironmentFile=-/opt/testbase-cloud/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
fi

echo ""
echo "Step 8: Creating environment file..."
# Create .env file if it doesn't exist
if [ ! -f "/opt/testbase-cloud/.env" ]; then
    cat > /opt/testbase-cloud/.env <<EOF
NODE_ENV=production
PORT=8080
DEBUG=false
# Set your OpenAI API key here:
# OPENAI_API_KEY=your-key-here
EOF
    echo "⚠️  Don't forget to set OPENAI_API_KEY in /opt/testbase-cloud/.env"
fi

chown testbase:testbase /opt/testbase-cloud/.env
chmod 600 /opt/testbase-cloud/.env

echo ""
echo "Step 9: Enabling and starting service..."
# Reload systemd and enable service
systemctl daemon-reload
systemctl enable testbase-cloud
systemctl restart testbase-cloud

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Service status:"
systemctl status testbase-cloud --no-pager
echo ""
echo "To view logs:"
echo "  sudo journalctl -u testbase-cloud -f"
echo ""
echo "To restart service:"
echo "  sudo systemctl restart testbase-cloud"
echo ""
echo "⚠️  Remember to set OPENAI_API_KEY in /opt/testbase-cloud/.env"
