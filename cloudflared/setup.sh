#!/bin/bash
# ChemIP Cloudflare Tunnel Setup
# Domain: chemip.yule.pics
# Prerequisites: cloudflared installed, yule.pics on Cloudflare DNS

set -e

echo "=== Step 1: Login to Cloudflare ==="
cloudflared tunnel login

echo ""
echo "=== Step 2: Create tunnel ==="
cloudflared tunnel create chemip
# This outputs a tunnel ID — copy it

echo ""
echo "=== Step 3: Route DNS ==="
cloudflared tunnel route dns chemip chemip.yule.pics

echo ""
echo "=== IMPORTANT ==="
echo "1. Copy your tunnel ID from Step 2 output"
echo "2. Edit cloudflared/config.yml: replace <TUNNEL_ID> with your actual tunnel ID"
echo "3. Copy config.yml to ~/.cloudflared/config.yml"
echo ""
echo "Then run: cloudflared tunnel run chemip"
