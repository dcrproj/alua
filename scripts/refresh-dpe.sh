#!/bin/bash
# Refresh DPE (diagnostics ADEME) — import bulk par département
# Fréquence : trimestrielle (mars, juin, sept, déc)
# Durée estimée : ~3-4h pour France entière
# Logs : ~/logs/geocopia/refresh-dpe.log

set -euo pipefail

BACKEND=/home/david/www/alua/alua-backend
LOG_DIR=/home/david/logs/geocopia
LOG="$LOG_DIR/refresh-dpe.log"
LOCK=/tmp/geocopia-refresh-dpe.lock

mkdir -p "$LOG_DIR"
exec >> "$LOG" 2>&1

(
    flock -n 200 || { echo "[$(date '+%F %T')] DPE refresh déjà en cours, ignoré."; exit 0; }
    echo "[$(date '+%F %T')] === DPE refresh start ==="
    cd "$BACKEND"
    php8.3 bin/console app:import:dpe --all --source existant --skip-linking
    php8.3 bin/console app:import:dpe --only-link
    echo "[$(date '+%F %T')] === DPE refresh done ==="
) 200>"$LOCK"
