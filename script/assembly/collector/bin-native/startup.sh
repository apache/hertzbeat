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

SERVER_NAME="${project.artifactId}"
BINARY_NAME="${project.build.finalName}"

cd "$(dirname "$0")"
BIN_DIR="$(pwd)"
cd ..
DEPLOY_DIR="$(pwd)"
: "${HERTZBEAT_HOME:=$DEPLOY_DIR}"
export HERTZBEAT_HOME

CONF_DIR="$DEPLOY_DIR/config"
LOGS_DIR="$DEPLOY_DIR/logs"
PID_FILE="$LOGS_DIR/${project.artifactId}.pid"
APP_PATH="$DEPLOY_DIR/$BINARY_NAME"
SERVER_PORT=1159

# A PID file is only a hint; PID reuse must not target another process.
is_collector_pid() {
    local candidate="$1"
    case "$candidate" in ''|*[!0-9]*) return 1 ;; esac
    [ "$candidate" -gt 0 ] 2>/dev/null || return 1
    kill -0 "$candidate" 2>/dev/null || return 1
    [ "$(ps -p "$candidate" -o args= -ww 2>/dev/null)" = "$APP_PATH --spring.config.location=$CONF_DIR/" ]
}

find_running_pid() {
    local candidate
    if [ -f "$PID_FILE" ]; then
        candidate="$(cat "$PID_FILE" 2>/dev/null)"
        if is_collector_pid "$candidate"; then
            echo "$candidate"
            return 0
        fi
    fi

    ps -axo pid=,args= -ww | while read -r candidate command; do
        if [ "$command" = "$APP_PATH --spring.config.location=$CONF_DIR/" ] && is_collector_pid "$candidate"; then
            echo "$candidate"
            break
        fi
    done
}

RUNNING_PID="$(find_running_pid)"
if [ "$1" = "status" ]; then
    if [ -n "$RUNNING_PID" ]; then
        echo "The HertzBeat $SERVER_NAME is running...!"
        echo "PID: $RUNNING_PID"
    else
        echo "The HertzBeat $SERVER_NAME is stopped"
    fi
    exit 0
fi

if [ ! -x "$APP_PATH" ]; then
    echo "ERROR: native executable not found: $APP_PATH"
    exit 1
fi

if [ -n "$RUNNING_PID" ]; then
    echo "ERROR: The HertzBeat $SERVER_NAME already started!"
    echo "PID: $RUNNING_PID"
    exit 1
fi

mkdir -p "$LOGS_DIR"

if command -v lsof >/dev/null 2>&1; then
    SERVER_PORT_COUNT="$(lsof -nP -iTCP:$SERVER_PORT -sTCP:LISTEN | wc -l)"
    if [ "$SERVER_PORT_COUNT" -gt 0 ]; then
        echo "ERROR: The HertzBeat $SERVER_NAME port $SERVER_PORT is already used!"
        exit 1
    fi
fi

echo "You can review logs at hertzbeat/logs"
echo "Starting the HertzBeat $SERVER_NAME ..."
nohup "$APP_PATH" --spring.config.location="$CONF_DIR/" >"$LOGS_DIR/startup.log" 2>&1 &
APP_PID=$!
echo "$APP_PID" >"$PID_FILE"

COUNT=0
while [ $COUNT -lt 30 ]; do
    sleep 1
    if ! kill -0 "$APP_PID" 2>/dev/null; then
        echo "ERROR: Service start failed, check $LOGS_DIR/startup.log"
        rm -f "$PID_FILE"
        exit 1
    fi
    if ! is_collector_pid "$APP_PID"; then
        echo "ERROR: PID $APP_PID no longer identifies this Collector; no signal sent. Inspect $LOGS_DIR/startup.log" >&2
        exit 1
    fi
    if ! command -v lsof >/dev/null 2>&1; then
        echo "Native process launched (PID: $APP_PID); readiness unverified without lsof. Inspect $LOGS_DIR/startup.log and verify collection."
        exit 0
    fi
    if lsof -nP -iTCP:$SERVER_PORT -sTCP:LISTEN | awk -v pid="$APP_PID" '$2 == pid { found = 1 } END { exit !found }'; then
        echo "Service Start Success!"
        echo "Service PID: $APP_PID"
        exit 0
    fi
    COUNT=$((COUNT + 1))
done

# Recheck ownership before signaling; retain the PID file for inspection.
if is_collector_pid "$APP_PID" && kill "$APP_PID" 2>/dev/null; then
    echo "ERROR: Native startup timed out waiting for PID $APP_PID on port $SERVER_PORT; requested shutdown. Inspect $LOGS_DIR/startup.log" >&2
else
    echo "ERROR: Native startup timed out; shutdown of PID $APP_PID was not requested. Inspect its identity and $LOGS_DIR/startup.log" >&2
fi
exit 1
