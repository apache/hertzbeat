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
# project name
APPLICATION="${project.artifactId}"

# jar file name
APPLICATION_JAR="${project.build.finalName}.jar"

SHUTDOWN_TIMEOUT_SECONDS="${SHUTDOWN_TIMEOUT_SECONDS:-30}"
KILL_WAIT_SECONDS="${KILL_WAIT_SECONDS:-5}"

if [[ ! "$SHUTDOWN_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] \
        || [[ ! "$KILL_WAIT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
    echo "Shutdown timeouts must be positive integer seconds" >&2
    exit 2
fi
SHUTDOWN_TIMEOUT_SECONDS=$((10#$SHUTDOWN_TIMEOUT_SECONDS))
KILL_WAIT_SECONDS=$((10#$KILL_WAIT_SECONDS))

APPLICATION_PIDS=()
MANAGED_PIDS=()
TARGET_PIDS=()
PROCESS_TREE="$(ps -eo pid=,ppid=)"

add_target() {
    local pid="$1"
    local existing
    [[ "$pid" =~ ^[0-9]+$ ]] || return
    for existing in "${TARGET_PIDS[@]}"; do
        [[ "$existing" == "$pid" ]] && return
    done
    TARGET_PIDS+=("$pid")
}

capture_descendants() {
    local parent_pid="$1"
    local child_pid
    while IFS= read -r child_pid; do
        [[ -n "$child_pid" ]] || continue
        add_target "$child_pid"
        MANAGED_PIDS+=("$child_pid")
        capture_descendants "$child_pid"
    done < <(printf '%s\n' "$PROCESS_TREE" | awk -v parent="$parent_pid" '$2 == parent { print $1 }')
}

while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    APPLICATION_PIDS+=("$pid")
    add_target "$pid"
done < <(ps -eo pid=,command= | awk -v jar="$APPLICATION_JAR" \
    '$0 ~ /[j]ava/ && index($0, jar) > 0 { print $1 }')

if (( ${#APPLICATION_PIDS[@]} == 0 )); then
    echo "Apache HertzBeat ${APPLICATION} is already stopped"
    exit 0
fi

for pid in "${APPLICATION_PIDS[@]}"; do
    capture_descendants "$pid"
done

# Signal managed descendants first so they cannot outlive a fast JVM exit.
for pid in "${MANAGED_PIDS[@]}" "${APPLICATION_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null || true
    fi
done

remaining_pids() {
    local pid
    local state
    for pid in "${TARGET_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            state="$(ps -o stat= -p "$pid" 2>/dev/null | awk 'NR == 1 { print $1 }')"
            [[ "$state" == Z* ]] || printf '%s\n' "$pid"
        fi
    done
}

refresh_remaining() {
    local pid
    REMAINING_PIDS=()
    while IFS= read -r pid; do
        [[ -n "$pid" ]] && REMAINING_PIDS+=("$pid")
    done < <(remaining_pids)
}

deadline=$((SECONDS + SHUTDOWN_TIMEOUT_SECONDS))
while (( SECONDS < deadline )); do
    refresh_remaining
    if (( ${#REMAINING_PIDS[@]} == 0 )); then
        echo "Shutdown Apache HertzBeat ${APPLICATION} Success!"
        exit 0
    fi
    sleep 1
done

refresh_remaining
if (( ${#REMAINING_PIDS[@]} > 0 )); then
    echo "Graceful shutdown timed out; forcing remaining process termination" >&2
    for pid in "${REMAINING_PIDS[@]}"; do
        kill -KILL "$pid" 2>/dev/null || true
    done
fi

kill_deadline=$((SECONDS + KILL_WAIT_SECONDS))
while (( SECONDS < kill_deadline )); do
    refresh_remaining
    (( ${#REMAINING_PIDS[@]} == 0 )) && break
    sleep 1
done

refresh_remaining
if (( ${#REMAINING_PIDS[@]} > 0 )); then
    echo "Shutdown Apache HertzBeat ${APPLICATION} failed: managed processes remain" >&2
    exit 1
fi

echo "Shutdown Apache HertzBeat ${APPLICATION} Success after forced termination"
