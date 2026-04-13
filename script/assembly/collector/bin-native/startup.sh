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

CONF_DIR="$DEPLOY_DIR/config"
LOGS_DIR="$DEPLOY_DIR/logs"
PID_FILE="$LOGS_DIR/${project.artifactId}.pid"
APP_PATH="$DEPLOY_DIR/$BINARY_NAME"
SERVER_PORT=1159

find_running_pid() {
    if [ -f "$PID_FILE" ]; then
        PID="$(cat "$PID_FILE" 2>/dev/null)"
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "$PID"
            return 0
        fi
    fi

    ps -ef | grep "$APP_PATH" | grep "$CONF_DIR" | grep -v grep | awk '{print $2}' | head -n 1
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
    if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:$SERVER_PORT -sTCP:LISTEN | grep -q "$APP_PID"; then
        break
    fi
    COUNT=$((COUNT + 1))
done

echo "Service Start Success!"
echo "Service PID: $APP_PID"
