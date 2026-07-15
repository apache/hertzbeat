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

PID="$(find_running_pid)"
if [ -z "$PID" ]; then
    echo "Apache HertzBeat ${SERVER_NAME} is already stopped"
    rm -f "$PID_FILE"
    exit 0
fi

kill "$PID"
for _ in $(seq 1 30); do
    if ! kill -0 "$PID" 2>/dev/null; then
        rm -f "$PID_FILE"
        echo "Shutdown Apache HertzBeat ${SERVER_NAME} Success!"
        exit 0
    fi
    sleep 1
done

kill -9 "$PID" 2>/dev/null
rm -f "$PID_FILE"
echo "Shutdown Apache HertzBeat ${SERVER_NAME} Success!"
