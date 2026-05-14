#!/bin/bash
# Import DVF France entière — un processus PHP par département pour éviter les fuites mémoire.
# Usage : bash scripts/import-dvf-france.sh [DEPT_DEBUT]
# Ex :    bash scripts/import-dvf-france.sh 51   ← reprendre depuis le 51

set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PHP=php8.3
CONSOLE="$PHP $BACKEND_DIR/bin/console"

DEPARTMENTS=(
  01 02 03 04 05 06 07 08 09 10
  11 12 13 14 15 16 17 18 19 2A
  2B 21 22 23 24 25 26 27 28 29
  30 31 32 33 34 35 36 37 38 39
  40 41 42 43 44 45 46 47 48 49
  50 51 52 53 54 55 56 57 58 59
  60 61 62 63 64 65 66 67 68 69
  70 71 72 73 74 75 76 77 78 79
  80 81 82 83 84 85 86 87 88 89
  90 91 92 93 94 95
)

FROM_DEPT="${1:-}"
SKIP=false
if [ -n "$FROM_DEPT" ]; then
  SKIP=true
fi

for DEPT in "${DEPARTMENTS[@]}"; do
  if $SKIP; then
    if [ "$DEPT" = "$FROM_DEPT" ]; then
      SKIP=false
    else
      echo "Skipping $DEPT"
      continue
    fi
  fi

  echo "========================================="
  echo "Département $DEPT"
  echo "========================================="
  $CONSOLE app:import:dvf --department="$DEPT" --skip-linking
done

echo "========================================="
echo "Liaison lots DVF ↔ Parcelles"
echo "========================================="
$CONSOLE app:import:dvf --only-link

echo "Import DVF France entière terminé."
