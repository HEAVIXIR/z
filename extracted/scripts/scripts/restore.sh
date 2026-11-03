#!/usr/bin/env bash
# ============================================================
# HEAVIX — Database Restore (FIX-GAPS-2)
# ------------------------------------------------------------
# Restores db/custom.db from a backup file in db/backups/.
# Usage:
#   scripts/restore.sh custom-20260921-021500.db
#   scripts/restore.sh db/backups/custom-20260921-021500.db
#
# SAFETY:
#   • Always takes a fresh "pre-restore" backup of the current
#     db/custom.db before overwriting it (so a botched restore
#     is itself recoverable).
#   • Refuses to run if the target backup file doesn't exist.
#   • Refuses to run without an argument.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_FILE="$PROJECT_ROOT/db/custom.db"
BACKUP_DIR="$PROJECT_ROOT/db/backups"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file>" >&2
  echo "  e.g. $0 custom-20260921-021500.db" >&2
  echo "  e.g. $0 db/backups/custom-20260921-021500.db" >&2
  exit 1
fi

INPUT="$1"

# Resolve the backup path: accept either a bare filename
# (look in BACKUP_DIR) or a full/relative path.
if [[ -f "$INPUT" ]]; then
  SRC="$INPUT"
elif [[ -f "$BACKUP_DIR/$INPUT" ]]; then
  SRC="$BACKUP_DIR/$INPUT"
else
  echo "[restore] ERROR: backup file not found: $INPUT" >&2
  echo "[restore]        (also looked in $BACKUP_DIR/$INPUT)" >&2
  exit 1
fi

# Pre-restore safety backup of the current DB so a bad restore
# is recoverable.
if [[ -f "$DB_FILE" ]]; then
  mkdir -p "$BACKUP_DIR"
  PRE_STAMP="$(date +%Y%m%d-%H%M%S)"
  PRE_DEST="$BACKUP_DIR/custom-pre-restore-$PRE_STAMP.db"
  cp "$DB_FILE" "$PRE_DEST"
  echo "[restore] pre-restore backup: $PRE_DEST"
fi

# Copy the chosen backup over the live DB.
cp "$SRC" "$DB_FILE"
echo "[restore] OK: restored $SRC -> $DB_FILE"
echo "[restore] size: $(du -h "$DB_FILE" | cut -f1)"
