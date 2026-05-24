#!/bin/bash
# Post-déploiement frontend Next.js sur le VPS
# Le code est synchronisé par rsync depuis GitHub Actions avant ce script.
# Usage : bash scripts/deploy-frontend.sh

set -euo pipefail

APP_DIR=/home/david/www/alua/alua-frontend

cd "$APP_DIR"

echo "[1/3] npm ci…"
npm ci

echo "[2/3] npm run build…"
npm run build

echo "[3/3] PM2 restart…"
pm2 restart geocopia-front

echo "Done — frontend déployé."
