#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

HERTZBEAT_BASE="${HERTZBEAT_BASE:-http://127.0.0.1:1157}"
FRONTEND_BASE="${FRONTEND_BASE:-http://127.0.0.1:4200}"
BACKEND_ORIGIN="${BACKEND_ORIGIN:-${HERTZBEAT_BASE}}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
TRACE_ID="${TRACE_ID:-6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b}"
SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:h2:mem:hb_live_smoke;MODE=MYSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/hb-three-signal-live-backend.log}"
FRONTEND_LOG="${FRONTEND_LOG:-/tmp/hb-three-signal-live-frontend.log}"
BACKEND_READY_PATH="${BACKEND_READY_PATH:-/actuator/health}"
READY_ATTEMPTS="${READY_ATTEMPTS:-300}"
READY_SLEEP_SECONDS="${READY_SLEEP_SECONDS:-2}"

DRY_RUN=false
BACKEND_PID=""
FRONTEND_WRAPPER_PID=""

for arg in "$@"; do
  case "${arg}" in
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      printf 'unsupported argument: %s\n' "${arg}" >&2
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempt
  for attempt in $(seq 1 "${READY_ATTEMPTS}"); do
    local status
    status="$(curl -sS -o /dev/null -w '%{http_code}' "${url}" 2>/dev/null || true)"
    if [[ "${status}" == 2* || "${status}" == 3* || "${status}" == "401" ]]; then
      printf '[three-signal-live] %s ready: %s\n' "${label}" "${url}"
      return 0
    fi
    sleep "${READY_SLEEP_SECONDS}"
  done
  printf '[three-signal-live] %s did not become ready: %s\n' "${label}" "${url}" >&2
  return 1
}

cleanup() {
  set +e
  if [[ -f /tmp/hb-web-app-dev.pid ]]; then
    local frontend_pid
    frontend_pid="$(cat /tmp/hb-web-app-dev.pid 2>/dev/null || true)"
    if [[ -n "${frontend_pid}" ]] && kill -0 "${frontend_pid}" 2>/dev/null; then
      kill "${frontend_pid}" 2>/dev/null || true
      wait "${frontend_pid}" 2>/dev/null || true
    fi
    rm -f /tmp/hb-web-app-dev.pid
  fi
  if [[ -n "${FRONTEND_WRAPPER_PID}" ]] && kill -0 "${FRONTEND_WRAPPER_PID}" 2>/dev/null; then
    kill "${FRONTEND_WRAPPER_PID}" 2>/dev/null || true
    wait "${FRONTEND_WRAPPER_PID}" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

run_dry_plan() {
  cat <<EOF
{
  "backend": {
    "command": "SPRING_DATASOURCE_URL='${SPRING_DATASOURCE_URL}' script/dev/start-workspace-backend.sh",
    "baseUrl": "${HERTZBEAT_BASE}",
    "readyPath": "${BACKEND_READY_PATH}",
    "log": "${BACKEND_LOG}",
    "persistentH2": false
  },
  "frontend": {
    "command": "BACKEND_ORIGIN='${BACKEND_ORIGIN}' FRONTEND_PORT='${FRONTEND_PORT}' script/dev/start-web-app.sh",
    "baseUrl": "${FRONTEND_BASE}",
    "log": "${FRONTEND_LOG}"
  },
  "seedAndVerify": {
    "command": "TRACE_ID='${TRACE_ID}' HERTZBEAT_BASE='${HERTZBEAT_BASE}' bash script/dev/verify-otlp-three-signal-demo.sh"
  },
  "routeSmoke": {
    "routes": ["/dashboard", "/entities", "/topology", "/explore?signal=metrics"]
  }
}
EOF
}

require_command curl
require_command corepack

if [[ "${DRY_RUN}" == true ]]; then
  run_dry_plan
  exit 0
fi

trap cleanup EXIT

printf '[three-signal-live] starting backend with non-persistent H2: %s\n' "${SPRING_DATASOURCE_URL}"
(
  cd "${ROOT_DIR}"
  SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL}" script/dev/start-workspace-backend.sh
) > "${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!
printf '[three-signal-live] backend log: %s\n' "${BACKEND_LOG}"
wait_for_http "${HERTZBEAT_BASE}${BACKEND_READY_PATH}" 'backend'

printf '[three-signal-live] seeding and verifying three-signal demo data\n'
(
  cd "${ROOT_DIR}"
  TRACE_ID="${TRACE_ID}" HERTZBEAT_BASE="${HERTZBEAT_BASE}" bash script/dev/verify-otlp-three-signal-demo.sh
)

printf '[three-signal-live] starting frontend on %s\n' "${FRONTEND_BASE}"
(
  cd "${ROOT_DIR}"
  BACKEND_ORIGIN="${BACKEND_ORIGIN}" FRONTEND_PORT="${FRONTEND_PORT}" script/dev/start-web-app.sh
) > "${FRONTEND_LOG}" 2>&1 &
FRONTEND_WRAPPER_PID=$!
printf '[three-signal-live] frontend wrapper log: %s\n' "${FRONTEND_LOG}"
wait_for_http "${FRONTEND_BASE}/dashboard" 'frontend'

printf '[three-signal-live] checking active React routes\n'
for route in /dashboard /entities /topology '/explore?signal=metrics'; do
  curl --fail --silent --show-error "${FRONTEND_BASE}${route}" > /dev/null
done

printf '[three-signal-live] proof completed successfully\n'
