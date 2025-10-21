#!/bin/bash
set -e

# Configuration (hardcoded as requested)
GCP_PROJECT="firechatbot-a9654"
VM_NAME="testbase-ubuntu-vm"
ZONE="us-central1-a"

echo "============================================"
echo "Deploying Testbase Cloud Infrastructure"
echo "============================================"
echo "Project: $GCP_PROJECT"
echo "VM: $VM_NAME"
echo "Zone: $ZONE"
echo ""

# Step 1: Build locally
echo "Step 1: Building TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build complete"
echo ""

# Step 2: Create deployment tarball
echo "Step 2: Creating deployment package..."
tar -czf /tmp/testbase-cloud.tar.gz \
    dist/ \
    package.json \
    package-lock.json \
    deployment/ \
    2>/dev/null || true

echo "✅ Package created: /tmp/testbase-cloud.tar.gz"
echo ""

# Step 3: Copy to VM
echo "Step 3: Copying to GCE VM..."
gcloud compute scp /tmp/testbase-cloud.tar.gz \
    $VM_NAME:/tmp/ \
    --project=$GCP_PROJECT \
    --zone=$ZONE

echo "✅ Files copied to VM"
echo ""

# Step 4: Extract and setup on VM
echo "Step 4: Setting up on VM..."
gcloud compute ssh $VM_NAME \
    --project=$GCP_PROJECT \
    --zone=$ZONE \
    --command="
        set -e
        echo 'Extracting files...'
        mkdir -p ~/testbase-deploy
        tar -xzf /tmp/testbase-cloud.tar.gz -C ~/testbase-deploy

        echo 'Copying files to /opt with sudo...'
        sudo rm -rf /opt/testbase-cloud
        sudo mkdir -p /opt/testbase-cloud
        sudo cp -r ~/testbase-deploy/* /opt/testbase-cloud/

        echo 'Running setup script...'
        cd /opt/testbase-cloud
        sudo bash deployment/setup-vm.sh

        echo 'Cleaning up...'
        rm -rf ~/testbase-deploy
        rm /tmp/testbase-cloud.tar.gz
    "

echo "✅ Setup complete on VM"
echo ""

# Step 5: Get VM info
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""

VM_IP=$(gcloud compute instances describe $VM_NAME \
    --project=$GCP_PROJECT \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "VM IP: $VM_IP"
echo "API URL: http://$VM_IP:8080"
echo ""
echo "Health check:"
curl -s "http://$VM_IP:8080/health" | jq . || echo "⚠️  Service may not be running yet"
echo ""
echo "To view logs:"
echo "  gcloud compute ssh $VM_NAME --project=$GCP_PROJECT --zone=$ZONE --command='sudo journalctl -u testbase-cloud -f'"
echo ""
echo "To check service status:"
echo "  gcloud compute ssh $VM_NAME --project=$GCP_PROJECT --zone=$ZONE --command='sudo systemctl status testbase-cloud'"
