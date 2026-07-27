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

# The config path is unique to this extracted deployment. Matching only the
# JAR name could stop another HertzBeat instance on the same host.
PIDS=$(ps -ef \
    | grep "[j]ava" \
    | grep -F -- "-Dspring.config.location=$CONF_DIR/" \
    | awk '{ print $2 }')

if [[ -z "$PIDS" ]]; then
    echo "Apache HertzBeat $APPLICATION is already stopped"
    exit 0
fi

echo "Stopping Apache HertzBeat $APPLICATION: $PIDS"
for PID in $PIDS; do
    kill "$PID"
done

DEADLINE=$(($(date +%s) + STOP_TIMEOUT))
for PID in $PIDS; do
    while kill -0 "$PID" 2>/dev/null; do
        if [[ $(date +%s) -ge $DEADLINE ]]; then
            echo "ERROR: Apache HertzBeat $APPLICATION did not stop within ${STOP_TIMEOUT}s (PID $PID)" >&2
            exit 1
        fi
        sleep 1
    done
done

echo "Shutdown Apache HertzBeat $APPLICATION Success!"
