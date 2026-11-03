#!/bin/bash
# Auto-restarting wrapper for the Next.js dev server.
# The bash loop survives across tool calls (like a plain `sleep` does),
# and respawns `next dev` whenever it gets killed.
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date '+%H:%M:%S')] next dev exited (rc=$?), restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
