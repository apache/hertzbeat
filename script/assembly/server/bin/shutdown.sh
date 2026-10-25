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
START_TIMEOUT="${HERTZBEAT_START_TIMEOUT:-30}"
case "$STOP_TIMEOUT:$START_TIMEOUT" in *[!0-9:]*|:*|*:) echo 'ERROR: invalid timeout' >&2; exit 1 ;; esac
[ "$STOP_TIMEOUT" -gt 0 ] && [ "$START_TIMEOUT" -gt 0 ] || exit 1
. "$BIN_DIR/lifecycle.sh" || exit 1
find_pid || exit 1
if [ -z "$APP_PID" ]; then
    rm -f -- "$PID_FILE"
    echo 'Service already stopped'
    exit 0
fi
APP_BIRTH="$(process_birth "$APP_PID")"
[ -n "$APP_BIRTH" ] || { echo 'ERROR: cannot verify process start time' >&2; exit 1; }
if ! stop_owned; then echo 'ERROR: shutdown failed' >&2; exit 1; fi
rm -f -- "$PID_FILE"
echo 'Shutdown Success!'
