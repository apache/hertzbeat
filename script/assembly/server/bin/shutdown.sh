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
APPLICATION="${project.artifactId}"
JAR_NAME="${project.build.finalName}.jar"

cd "$(dirname "$0")"
BIN_DIR=$(pwd)
cd ..
DEPLOY_DIR=$(pwd)
CONF_DIR="$DEPLOY_DIR/config"
STOP_TIMEOUT="${STOP_TIMEOUT:-60}"

case "$STOP_TIMEOUT" in
    ''|*[!0-9]*)
        echo "ERROR: STOP_TIMEOUT must be a non-negative integer" >&2
        exit 1
        ;;
esac

MAIN_CLASS="org.apache.hertzbeat.startup.HertzBeatApplication"
LIB_PATH="$DEPLOY_DIR/lib"
EXT_LIB_PATH="$DEPLOY_DIR/ext-lib"
CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"

# Match literal argument boundaries, not a prefix directory or another Java main.
is_server_command() {
    local command=" $1 "
    [[ "$command" == *" -Dspring.config.location=$CONF_DIR/ "* &&
        "$command" == *" -cp $CLASSPATH $MAIN_CLASS "* ]]
}

is_server_pid() {
    local candidate="$1"
    case "$candidate" in ''|*[!0-9]*) return 1 ;; esac
    [ "$candidate" -gt 0 ] 2>/dev/null || return 1
    kill -0 "$candidate" 2>/dev/null || return 1
    is_server_command "$(ps -p "$candidate" -o args= -ww 2>/dev/null)"
}

find_server_pids() {
    ps -axo pid=,args= -ww | while read -r candidate command; do
        if is_server_command "$command" && is_server_pid "$candidate"; then
            echo "$candidate"
        fi
    done
}

PIDS=$(find_server_pids)

if [[ -z "$PIDS" ]]; then
    echo "Apache HertzBeat $APPLICATION is already stopped"
    exit 0
fi

echo "Stopping Apache HertzBeat $APPLICATION: $PIDS"
for PID in $PIDS; do
    if ! is_server_pid "$PID"; then
        echo "ERROR: PID $PID no longer identifies this HertzBeat installation; no signal sent." >&2
        exit 1
    fi
    if ! kill "$PID"; then
        echo "ERROR: Could not request shutdown of HertzBeat PID $PID." >&2
        exit 1
    fi
done

DEADLINE=$(($(date +%s) + STOP_TIMEOUT))
for PID in $PIDS; do
    while true; do
        if ! is_server_pid "$PID"; then
            if kill -0 "$PID" 2>/dev/null; then
                echo "ERROR: Live PID $PID changed identity; no further signal sent." >&2
                exit 1
            fi
            break
        fi
        if [[ $(date +%s) -ge $DEADLINE ]]; then
            echo "ERROR: Apache HertzBeat $APPLICATION did not stop within ${STOP_TIMEOUT}s (PID $PID)" >&2
            exit 1
        fi
        sleep 1
    done
done

echo "Shutdown Apache HertzBeat $APPLICATION Success!"
