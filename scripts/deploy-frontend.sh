#!/bin/bash
# Déploiement frontend Next.js sur le VPS
# Exécuté en tant qu'utilisateur david sur le VPS
# Usage : bash scripts/deploy-frontend.sh

set -euo pipefail

APP_DIR=/home/david/www/alua/alua-frontend

cd "$APP_DIR"

echo "[1/4] Git pull…"
git pull origin main

echo "[2/4] npm ci…"
npm ci

echo "[3/4] npm run build…"
npm run build

echo "[4/4] PM2 restart…"
pm2 restart geocopia-front

echo "Done — frontend déployé."
