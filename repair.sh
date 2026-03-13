#!/bin/bash

# --- DABIA ULTIMATE EMERGENCY REPAIR ---
echo "🛑 KILLING ALL NODE & NEXT PROCESSES..."
lsof -ti :3000 | xargs kill -9 || true
lsof -ti :3001 | xargs kill -9 || true
pkill -9 node || true
pkill -9 next || true
sleep 3

echo "💥 DELETING EVERYTHING (NODE_MODULES & CACHES)..."
rm -rf node_modules
rm -rf .next
rm -rf .turbo
rm -rf package-lock.json
rm -rf whatsapp-session-v8-*
rm -rf whatsapp-v8.log
find . -name ".DS_Store" -delete
sleep 2

echo "📦 FRESH STABLE INSTALLATION..."
npm install --legacy-peer-deps

echo "🚀 STARTING SERVER ON PORT 3001 (TO BYPASS GHOSTS)..."
npm run dev -- -p 3001
