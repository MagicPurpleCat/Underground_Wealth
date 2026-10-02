#!/bin/sh
set -eu

cd /app

echo "[amvera] migrate…"
node dist/db/migrate.js

echo "[amvera] start API on :${PORT:-80}"
node dist/index.js &
API_PID=$!

BOT_PID=""
if [ -n "${MAX_BOT_TOKEN:-}" ]; then
  echo "[amvera] start Max bot…"
  node dist/bot/run.js &
  BOT_PID=$!
else
  echo "[amvera] MAX_BOT_TOKEN empty — bot skipped"
fi

term() {
  kill -TERM "$API_PID" 2>/dev/null || true
  if [ -n "$BOT_PID" ]; then
    kill -TERM "$BOT_PID" 2>/dev/null || true
  fi
  wait || true
}
trap term INT TERM

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[amvera] API exited"
    term
    exit 1
  fi
  if [ -n "$BOT_PID" ] && ! kill -0 "$BOT_PID" 2>/dev/null; then
    echo "[amvera] bot exited — restarting"
    node dist/bot/run.js &
    BOT_PID=$!
  fi
  sleep 5
done
