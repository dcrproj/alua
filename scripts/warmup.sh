#!/bin/bash
# Chauffe l'ISR Next.js après un déploiement.
# Lance des GET sur les fiches régions, départements et les N communes les plus peuplées.
# Usage : bash scripts/warmup.sh [N]   (défaut : 500)
# Le script tourne en background — il ne bloque pas le déploiement.

set -euo pipefail

FRONTEND="${FRONTEND_URL:-http://localhost:3001}"
API="${API_URL:-http://localhost:8000}"
N="${1:-500}"
CONCURRENCY=8

log() { echo "[warmup] $*"; }

fetch() {
  curl -sf -o /dev/null --max-time 30 "$1" || true
}
export -f fetch

# ── 1. Régions + départements (generateStaticParams déjà fait, juste un refresh) ──
log "Récupération des slugs régions + départements…"
admin=$(curl -sf --max-time 10 "${API}/api/sitemap/admin" || echo '{"regions":[],"departements":[]}')

regions=$(echo "$admin"    | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin).get('regions',[])]"    2>/dev/null || true)
depts=$(echo "$admin"      | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin).get('departements',[])]" 2>/dev/null || true)

region_count=0
dept_count=0

while IFS= read -r slug; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/region/${slug}" &
  region_count=$((region_count + 1))
done <<< "$regions"

while IFS= read -r slug; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/departement/${slug}" &
  dept_count=$((dept_count + 1))
done <<< "$depts"

wait
log "${region_count} régions + ${dept_count} départements chauffés."

# ── 2. Top N communes par population ─────────────────────────────────────────
log "Récupération des ${N} communes les plus peuplées…"
commune_slugs=$(curl -sf --max-time 15 "${API}/api/sitemap/communes/top?n=${N}" \
  | python3 -c "import sys,json; [print(s) for s in json.load(sys.stdin)]" 2>/dev/null || true)

total=$(echo "$commune_slugs" | grep -c . || echo 0)
log "Chauffage de ${total} fiches communes (concurrence ${CONCURRENCY})…"

done_count=0
pids=()

while IFS= read -r slug; do
  [ -z "$slug" ] && continue
  fetch "${FRONTEND}/commune/${slug}" &
  pids+=($!)
  done_count=$((done_count + 1))

  # Limite la concurrence
  if (( ${#pids[@]} >= CONCURRENCY )); then
    wait "${pids[0]}"
    pids=("${pids[@]:1}")
  fi

  if (( done_count % 50 == 0 )); then
    log "  ${done_count}/${total}…"
  fi
done <<< "$commune_slugs"

wait
log "Done — ${total} communes chauffées."
