#!/bin/bash
# Déploiement backend Symfony sur le VPS
# Exécuté en tant qu'utilisateur david sur le VPS
# Usage : bash scripts/deploy-backend.sh

set -euo pipefail

APP_DIR=/home/david/www/alua/alua-backend
PHP=php8.3

cd "$APP_DIR"

echo "[1/5] Git pull…"
git pull origin main

echo "[2/5] Composer install…"
composer install --no-dev --optimize-autoloader --no-interaction

echo "[3/5] Migrations…"
$PHP bin/console doctrine:migrations:migrate --no-interaction

echo "[4/5] Cache warmup…"
$PHP bin/console cache:warmup

echo "[5/5] Done — backend déployé."
