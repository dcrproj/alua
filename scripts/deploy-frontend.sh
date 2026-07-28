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

echo "[4/4] Warm-up ISR en background…"
API_URL="https://geocopia.fr" nohup bash "$(dirname "$0")/warmup.sh" 500 >> /tmp/warmup.log 2>&1 &

echo "Done — frontend déployé. Warm-up en cours (voir /tmp/warmup.log)."
