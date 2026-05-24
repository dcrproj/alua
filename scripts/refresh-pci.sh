#!/bin/bash
# Refresh PCI (cadastre) + MBTiles France entière
# Fréquence : ~180 jours (2 fois par an : janvier + juillet)
# Durée estimée : ~5-6h
# Logs : ~/logs/geocopia/refresh-pci.log
#
# Stratégie : supprime les GeoJSON dept et les MBTiles dept pour forcer
# le re-téléchargement et la régénération complète.
# La DB est mise à jour via ON CONFLICT DO UPDATE (parcelles supprimées ≠ retirées — post-V1).

set -euo pipefail

SCRIPTS=/home/david/www/alua/scripts
LOG_DIR=/home/david/logs/geocopia
LOG="$LOG_DIR/refresh-pci.log"
LOCK=/tmp/geocopia-refresh-pci.lock
GEOJSON_DIR=/tmp/alua_pci
DEPT_TILES_DIR=/home/david/data/alua_dept_tiles

mkdir -p "$LOG_DIR"
exec >> "$LOG" 2>&1

(
    flock -n 200 || { echo "[$(date '+%F %T')] PCI refresh déjà en cours, ignoré."; exit 0; }
    echo "[$(date '+%F %T')] === PCI refresh start ==="

    echo "[$(date '+%F %T')] Suppression cache GeoJSON et MBTiles dept…"
    rm -f "$GEOJSON_DIR"/cadastre-*.json.gz
    rm -f "$DEPT_TILES_DIR"/dept-*.mbtiles

    echo "[$(date '+%F %T')] Lancement build-mbtiles-france.sh…"
    bash "$SCRIPTS/build-mbtiles-france.sh"

    echo "[$(date '+%F %T')] === PCI refresh done ==="
) 200>"$LOCK"
