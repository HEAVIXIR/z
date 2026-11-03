#!/usr/bin/env bash
# ============================================================
# HEAVIX — Database Backup (FIX-GAPS-2)
# ------------------------------------------------------------
# Copies db/custom.db to db/backups/custom-YYYYMMDD-HHMMSS.db
# Keeps the last 10 backups (deletes older). Cron-friendly:
#
#   # m h  dom mon dow   command
#   0 3 * * *  /home/z/my-project/scripts/backup.sh >> /var/log/havix-backup.log 2>&1
#
# Safe to run manually any time. Uses cp (not sqlite3 .backup)
# so it works even when the sqlite3 CLI isn't installed — the
# SQLite WAL mode is journaled, so a single-file cp gives a
# crash-consistent snapshot in practice for our write volume.
# For higher-write deployments, swap to `sqlite3 custom.db ".backup '$dest'"`
# which performs an online consistent snapshot.
# ============================================================
set -euo pipefail

# Resolve project root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_FILE="$PROJECT_ROOT/db/custom.db"
BACKUP_DIR="$PROJECT_ROOT/db/backups"
MAX_BACKUPS=10

if [[ ! -f "$DB_FILE" ]]; then
  echo "[backup] ERROR: database file not found at $DB_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/custom-$STAMP.db"

# Copy with explicit error handling so a failed cp doesn't leave
# a half-written file in the backups dir.
if cp "$DB_FILE" "$DEST"; then
  echo "[backup] OK: $DEST ($(du -h "$DEST" | cut -f1))"
else
  echo "[backup] ERROR: cp failed for $DB_FILE -> $DEST" >&2
  rm -f "$DEST"
  exit 1
fi

# Rotate: keep newest $MAX_BACKUPS, delete the rest. `ls -t`
# sorts by mtime newest-first; we tail everything past the
# first $MAX_BACKUPS lines and rm each.
cd "$BACKUP_DIR"
# shellcheck disable=SC2012
ls -t custom-*.db 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read -r old; do
  if [[ -n "$old" && -f "$old" ]]; then
    rm -f "$old"
    echo "[backup] rotated: $old"
  fi
done

# Summary
COUNT=$(ls -1 custom-*.db 2>/dev/null | wc -l | tr -d ' ')
echo "[backup] total backups in $BACKUP_DIR: $COUNT"
