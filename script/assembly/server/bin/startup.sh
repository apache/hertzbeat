#!/bin/bash

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

NATIVE=false
SERVER_PORT=1157
BIN_DIR="$(cd -- "$(dirname -- "$0")" && pwd -P)" || exit 1
DEPLOY_DIR="$(cd -- "$BIN_DIR/.." && pwd -P)" || exit 1
cd -- "$DEPLOY_DIR" || exit 1
PID_FILE="$DEPLOY_DIR/logs/${project.artifactId}.pid"
MAIN_CLASS=org.apache.hertzbeat.startup.HertzBeatApplication
APP_PATH="$DEPLOY_DIR/${project.build.finalName}"
STOP_TIMEOUT="${HERTZBEAT_STOP_TIMEOUT:-30}"
# Allow slower database migrations; override per invocation with HERTZBEAT_START_TIMEOUT.
START_TIMEOUT="${HERTZBEAT_START_TIMEOUT:-120}"
case "$STOP_TIMEOUT:$START_TIMEOUT" in *[!0-9:]*|:*|*:) echo 'ERROR: invalid timeout' >&2; exit 1 ;; esac
[ "$STOP_TIMEOUT" -gt 0 ] && [ "$START_TIMEOUT" -gt 0 ] || exit 1
. "$BIN_DIR/lifecycle.sh" || exit 1
find_pid || exit 1
if [ "${1:-}" = status ]; then
    if [ -n "$APP_PID" ]; then echo "Service PID: $APP_PID"; else echo 'Service stopped'; fi
    exit 0
fi
[ -z "$APP_PID" ] || { echo 'ERROR: already started' >&2; exit 1; }
choose_readiness_tool || exit 1
mkdir -p -- "$DEPLOY_DIR/logs" || exit 1
if [ "$NATIVE" = true ]; then
    [ -x "$APP_PATH" ] || { echo 'ERROR: native executable missing' >&2; exit 1; }
    nohup "$APP_PATH" "--spring.config.location=$DEPLOY_DIR/config/" "$@" >"$DEPLOY_DIR/logs/startup.log" 2>&1 &
else
    JAVA_OPTS="-Duser.timezone=Asia/Shanghai ${JAVA_OPTS:-}" nohup "$BIN_DIR/entrypoint.sh" "$@" >"$DEPLOY_DIR/logs/startup.log" 2>&1 &
fi
APP_PID=$!
deadline=$((SECONDS + START_TIMEOUT))
# Give the child time to exec before checking its installation arguments.
sleep 1
while ! owned_pid "$APP_PID"; do
    kill -0 "$APP_PID" 2>/dev/null || { echo 'ERROR: service exited; check logs/startup.log' >&2; exit 1; }
    [ "$SECONDS" -lt "$deadline" ] || { echo 'ERROR: cannot verify launched process identity' >&2; exit 1; }
    sleep 1
done
remember_pid || { echo 'ERROR: cannot record process identity' >&2; exit 1; }
while true; do
    if ! still_owned; then
        if process_gone; then rm -f -- "$PID_FILE"; fi
        echo 'ERROR: service exited or identity could not be verified; check logs/startup.log' >&2
        exit 1
    fi
    if listener_ready; then
        echo "Service Start Success! Service PID: $APP_PID"
        exit 0
    fi
    [ "$SECONDS" -lt "$deadline" ] || break
    sleep 1
done
echo 'ERROR: readiness timed out' >&2
if stop_owned; then rm -f -- "$PID_FILE"; fi
exit 1
