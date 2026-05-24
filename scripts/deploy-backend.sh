#!/bin/bash
# Post-déploiement backend Symfony sur le VPS
# Le code est synchonisé par rsync depuis GitHub Actions avant ce script.
# Usage : bash scripts/deploy-backend.sh

set -euo pipefail

APP_DIR=/home/david/www/alua/alua-backend
PHP=php8.3

cd "$APP_DIR"

echo "[1/3] Composer install…"
composer install --no-dev --optimize-autoloader --no-interaction

echo "[2/3] Migrations…"
$PHP bin/console doctrine:migrations:migrate --no-interaction

echo "[3/3] Cache warmup…"
$PHP bin/console cache:warmup

echo "Done — backend déployé."
