#!/usr/bin/env bash
# Daemonized dev-server launcher. Used by FIX-GAPS-2 after the
# Turbopack cache was corrupted and the original dev server had
# to be killed. Starts `bun run dev` fully detached from any
# controlling terminal so it survives the bash tool's session
# ending.
set -euo pipefail
cd /home/z/my-project
rm -rf .next dev.log
# setsid: new session, no controlling terminal.
# </dev/null: don't block on stdin.
# disown: remove from shell job table so SIGHUP doesn't reach it.
setsid bash -c 'bun run dev > dev.log 2>&1' </dev/null >/dev/null 2>&1 &
disown
echo "dev server started in detached session"
