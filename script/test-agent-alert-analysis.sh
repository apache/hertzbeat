#!/usr/bin/env bash
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0.

set -Eeuo pipefail

DURATION=300
CPU_WORKERS="$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf '1')"
TARGET_MEMORY_PERCENT=92
MIN_RESERVE_MB=1024
CONFIRMED=false
WORK_DIR="${TMPDIR:-/tmp}/hertzbeat-agent-alert-test"
PID_FILE="$WORK_DIR/pids"

usage() {
    cat <<'EOF'
Usage:
  ./test-agent-alert-analysis.sh run --confirm [options]
  ./test-agent-alert-analysis.sh stop
  ./test-agent-alert-analysis.sh status

Options:
  --duration SECONDS        Stress duration, default 300
  --cpu-workers NUMBER      CPU workers, default all logical CPUs
  --memory-percent PERCENT  Target total memory usage, default 92
  --reserve-mb MB           Minimum memory left available, default 1024

The run command generates CPU and memory pressure on this server. It requires
--confirm because the test intentionally pushes memory above the configured
HertzBeat threshold. Run only on a disposable or non-production server.
EOF
}

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "Required command not found: $1"
        exit 1
    fi
}

read_meminfo_mb() {
    local key="$1"
    awk -v key="$key" '$1 == key ":" {printf "%d", $2 / 1024}' /proc/meminfo
}

calculate_allocation_mb() {
    local total_mb available_mb used_mb target_used_mb allocation_mb reserve_after_mb
    total_mb="$(read_meminfo_mb MemTotal)"
    available_mb="$(read_meminfo_mb MemAvailable)"
    used_mb=$((total_mb - available_mb))
    target_used_mb=$((total_mb * TARGET_MEMORY_PERCENT / 100))
    allocation_mb=$((target_used_mb - used_mb))

    if ((allocation_mb <= 0)); then
        printf '0'
        return
    fi

    reserve_after_mb=$((available_mb - allocation_mb))
    if ((reserve_after_mb < MIN_RESERVE_MB)); then
        log "Refusing memory test: target would leave ${reserve_after_mb} MB available; reserve is ${MIN_RESERVE_MB} MB." >&2
        log "Lower --memory-percent or --reserve-mb only after confirming the server is disposable." >&2
        exit 1
    fi
    printf '%d' "$allocation_mb"
}

record_pid() {
    printf '%s\n' "$1" >>"$PID_FILE"
}

stop_test() {
    if [[ ! -f "$PID_FILE" ]]; then
        log "No active HertzBeat alert test was found."
        return
    fi

    while IFS= read -r pid; do
        if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done <"$PID_FILE"
    sleep 1
    while IFS= read -r pid; do
        if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done <"$PID_FILE"
    rm -f "$PID_FILE"
    log "CPU and memory stress processes stopped."
}

status_test() {
    local active=0
    if [[ -f "$PID_FILE" ]]; then
        while IFS= read -r pid; do
            if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
                printf 'running pid=%s command=' "$pid"
                tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null || true
                printf '\n'
                active=$((active + 1))
            fi
        done <"$PID_FILE"
    fi
    log "Active stress processes: $active"
    free -m
    uptime
}

start_cpu_stress() {
    local worker
    for ((worker = 0; worker < CPU_WORKERS; worker++)); do
        python3 -c 'while True: pass' &
        record_pid "$!"
    done
}

start_memory_stress() {
    local allocation_mb="$1"
    if ((allocation_mb == 0)); then
        log "Memory usage is already at or above ${TARGET_MEMORY_PERCENT}%; no allocator started."
        return
    fi

    ALLOCATION_MB="$allocation_mb" python3 - <<'PY' &
import os
import time

remaining = int(os.environ["ALLOCATION_MB"])
chunks = []
try:
    while remaining > 0:
        size_mb = min(64, remaining)
        block = bytearray(size_mb * 1024 * 1024)
        for offset in range(0, len(block), 4096):
            block[offset] = 1
        chunks.append(block)
        remaining -= size_mb
        time.sleep(0.05)
    while True:
        time.sleep(1)
except MemoryError:
    while True:
        time.sleep(1)
PY
    record_pid "$!"
}

run_test() {
    if [[ "$CONFIRMED" != true ]]; then
        log "The run command requires --confirm."
        usage
        exit 2
    fi
    if ((DURATION < 120)); then
        log "Duration must be at least 120 seconds because the alert rules require consecutive violations."
        exit 2
    fi
    if ((CPU_WORKERS < 1 || TARGET_MEMORY_PERCENT < 1 || TARGET_MEMORY_PERCENT > 95)); then
        log "Invalid CPU worker count or memory percentage. Maximum memory target is 95%."
        exit 2
    fi

    require_command python3
    require_command awk
    require_command free
    mkdir -p "$WORK_DIR"
    if [[ -f "$PID_FILE" ]]; then
        stop_test
    fi
    : >"$PID_FILE"

    local allocation_mb
    allocation_mb="$(calculate_allocation_mb)"
    log "Starting test for ${DURATION}s: CPU workers=${CPU_WORKERS}, memory allocation=${allocation_mb} MB."
    start_cpu_stress
    start_memory_stress "$allocation_mb"
    trap stop_test EXIT INT TERM

    log "Stress is active. HertzBeat should observe CPU >85% and memory >90% for at least two collection cycles."
    log "Use another terminal to run: $0 status"
    sleep "$DURATION"
    log "Test duration completed."
}

COMMAND="${1:-}"
if [[ -n "$COMMAND" ]]; then
    shift
fi

while (($# > 0)); do
    case "$1" in
        --confirm)
            CONFIRMED=true
            shift
            ;;
        --duration)
            DURATION="${2:?Missing value for --duration}"
            shift 2
            ;;
        --cpu-workers)
            CPU_WORKERS="${2:?Missing value for --cpu-workers}"
            shift 2
            ;;
        --memory-percent)
            TARGET_MEMORY_PERCENT="${2:?Missing value for --memory-percent}"
            shift 2
            ;;
        --reserve-mb)
            MIN_RESERVE_MB="${2:?Missing value for --reserve-mb}"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log "Unknown option: $1"
            usage
            exit 2
            ;;
    esac
done

case "$COMMAND" in
    run)
        run_test
        ;;
    stop)
        stop_test
        ;;
    status)
        status_test
        ;;
    *)
        usage
        exit 2
        ;;
esac
