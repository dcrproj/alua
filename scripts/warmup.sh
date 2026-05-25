#!/bin/bash
# Chauffe l'ISR Next.js après un déploiement.
# Lance des GET sur les fiches régions, départements et les N communes les plus peuplées.
# Usage : bash scripts/warmup.sh [N]   (défaut : 500)

set -euo pipefail

FRONTEND="${FRONTEND_URL:-http://localhost:3001}"
API="${API_URL:-http://localhost}"
N="${1:-500}"
CONCURRENCY=8

log() { echo "[warmup] $*"; }

fetch() {
  curl -sf -o /dev/null --max-time 30 "$1" || true
}

# ── 1. Régions + départements ─────────────────────────────────────────────────
log "Récupération des slugs régions + départements…"
admin=$(curl -sf --max-time 10 "${API}/api/sitemap/admin" || echo '{"regions":[],"departements":[]}')

region_count=0
while IFS= read -r slug; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/region/${slug}" &
  region_count=$((region_count + 1))
done < <(echo "$admin" | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin).get('regions',[])]" 2>/dev/null)

dept_count=0
while IFS= read -r slug; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/departement/${slug}" &
  dept_count=$((dept_count + 1))
done < <(echo "$admin" | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin).get('departements',[])]" 2>/dev/null)

wait
log "${region_count} régions + ${dept_count} départements chauffés."

# ── 2. Top N communes par population ─────────────────────────────────────────
log "Récupération des ${N} communes les plus peuplées…"
mapfile -t commune_slugs < <(
  curl -sf --max-time 15 "${API}/api/sitemap/communes/top?n=${N}" \
    | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin)]" 2>/dev/null
)

total=${#commune_slugs[@]}
log "Chauffage de ${total} fiches communes (concurrence ${CONCURRENCY})…"

done_count=0
pids=()

for slug in "${commune_slugs[@]}"; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/commune/${slug}" &
  pids+=($!)
  done_count=$((done_count + 1))

  if (( ${#pids[@]} >= CONCURRENCY )); then
    wait "${pids[0]}"
    pids=("${pids[@]:1}")
  fi

  if (( done_count % 50 == 0 )); then
    log "  ${done_count}/${total}…"
  fi
done

wait
log "Done — ${total} communes chauffées."
