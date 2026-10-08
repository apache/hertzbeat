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
JAR_NAME="${project.build.finalName}.jar"
cd "$(dirname "$0")/.." || exit 1
DEPLOY_DIR=$(pwd)
CONF_DIR="$DEPLOY_DIR/config"
LOGS_DIR="$DEPLOY_DIR/logs"
SERVER_PORT="${SERVER_PORT:-1157}"
START_TIMEOUT="${START_TIMEOUT:-120}"

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
if [ "${1:-}" = status ]; then
    if [ -n "$PIDS" ]; then
        echo "The HertzBeat $SERVER_NAME is running (PID: $PIDS)"
    else
        echo "The HertzBeat $SERVER_NAME is stopped"
    fi
    exit 0
fi
if [ -n "$PIDS" ]; then
    echo "ERROR: The HertzBeat $SERVER_NAME already started (PID: $PIDS)" >&2
    exit 1
fi
for value in "$SERVER_PORT" "$START_TIMEOUT"; do
    case "$value" in
        ''|*[!0-9]*) echo "ERROR: SERVER_PORT and START_TIMEOUT must be positive integers" >&2; exit 1 ;;
    esac
done
if [ "$SERVER_PORT" -lt 1 ] || [ "$SERVER_PORT" -gt 65535 ] || [ "$START_TIMEOUT" -lt 1 ]; then
    echo "ERROR: Invalid SERVER_PORT or START_TIMEOUT" >&2
    exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: curl is required to verify HertzBeat HTTP startup" >&2
    exit 1
fi
if (echo > "/dev/tcp/127.0.0.1/$SERVER_PORT") >/dev/null 2>&1; then
    echo "ERROR: HertzBeat port $SERVER_PORT is already used" >&2
    exit 1
fi

JAVA=java
if [ -x "$DEPLOY_DIR/java/bin/java" ]; then
    JAVA="$DEPLOY_DIR/java/bin/java"
elif ! command -v java >/dev/null 2>&1; then
    echo "ERROR: Java 25 or newer is required" >&2
    exit 1
fi
mkdir -p "$LOGS_DIR" || exit 1
# User options are whitespace-separated JVM arguments, never evaluated as shell code.
read -r -a EXTRA_JAVA_OPTS <<< "${JAVA_OPTS:-}"
read -r -a MEMORY_OPTS <<< "${JAVA_MEM_OPTS:--server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError}"
CONFIG_OPTS=("-Dlogging.path=$LOGS_DIR" "-Dspring.config.location=$CONF_DIR/")
if [ -f "$CONF_DIR/logback-spring.xml" ]; then
    CONFIG_OPTS+=("-Dlogging.config=$CONF_DIR/logback-spring.xml")
fi
echo "Starting HertzBeat $SERVER_NAME; logs: $LOGS_DIR/startup.log"
nohup "$JAVA" "${EXTRA_JAVA_OPTS[@]}" "${MEMORY_OPTS[@]}" \
    -Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8 -Doracle.jdbc.timezoneAsRegion=false \
    --add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED \
    "-XX:HeapDumpPath=$LOGS_DIR" "${CONFIG_OPTS[@]}" \
    -cp "$CLASSPATH" "$MAIN_CLASS" "$@" >"$LOGS_DIR/startup.log" 2>&1 &
PID=$!
DEADLINE=$((SECONDS + START_TIMEOUT))
while [ "$SECONDS" -lt "$DEADLINE" ]; do
    sleep 1
    if ! kill -0 "$PID" 2>/dev/null; then
        wait "$PID" || true
        echo "ERROR: HertzBeat process $PID exited; inspect $LOGS_DIR/startup.log" >&2
        exit 1
    fi
    if ! is_server_pid "$PID"; then
        echo "ERROR: PID $PID no longer identifies this HertzBeat installation; no signal sent." >&2
        exit 1
    fi
    BODY=$(curl --noproxy '*' --silent --fail --max-time 2 "http://127.0.0.1:$SERVER_PORT/api/setup/status") || continue
    if [[ "$BODY" =~ \"phase\"[[:space:]]*:[[:space:]]*\"(configuration_required|administrator_required|optional_configuration|ready_to_complete|complete)\" ]] \
        && kill -0 "$PID" 2>/dev/null; then
        PHASE="${BASH_REMATCH[1]}"
        echo "Service Start Success! PID: $PID"
        if [ "$PHASE" != complete ]; then
            echo "Setup required ($PHASE): http://127.0.0.1:$SERVER_PORT/setup"
        fi
        exit 0
    fi
done
# Recheck the launched child's identity immediately before requesting shutdown.
if is_server_pid "$PID" && kill "$PID" 2>/dev/null; then
    echo "ERROR: HertzBeat startup timed out after ${START_TIMEOUT}s; requested shutdown of PID $PID. Inspect $LOGS_DIR/startup.log" >&2
else
    echo "ERROR: HertzBeat startup timed out; shutdown of PID $PID was not requested. Inspect its identity and $LOGS_DIR/startup.log" >&2
fi
exit 1
