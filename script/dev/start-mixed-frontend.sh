#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_APP_DIR="$ROOT_DIR/web-app"
WEB_NEXT_DIR="$ROOT_DIR/web-next"
BACKEND_ORIGIN="${BACKEND_ORIGIN:-http://127.0.0.1:1157}"
NEXT_PORT="${NEXT_PORT:-4200}"
ANGULAR_PORT="${ANGULAR_PORT:-4201}"
NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next}"

cleanup_pid() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

cleanup_pid /tmp/hb-next-dev.pid
cleanup_pid /tmp/hb-angular-dev.pid

cd "$WEB_NEXT_DIR"
rm -rf "$NEXT_DIST_DIR"
echo "[mixed-frontend] starting Next.js on :$NEXT_PORT (BACKEND_ORIGIN=$BACKEND_ORIGIN, NEXT_DIST_DIR=$NEXT_DIST_DIR)"
BACKEND_ORIGIN="$BACKEND_ORIGIN" NEXT_DIST_DIR="$NEXT_DIST_DIR" ./node_modules/.bin/next dev -p "$NEXT_PORT" > /tmp/hb-next-dev.log 2>&1 &
NEXT_PID=$!

cd "$WEB_APP_DIR"
echo "[mixed-frontend] starting Angular on :$ANGULAR_PORT with proxy.conf.json"
npm run start -- --port "$ANGULAR_PORT" > /tmp/hb-angular-dev.log 2>&1 &
ANGULAR_PID=$!

echo "$NEXT_PID" > /tmp/hb-next-dev.pid
echo "$ANGULAR_PID" > /tmp/hb-angular-dev.pid

echo "[mixed-frontend] Next.js  : http://127.0.0.1:$NEXT_PORT"
echo "[mixed-frontend] Angular  : http://127.0.0.1:$ANGULAR_PORT"
echo "[mixed-frontend] proxied via Angular dev server: /trace/manage /log/manage /monitors /ingestion/otlp /ingestion/otlp/metrics"
echo "[mixed-frontend] logs: /tmp/hb-next-dev.log /tmp/hb-angular-dev.log"
wait
