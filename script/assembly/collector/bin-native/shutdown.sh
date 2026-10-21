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
cd ..
DEPLOY_DIR="$(pwd)"

CONF_DIR="$DEPLOY_DIR/config"
LOGS_DIR="$DEPLOY_DIR/logs"
PID_FILE="$LOGS_DIR/${project.artifactId}.pid"
APP_PATH="$DEPLOY_DIR/$BINARY_NAME"

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

PID="$(find_running_pid)"
if [ -z "$PID" ]; then
    echo "Apache HertzBeat ${SERVER_NAME} is already stopped"
    rm -f "$PID_FILE"
    exit 0
fi

if ! is_collector_pid "$PID"; then
    echo "ERROR: PID $PID no longer identifies this Collector; no signal sent." >&2
    exit 1
fi
if ! kill "$PID"; then
    echo "ERROR: Cannot request shutdown of Collector PID $PID." >&2
    exit 1
fi
for ((COUNT = 0; COUNT <= 30; COUNT++)); do
    if ! is_collector_pid "$PID"; then
        if kill -0 "$PID" 2>/dev/null; then
            echo "ERROR: Live PID $PID changed identity after shutdown was requested; inspect it without sending another signal." >&2
            exit 1
        fi
        rm -f "$PID_FILE"
        echo "Shutdown Apache HertzBeat ${SERVER_NAME} Success!"
        exit 0
    fi
    if [ "$COUNT" -lt 30 ]; then
        sleep 1
    fi
done

echo "ERROR: Collector PID $PID is still live after the shutdown deadline; PID file retained. Inspect $LOGS_DIR/startup.log" >&2
exit 1
