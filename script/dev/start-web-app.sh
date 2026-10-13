#!/usr/bin/env bash

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_APP_DIR="$ROOT_DIR/web-app"
BACKEND_ORIGIN="${BACKEND_ORIGIN:-http://127.0.0.1:1157}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
FRONTEND_PID_FILE="${FRONTEND_PID_FILE:-/tmp/hb-web-app-dev.pid}"
FRONTEND_LOG="${FRONTEND_LOG:-/tmp/hb-web-app-dev.log}"

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

cleanup_pid "$FRONTEND_PID_FILE"
trap 'cleanup_pid "$FRONTEND_PID_FILE"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$WEB_APP_DIR"
echo "[web-app] starting Vite on :$FRONTEND_PORT (BACKEND_ORIGIN=$BACKEND_ORIGIN)"
BACKEND_ORIGIN="$BACKEND_ORIGIN" \
  corepack pnpm@10.9.0 exec vite --host 0.0.0.0 --port "$FRONTEND_PORT" \
  > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

echo "[web-app] URL: http://127.0.0.1:$FRONTEND_PORT"
echo "[web-app] logs: $FRONTEND_LOG"
wait "$FRONTEND_PID"
