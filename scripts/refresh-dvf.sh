#!/bin/bash
# Refresh DVF (transactions) — idempotent ON CONFLICT UPDATE
# Fréquence : 1×/an (début juin, après publication DGFiP)
# Durée estimée : ~1h
# Logs : ~/logs/geocopia/refresh-dvf.log

set -euo pipefail

BACKEND=/home/david/www/alua/alua-backend
LOG_DIR=/home/david/logs/geocopia
LOG="$LOG_DIR/refresh-dvf.log"
LOCK=/tmp/geocopia-refresh-dvf.lock

mkdir -p "$LOG_DIR"
exec >> "$LOG" 2>&1

(
    flock -n 200 || { echo "[$(date '+%F %T')] DVF refresh déjà en cours, ignoré."; exit 0; }
    echo "[$(date '+%F %T')] === DVF refresh start ==="
    cd "$BACKEND"
    php8.3 bin/console app:import:dvf --all
    echo "[$(date '+%F %T')] === DVF refresh done ==="
) 200>"$LOCK"
