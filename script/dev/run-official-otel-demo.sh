#!/usr/bin/env bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${OTEL_DEMO_STATE_DIR:-${REPO_ROOT}/.tmp/official-otel-demo}"
UPSTREAM_DIR="${OTEL_DEMO_UPSTREAM_DIR:-${STATE_DIR}/opentelemetry-demo}"
ENV_FILE="${STATE_DIR}/otel-demo-hertzbeat.env"
OVERRIDE_FILE="${REPO_ROOT}/script/dev/otel-demo/docker-compose.hertzbeat.override.yml"
EXTRAS_FILE="${REPO_ROOT}/script/dev/otel-demo/otelcol-config-extras.hertzbeat.yml"

DEMO_REPO_URL="${OTEL_DEMO_REPO_URL:-https://github.com/open-telemetry/opentelemetry-demo.git}"
DEMO_VERSION="${OTEL_DEMO_VERSION:-2.2.0}"
COMPOSE_FILE="${OTEL_DEMO_COMPOSE_FILE:-docker-compose.yml}"
PROJECT_NAME="${OTEL_DEMO_PROJECT_NAME:-official-otel-demo-hertzbeat}"
MINIMAL_COMPOSE_FILE="${OTEL_DEMO_MINIMAL_COMPOSE_FILE:-${COMPOSE_FILE}}"
MINIMAL_PROJECT_NAME="${OTEL_DEMO_MINIMAL_PROJECT_NAME:-official-otel-demo-hertzbeat-minimal}"
MINIMAL_SERVICES="${OTEL_DEMO_MINIMAL_SERVICES:-otel-collector flagd product-catalog recommendation}"
TRIGGER_SCRIPT="${REPO_ROOT}/script/dev/otel-demo/trigger-recommendation-correlation.sh"

HB_SERVER="${HB_SERVER:-http://127.0.0.1:1157}"
HB_OTLP_ENDPOINT="${HB_OTLP_ENDPOINT:-http://host.docker.internal:1157/api/otlp}"
HB_ADMIN_USERNAME="${HB_ADMIN_USERNAME:-admin}"
HB_ADMIN_PASSWORD="${HB_ADMIN_PASSWORD:-hertzbeat}"
HB_API_TOKEN_NAME="${HB_API_TOKEN_NAME:-official-otel-demo-token}"

OTEL_COLLECTOR_PORT_GRPC="${OTEL_COLLECTOR_PORT_GRPC:-14317}"
OTEL_COLLECTOR_PORT_HTTP="${OTEL_COLLECTOR_PORT_HTTP:-14318}"
ENVOY_PORT="${OTEL_DEMO_ENVOY_PORT:-18080}"
ENVOY_ADMIN_PORT="${OTEL_DEMO_ENVOY_ADMIN_PORT:-18081}"
GRAFANA_PORT="${OTEL_DEMO_GRAFANA_PORT:-13000}"
PROMETHEUS_PORT="${OTEL_DEMO_PROMETHEUS_PORT:-19090}"
JAEGER_UI_PORT="${OTEL_DEMO_JAEGER_UI_PORT:-18686}"
FLAGD_UI_PORT="${OTEL_DEMO_FLAGD_UI_PORT:-18082}"

POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-5}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-30}"
CURL_MAX_TIME_SECONDS="${CURL_MAX_TIME_SECONDS:-15}"

login_token=""

usage() {
  cat <<EOF
用法: $(basename "$0") <up|down|status|logs|verify|up-minimal|down-minimal|status-minimal|logs-minimal|verify-minimal>

环境变量:
  HB_SERVER                 HertzBeat 地址，默认 http://127.0.0.1:1157
  HB_OTLP_ENDPOINT          Docker 内 collector 发往 HertzBeat 的 OTLP 基础地址
                            默认 http://host.docker.internal:1157/api/otlp
  HB_API_TOKEN              已存在的 API Token，可跳过自动生成
  HB_ADMIN_USERNAME         自动生成 API Token 使用的账号，默认 admin
  HB_ADMIN_PASSWORD         自动生成 API Token 使用的密码，默认 hertzbeat
  OTEL_DEMO_VERSION         官方 OpenTelemetry Demo 版本，默认 2.2.0
EOF
}

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少依赖命令: $1" >&2
    exit 1
  fi
}

log_step() {
  echo
  echo "==> $1"
}

api_post_json() {
  local path="$1"
  local bearer="$2"
  local body="$3"
  if [[ -n "$bearer" ]]; then
    curl -f -sS --max-time "${CURL_MAX_TIME_SECONDS}" -X POST \
      -H "Authorization: Bearer ${bearer}" \
      -H 'Content-Type: application/json' \
      --data "$body" \
      "${HB_SERVER}${path}"
  else
    curl -f -sS --max-time "${CURL_MAX_TIME_SECONDS}" -X POST \
      -H 'Content-Type: application/json' \
      --data "$body" \
      "${HB_SERVER}${path}"
  fi
}

api_get() {
  local path="$1"
  local bearer="$2"
  curl -f -sS --max-time "${CURL_MAX_TIME_SECONDS}" \
    -H "Authorization: Bearer ${bearer}" \
    "${HB_SERVER}${path}"
}

api_delete() {
  local path="$1"
  local bearer="$2"
  curl -f -sS --max-time "${CURL_MAX_TIME_SECONDS}" -X DELETE \
    -H "Authorization: Bearer ${bearer}" \
    "${HB_SERVER}${path}"
}

poll_until() {
  local description="$1"
  local command="$2"
  local attempt
  for attempt in $(seq 1 "${POLL_ATTEMPTS}"); do
    if eval "$command"; then
      echo "通过: ${description} (第 ${attempt} 次)"
      return 0
    fi
    sleep "${POLL_INTERVAL_SECONDS}"
  done
  echo "超时未通过: ${description}" >&2
  return 1
}

ensure_backend() {
  curl -sS -I --max-time "${CURL_MAX_TIME_SECONDS}" "${HB_SERVER}" >/dev/null
}

ensure_upstream_repo() {
  mkdir -p "${STATE_DIR}"
  if [[ ! -d "${UPSTREAM_DIR}/.git" ]]; then
    log_step "克隆官方 OpenTelemetry Demo ${DEMO_VERSION}"
    git clone --depth 1 --branch "${DEMO_VERSION}" "${DEMO_REPO_URL}" "${UPSTREAM_DIR}"
    return
  fi

  log_step "更新官方 OpenTelemetry Demo ${DEMO_VERSION}"
  git -C "${UPSTREAM_DIR}" fetch --depth 1 origin "refs/tags/${DEMO_VERSION}:refs/tags/${DEMO_VERSION}"
  git -C "${UPSTREAM_DIR}" checkout --force "${DEMO_VERSION}"
  git -C "${UPSTREAM_DIR}" clean -fd
}

login_hertzbeat() {
  local response
  response="$(api_post_json "/api/account/auth/form" "" "$(cat <<JSON
{
  "type": 0,
  "identifier": "${HB_ADMIN_USERNAME}",
  "credential": "${HB_ADMIN_PASSWORD}"
}
JSON
)")"
  login_token="$(jq -r '.data.token // empty' <<<"${response}")"
  if [[ -z "${login_token}" ]]; then
    echo "登录 HertzBeat 失败: ${response}" >&2
    exit 1
  fi
}

ensure_api_token() {
  if [[ -n "${HB_API_TOKEN:-}" ]]; then
    echo "${HB_API_TOKEN}"
    return
  fi

  login_hertzbeat

  local tokens_response token_ids token_response token
  tokens_response="$(api_get "/api/account/token" "${login_token}")"
  token_ids="$(jq -r --arg name "${HB_API_TOKEN_NAME}" '.data[]? | select(.name == $name) | .id' <<<"${tokens_response}")"
  if [[ -n "${token_ids}" ]]; then
    while IFS= read -r token_id; do
      [[ -z "${token_id}" ]] && continue
      api_delete "/api/account/token/${token_id}" "${login_token}" >/dev/null || true
    done <<<"${token_ids}"
  fi

  token_response="$(curl -f -sS --max-time "${CURL_MAX_TIME_SECONDS}" -X POST \
    -H "Authorization: Bearer ${login_token}" \
    "${HB_SERVER}/api/account/token/generate?name=${HB_API_TOKEN_NAME}&expireSeconds=-1")"
  token="$(jq -r '.data.token // empty' <<<"${token_response}")"
  if [[ -z "${token}" ]]; then
    echo "生成 OTLP Demo API Token 失败: ${token_response}" >&2
    exit 1
  fi
  echo "${token}"
}

write_env_file() {
  local token="$1"
  mkdir -p "${STATE_DIR}"
  cat > "${ENV_FILE}" <<EOF
DEMO_VERSION=${DEMO_VERSION}
OTEL_COLLECTOR_CONFIG_EXTRAS=${EXTRAS_FILE}
OTEL_COLLECTOR_PORT_GRPC=${OTEL_COLLECTOR_PORT_GRPC}
OTEL_COLLECTOR_PORT_HTTP=${OTEL_COLLECTOR_PORT_HTTP}
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:${OTEL_COLLECTOR_PORT_GRPC}
ENVOY_PORT=${ENVOY_PORT}
ENVOY_ADMIN_PORT=${ENVOY_ADMIN_PORT}
GRAFANA_PORT=${GRAFANA_PORT}
PROMETHEUS_PORT=${PROMETHEUS_PORT}
JAEGER_UI_PORT=${JAEGER_UI_PORT}
FLAGD_UI_PORT=${FLAGD_UI_PORT}
HB_OTLP_ENDPOINT=${HB_OTLP_ENDPOINT}
HB_API_TOKEN=${token}
EOF
  chmod 600 "${ENV_FILE}"
}

compose_cmd() {
  local project_name="$1"
  local compose_file="$2"
  shift 2
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "缺少环境文件 ${ENV_FILE}，请先执行 up 或 up-minimal" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "${UPSTREAM_DIR}/.env"
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  docker compose -p "${project_name}" \
    -f "${UPSTREAM_DIR}/${compose_file}" \
    -f "${OVERRIDE_FILE}" \
    "$@"
}

compose() {
  compose_cmd "${PROJECT_NAME}" "${COMPOSE_FILE}" "$@"
}

compose_minimal() {
  compose_cmd "${MINIMAL_PROJECT_NAME}" "${MINIMAL_COMPOSE_FILE}" "$@"
}

stop_demo_projects() {
  compose down --remove-orphans >/dev/null 2>&1 || true
  compose_minimal down --remove-orphans >/dev/null 2>&1 || true
}

verify_demo() {
  if [[ -z "${login_token}" ]]; then
    login_hertzbeat
  fi

  log_step "验证 OTLP 概览"
  poll_until "OTLP 三大信号已激活" \
    "response=\$(api_get '/api/ingestion/otlp/overview' '${login_token}'); \
     jq -e '.code == 0 and .data.metrics.active == true and .data.logs.active == true and .data.traces.active == true and .data.activeSignalCount >= 3' <<<\"\$response\" >/dev/null"

  log_step "验证最近服务和业务链路联动"
  poll_until "OTLP 最近服务已出现 demo 服务名" \
    "response=\$(api_get '/api/ingestion/otlp/bindings' '${login_token}'); \
     jq -e '.code == 0 and ((.data.recentServices // []) | map(select(. == \"frontend\" or . == \"checkout\" or . == \"cart\" or . == \"product-catalog\")) | length) >= 1' <<<\"\$response\" >/dev/null"

  poll_until "日志已出现可关联 trace 的业务数据" \
    "response=\$(api_get '/api/logs/stats/trace-coverage' '${login_token}'); \
     jq -e '.code == 0 and ((.data.traceCoverage.withTrace // 0) > 0) and ((.data.traceCoverage.withBothTraceAndSpan // 0) > 0)' <<<\"\$response\" >/dev/null"

  poll_until "链路列表已出现外部 demo 服务" \
    "response=\$(api_get '/api/traces/list?pageIndex=0&pageSize=5&hideInternal=true' '${login_token}'); \
     jq -e '.code == 0 and ((.data.content // []) | map(select(.serviceName == \"frontend\" or .serviceName == \"checkout\" or .serviceName == \"cart\" or .serviceName == \"product-catalog\" or .serviceName == \"image-provider\" or .serviceName == \"flagd\")) | length) >= 1' <<<\"\$response\" >/dev/null"

  poll_until "指标工作台已解析到 demo 服务上下文" \
    "response=\$(api_get '/api/ingestion/otlp/metrics/console' '${login_token}'); \
     jq -e '.code == 0 and .data.emptyStateReason != \"no_context\" and ((.data.context.serviceName // \"\") | length) > 0 and ((.data.query // \"\") | length) > 0' <<<\"\$response\" >/dev/null"

  cat <<EOF

官方 OpenTelemetry Demo 已接入到 HertzBeat。

体验地址:
  - Demo 商店: http://127.0.0.1:${ENVOY_PORT}
  - HertzBeat OTLP 总览: http://127.0.0.1:4200/ingestion/otlp
  - HertzBeat 日志工作台: http://127.0.0.1:4200/log/manage
  - HertzBeat 链路工作台: http://127.0.0.1:4200/trace/manage
  - HertzBeat 指标工作台: http://127.0.0.1:4200/ingestion/otlp/metrics
EOF
}

trigger_minimal_correlation() {
  if [[ ! -x "${TRIGGER_SCRIPT}" ]]; then
    echo "缺少可执行触发脚本 ${TRIGGER_SCRIPT}" >&2
    exit 1
  fi
  "${TRIGGER_SCRIPT}"
}

verify_minimal_demo() {
  if [[ -z "${login_token}" ]]; then
    login_hertzbeat
  fi

  log_step "触发 recommendation 业务请求"
  trigger_minimal_correlation

  log_step "验证 recommendation 链路数据"
  poll_until "链路列表已出现 recommendation 服务" \
    "response=\$(api_get '/api/traces/list?pageIndex=0&pageSize=10&hideInternal=true&serviceName=recommendation' '${login_token}'); \
     jq -e '.code == 0 and ((.data.content // []) | length) > 0' <<<\"\$response\" >/dev/null"

  poll_until "日志已出现带 traceId 的 recommendation 业务日志" \
    "response=\$(api_get '/api/logs/list?pageIndex=0&pageSize=20&hideInternal=true&hideNoise=true' '${login_token}'); \
     jq -e '.code == 0 and ((.data.content // []) | map(select((.serviceName // .resource[\"service.name\"] // .resource.service_name // \"\") == \"recommendation\" and ((.traceId // \"\") | length) > 0 and ((.spanId // \"\") | length) > 0)) | length) >= 1' <<<\"\$response\" >/dev/null"

  poll_until "日志链路覆盖统计已出现可关联 recommendation 日志" \
    "response=\$(api_get '/api/logs/stats/trace-coverage?hideInternal=true&hideNoise=true' '${login_token}'); \
     jq -e '.code == 0 and ((.data.traceCoverage.withBothTraceAndSpan // 0) > 0)' <<<\"\$response\" >/dev/null"

  cat <<EOF

最小官方 OpenTelemetry Demo 已接入到 HertzBeat。

最小服务集:
  - otel-collector
  - flagd
  - product-catalog
  - recommendation

体验地址:
  - HertzBeat 日志工作台: http://127.0.0.1:4200/log/manage
  - HertzBeat 链路工作台: http://127.0.0.1:4200/trace/manage
EOF
}

cmd_up() {
  require_bin curl
  require_bin jq
  require_bin git
  require_bin docker

  ensure_backend
  ensure_upstream_repo
  local token
  token="$(ensure_api_token)"
  write_env_file "${token}"

  log_step "启动官方 OpenTelemetry Demo"
  stop_demo_projects
  compose up -d
  verify_demo
}

cmd_down() {
  require_bin docker
  ensure_upstream_repo
  compose down --remove-orphans
}

cmd_status() {
  require_bin docker
  ensure_upstream_repo
  compose ps
}

cmd_logs() {
  require_bin docker
  ensure_upstream_repo
  if [[ $# -gt 0 ]]; then
    compose logs -f --tail=200 "$@"
  else
    compose logs -f --tail=200 otel-collector load-generator frontend-proxy
  fi
}

cmd_verify() {
  require_bin curl
  require_bin jq
  verify_demo
}

cmd_up_minimal() {
  require_bin curl
  require_bin jq
  require_bin git
  require_bin docker

  ensure_backend
  ensure_upstream_repo
  local token
  token="$(ensure_api_token)"
  write_env_file "${token}"

  log_step "启动最小官方 OpenTelemetry Demo"
  stop_demo_projects
  # shellcheck disable=SC2086
  compose_minimal up -d ${MINIMAL_SERVICES}
  verify_minimal_demo
}

cmd_down_minimal() {
  require_bin docker
  ensure_upstream_repo
  compose_minimal down --remove-orphans
}

cmd_status_minimal() {
  require_bin docker
  ensure_upstream_repo
  # shellcheck disable=SC2086
  compose_minimal ps ${MINIMAL_SERVICES}
}

cmd_logs_minimal() {
  require_bin docker
  ensure_upstream_repo
  if [[ $# -gt 0 ]]; then
    compose_minimal logs -f --tail=200 "$@"
  else
    # shellcheck disable=SC2086
    compose_minimal logs -f --tail=200 ${MINIMAL_SERVICES}
  fi
}

cmd_verify_minimal() {
  require_bin curl
  require_bin jq
  verify_minimal_demo
}

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    up)
      cmd_up
      ;;
    down)
      cmd_down
      ;;
    status)
      cmd_status
      ;;
    logs)
      shift
      cmd_logs "$@"
      ;;
    verify)
      cmd_verify
      ;;
    up-minimal)
      cmd_up_minimal
      ;;
    down-minimal)
      cmd_down_minimal
      ;;
    status-minimal)
      cmd_status_minimal
      ;;
    logs-minimal)
      shift
      cmd_logs_minimal "$@"
      ;;
    verify-minimal)
      cmd_verify_minimal
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
