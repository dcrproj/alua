#!/bin/bash
# Post-déploiement backend Symfony sur le VPS
# Le code est synchonisé par rsync depuis GitHub Actions avant ce script.
# Usage : bash scripts/deploy-backend.sh

set -euo pipefail

APP_DIR=/home/david/www/alua/alua-backend
PHP=php8.3

cd "$APP_DIR"

echo "[1/4] Composer install…"
composer install --no-dev --optimize-autoloader --no-interaction

echo "[2/4] Migrations…"
$PHP bin/console doctrine:migrations:migrate --no-interaction

echo "[3/4] Cache warmup…"
$PHP bin/console cache:warmup

echo "[4/4] Http cache dir…"
# var/http_cache/ est hors de var/cache/prod/ — ne sera pas wipé par cache:warmup
mkdir -p var/http_cache
chmod 775 var/http_cache

echo "Done — backend déployé."
