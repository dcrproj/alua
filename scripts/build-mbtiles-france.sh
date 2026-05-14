#!/bin/bash
# Build MBTiles France entière depuis les GeoJSON PCI Etalab
#
# Pipeline :
#   1. Import PCI par département → DB + GeoJSON conservés (--skip-linking)
#      Skip si le département est déjà en base ET le GeoJSON déjà présent.
#   2. tippecanoe par département → MBTiles individuels (skip si déjà généré)
#   3. tile-join → france-parcelles.mbtiles
#   4. Liaison parcelles ↔ adresses (KNN PostGIS, une passe finale)
#
# Prérequis VPS : fichier ~/.pgpass configuré pour éviter les prompts de mot de passe
#   echo "127.0.0.1:5432:alua:alua:MOT_DE_PASSE" >> ~/.pgpass && chmod 600 ~/.pgpass
#
# Usage : bash scripts/build-mbtiles-france.sh
# Logs  : tail -f /tmp/alua_mbtiles_build.log

set -euo pipefail

PHP=php8.3
PSQL_OPTS="-h 127.0.0.1 -U alua -d alua"
TIPPECANOE=/usr/local/bin/tippecanoe
TILEJOIN=/usr/local/bin/tile-join
BACKEND_DIR=/home/david/www/alua/alua-backend
GEOJSON_DIR="$(php8.3 -r 'echo sys_get_temp_dir();')/alua_pci"
DEPT_TILES_DIR=/home/david/data/alua_dept_tiles
FINAL_DIR=/home/david/data/alua_tiles
LOG=/tmp/alua_mbtiles_build.log
DB=alua

DEPARTMENTS=(
    01 02 03 04 05 06 07 08 09 10
    11 12 13 14 15 16 17 18 19 2a
    2b 21 22 23 24 25 26 27 28 29
    30 31 32 33 34 35 36 37 38 39
    40 41 42 43 44 45 46 47 48 49
    50 51 52 53 54 55 56 57 58 59
    60 61 62 63 64 65 66 67 68 69
    70 71 72 73 74 75 76 77 78 79
    80 81 82 83 84 85 86 87 88 89
    90 91 92 93 94 95
)

mkdir -p "$DEPT_TILES_DIR" "$FINAL_DIR" "$GEOJSON_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

dept_in_db() {
    local dept_upper
    dept_upper=$(echo "$1" | tr '[:lower:]' '[:upper:]')
    psql $PSQL_OPTS -tAc "SELECT 1 FROM parcelles WHERE commune_code LIKE '${dept_upper}%' LIMIT 1" 2>/dev/null | grep -q 1
}

log "=== Build MBTiles France entière ==="
log "GeoJSON : $GEOJSON_DIR"
log "Tuiles dept : $DEPT_TILES_DIR"
log "Tuiles finales : $FINAL_DIR"

# ---------------------------------------------------------------------------
# Phase 1 — Import PCI par département (skip si déjà en base + GeoJSON dispo)
# ---------------------------------------------------------------------------
log ""
log "=== Phase 1 : Import PCI (96 départements, skip-linking) ==="
cd "$BACKEND_DIR"

for dept in "${DEPARTMENTS[@]}"; do
    dept_upper=$(echo "$dept" | tr '[:lower:]' '[:upper:]')
    gz="$GEOJSON_DIR/cadastre-${dept}-parcelles.json.gz"

    if [ -f "$gz" ] && dept_in_db "$dept"; then
        log "  dept $dept_upper : déjà importé + GeoJSON présent, ignoré."
        continue
    fi

    log "  dept $dept_upper : import..."
    "$PHP" bin/console app:import:pci --department="$dept_upper" --keep-geojson --skip-linking \
        2>&1 | tee -a "$LOG"
done

log "Phase 1 terminée."

# ---------------------------------------------------------------------------
# Phase 2 — tippecanoe par département
# ---------------------------------------------------------------------------
log ""
log "=== Phase 2 : tippecanoe par département ==="

for dept in "${DEPARTMENTS[@]}"; do
    dept_upper=$(echo "$dept" | tr '[:lower:]' '[:upper:]')
    gz="$GEOJSON_DIR/cadastre-${dept}-parcelles.json.gz"
    outfile="$DEPT_TILES_DIR/dept-${dept}.mbtiles"

    if [ -f "$outfile" ]; then
        log "  dept $dept_upper : MBTiles déjà généré, ignoré."
        continue
    fi

    if [ ! -f "$gz" ]; then
        log "  dept $dept_upper : GeoJSON absent, ignoré."
        continue
    fi

    log "  dept $dept_upper : tippecanoe..."
    gunzip -c "$gz" | "$TIPPECANOE" \
        --output="$outfile" \
        --layer=parcelles \
        --minimum-zoom=12 \
        --maximum-zoom=18 \
        --drop-smallest-as-needed \
        --no-feature-limit \
        --force \
        /dev/stdin >> "$LOG" 2>&1

    size=$(ls -lh "$outfile" | awk '{print $5}')
    log "  dept $dept_upper : OK ($size)"
done

log "Phase 2 terminée."

# ---------------------------------------------------------------------------
# Phase 3 — tile-join → france-parcelles.mbtiles
# ---------------------------------------------------------------------------
log ""
log "=== Phase 3 : tile-join → france-parcelles.mbtiles ==="
"$TILEJOIN" \
    --output="$FINAL_DIR/france-parcelles.mbtiles" \
    --force \
    "$DEPT_TILES_DIR"/dept-*.mbtiles 2>&1 | tee -a "$LOG"

size=$(ls -lh "$FINAL_DIR/france-parcelles.mbtiles" | awk '{print $5}')
log "france-parcelles.mbtiles : $size"
log "Phase 3 terminée."

# ---------------------------------------------------------------------------
# Phase 4 — Liaison parcelles ↔ adresses (passe unique finale)
# ---------------------------------------------------------------------------
log ""
log "=== Phase 4 : Liaison parcelles ↔ adresses ==="
cd "$BACKEND_DIR"
"$PHP" bin/console app:import:pci --only-link 2>&1 | tee -a "$LOG"
log "Phase 4 terminée."

log ""
log "=== Build complet ==="
log "MBTiles France : $FINAL_DIR/france-parcelles.mbtiles ($size)"
log "Pour servir : /usr/local/bin/martin $FINAL_DIR/france-parcelles.mbtiles --listen-addresses 127.0.0.1:3000"
