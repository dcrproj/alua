#!/bin/bash
# Refresh BAN (adresses) — idempotent ON CONFLICT UPDATE
# Fréquence : ~75 jours (5 fois par an)
# Durée estimée : ~1h
# Logs : ~/logs/geocopia/refresh-ban.log

set -euo pipefail

BACKEND=/home/david/www/alua/alua-backend
LOG_DIR=/home/david/logs/geocopia
LOG="$LOG_DIR/refresh-ban.log"
LOCK=/tmp/geocopia-refresh-ban.lock

mkdir -p "$LOG_DIR"
exec >> "$LOG" 2>&1

(
    flock -n 200 || { echo "[$(date '+%F %T')] BAN refresh déjà en cours, ignoré."; exit 0; }
    echo "[$(date '+%F %T')] === BAN refresh start ==="
    cd "$BACKEND"
    php8.3 bin/console app:import:ban --all
    echo "[$(date '+%F %T')] === BAN refresh done ==="
) 200>"$LOCK"
