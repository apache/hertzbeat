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

# Called only by the installed startup/shutdown scripts.
process_command() { ps -ww -p "$1" -o args= 2>/dev/null; }
process_birth() { ps -ww -p "$1" -o lstart= 2>/dev/null | awk '{$1=$1;print}'; }
owned_pid() {
    case "$1" in ''|*[!0-9]*) return 1 ;; esac
    [ "$1" -gt 1 ] || return 1
    local command status
    command="$(process_command "$1")"
    status=$?
    if [ "$status" -ne 0 ] || [ -z "$command" ]; then
        process_gone "$1" && return 1
        return 2
    fi
    owned_command "$command"
}
owned_command() {
    local command="$1"
    if [ "$NATIVE" = true ]; then
        case "$command " in "$APP_PATH "*) ;; *) return 1 ;; esac
        case " $command " in *" --spring.config.location=$DEPLOY_DIR/config/ "*) ;; *) return 1 ;; esac
    else
        case " $command " in *" $MAIN_CLASS "*) ;; *) return 1 ;; esac
        case " $command " in *" -cp ${APP_PATH}.jar:$DEPLOY_DIR/lib/*:$DEPLOY_DIR/ext-lib/* "*) ;; *) return 1 ;; esac
        case " $command " in *" -Dspring.config.location=$DEPLOY_DIR/config/ "*) ;; *) return 1 ;; esac
    fi
}
find_pid() {
    local candidate birth saved_birth snapshot status matches=''
    snapshot="$(ps -ww -eo pid=,args=)" || return 1
    if [ -f "$PID_FILE" ]; then
        { read -r candidate; read -r saved_birth; } < "$PID_FILE"
        owned_pid "$candidate"
        status=$?
        [ "$status" -ne 2 ] || { echo 'ERROR: cannot verify saved process identity' >&2; return 1; }
        if [ "$status" -eq 0 ]; then
            birth="$(process_birth "$candidate")"
            if [ -n "$saved_birth" ] && [ "$birth" != "$saved_birth" ]; then
                echo 'ERROR: PID start time changed; refusing this stale identity' >&2
                return 1
            fi
        fi
    fi
    while read -r candidate command; do
        owned_command "$command" || continue
        owned_pid "$candidate"
        status=$?
        [ "$status" -ne 2 ] || { echo 'ERROR: cannot verify process identity' >&2; return 1; }
        if [ "$status" -eq 0 ]; then matches="$matches $candidate"; fi
    done <<< "$snapshot"
    set -- $matches
    if [ "$#" -gt 1 ]; then
        echo 'ERROR: multiple processes match this installation; refusing to signal.' >&2
        return 1
    fi
    APP_PID="${1:-}"
}
remember_pid() {
    APP_BIRTH="$(process_birth "$APP_PID")"
    [ -n "$APP_BIRTH" ] || return 1
    printf '%s\n%s\n' "$APP_PID" "$APP_BIRTH" > "$PID_FILE"
}
still_owned() {
    owned_pid "$APP_PID" && [ "$(process_birth "$APP_PID")" = "$APP_BIRTH" ]
}
process_gone() {
    local command status result pid="${1:-$APP_PID}"
    command="$(process_command "$pid")"
    status=$?
    [ "$status" -le 1 ] && [ -z "$command" ] || return 1
    result="$(LC_ALL=C kill -0 "$pid" 2>&1)" && return 1
    case "$result" in *'No such process'*) return 0 ;; *) return 1 ;; esac
}
# ps and kill cannot be atomic; recheck identity before each signal.
stop_owned() {
    still_owned || { process_gone; return $?; }
    kill -TERM "$APP_PID" || return 1
    local deadline=$((SECONDS + STOP_TIMEOUT))
    while still_owned && [ "$SECONDS" -lt "$deadline" ]; do sleep 1; done
    still_owned || { process_gone; return $?; }
    kill -KILL "$APP_PID" || return 1
    deadline=$((SECONDS + STOP_TIMEOUT))
    while still_owned && [ "$SECONDS" -lt "$deadline" ]; do sleep 1; done
    process_gone
}

choose_readiness_tool() {
    if command -v lsof >/dev/null 2>&1; then READINESS_TOOL=lsof
    elif command -v ss >/dev/null 2>&1; then READINESS_TOOL=ss
    elif command -v netstat >/dev/null 2>&1 && netstat --version >/dev/null 2>&1; then READINESS_TOOL=netstat
    else echo 'ERROR: readiness requires lsof, ss, or Linux netstat with PID support' >&2; return 1
    fi
}
listener_ready() {
    case "$READINESS_TOOL" in
        lsof) lsof -t -a -p "$APP_PID" -iTCP:"$SERVER_PORT" -sTCP:LISTEN 2>/dev/null | grep -Fxq "$APP_PID" ;;
        ss) ss -H -ltnp "sport = :$SERVER_PORT" 2>/dev/null | grep -Eq "pid=$APP_PID(,|\\))" ;;
        netstat) netstat -ltnp 2>/dev/null | awk -v port="$SERVER_PORT" -v pid="$APP_PID" '
            $1 ~ /^tcp/ && $4 ~ ":" port "$" && $6 == "LISTEN" && $7 ~ "^" pid "/" {ready=1}
            END {exit !ready}' ;;
    esac
}
