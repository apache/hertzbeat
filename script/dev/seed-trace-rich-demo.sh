#!/usr/bin/env bash

set -euo pipefail

GREPTIME_USERNAME="${GREPTIME_USERNAME:-greptime}"
GREPTIME_PASSWORD="${GREPTIME_PASSWORD:-greptime}"

resolve_greptime_http() {
  if [[ -n "${GREPTIME_HTTP:-}" ]]; then
    printf '%s\n' "${GREPTIME_HTTP}"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    local mapping mapped_port
    mapping="$(docker port compose-greptimedb 4000/tcp 2>/dev/null | head -n 1 || true)"
    mapped_port="${mapping##*:}"
    if [[ -n "${mapped_port}" && "${mapped_port}" != "${mapping}" ]]; then
      printf 'http://127.0.0.1:%s\n' "${mapped_port}"
      return
    fi
  fi

  printf '%s\n' 'http://127.0.0.1:4000'
}

resolve_now_ms() {
  python3 - <<'PY'
import time

print(int(time.time() * 1000))
PY
}

to_ns() {
  printf '%s\n' "$(( $1 * 1000000 ))"
}

GREPTIME_HTTP="$(resolve_greptime_http)"
GREPTIME_DB_NAME="${GREPTIME_DB_NAME:-public}"
TRACE_WINDOW_END_MS="${TRACE_WINDOW_END_MS:-$(resolve_now_ms)}"
TRACE_WINDOW_END_MS="$((TRACE_WINDOW_END_MS / 60000 * 60000))"
TRACE_WINDOW_START_MS="${TRACE_WINDOW_START_MS:-$((TRACE_WINDOW_END_MS - 600000))}"
TRACE_ROOT_START_MS="${TRACE_ROOT_START_MS:-$((TRACE_WINDOW_START_MS + 180000))}"
TRACE_ID="${TRACE_ID:-trace-ui-rich-demo-${TRACE_WINDOW_END_MS}}"
TRACE_ROUTE="http://127.0.0.1:4200/trace/manage?traceId=${TRACE_ID}&start=${TRACE_WINDOW_START_MS}&end=${TRACE_WINDOW_END_MS}"

ROOT_START_NS="$(to_ns "${TRACE_ROOT_START_MS}")"
ROOT_END_NS="$(to_ns "$((TRACE_ROOT_START_MS + 120))")"
ROOT_EVENT_NS="$(to_ns "$((TRACE_ROOT_START_MS + 15))")"
AUTH_START_NS="$(to_ns "$((TRACE_ROOT_START_MS + 10))")"
AUTH_END_NS="$(to_ns "$((TRACE_ROOT_START_MS + 35))")"
AUTH_EVENT_NS="$(to_ns "$((TRACE_ROOT_START_MS + 20))")"
DB_START_NS="$(to_ns "$((TRACE_ROOT_START_MS + 40))")"
DB_END_NS="$(to_ns "$((TRACE_ROOT_START_MS + 95))")"
DB_EVENT_PREP_NS="$(to_ns "$((TRACE_ROOT_START_MS + 65))")"
DB_EVENT_RETRY_NS="$(to_ns "$((TRACE_ROOT_START_MS + 85))")"
CACHE_START_NS="$(to_ns "$((TRACE_ROOT_START_MS + 100))")"
CACHE_END_NS="$(to_ns "$((TRACE_ROOT_START_MS + 112))")"
CACHE_EVENT_NS="$(to_ns "$((TRACE_ROOT_START_MS + 106))")"
TEMPLATE_START_NS="$(to_ns "$((TRACE_ROOT_START_MS + 112))")"
TEMPLATE_END_NS="$(to_ns "$((TRACE_ROOT_START_MS + 118))")"
TEMPLATE_EVENT_NS="$(to_ns "$((TRACE_ROOT_START_MS + 115))")"

AUTH_HEADER="$(
  GREPTIME_USERNAME="${GREPTIME_USERNAME}" GREPTIME_PASSWORD="${GREPTIME_PASSWORD}" python3 - <<'PY'
import base64
import os

username = os.environ["GREPTIME_USERNAME"]
password = os.environ["GREPTIME_PASSWORD"]
print("Authorization: Basic " + base64.b64encode(f"{username}:{password}".encode()).decode())
PY
)"

query_sql() {
  local sql="$1"
  curl -s \
    -H "${AUTH_HEADER}" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "sql=${sql}" \
    "${GREPTIME_HTTP}/v1/sql?db=${GREPTIME_DB_NAME}"
}

query_sql_checked() {
  local sql="$1"
  local response
  response="$(query_sql "${sql}")"

  if ! RESPONSE_JSON="${response}" python3 - <<'PY'
import json
import os
import sys

body = json.loads(os.environ["RESPONSE_JSON"])
error = body.get("error")
code = body.get("code")

if error or (isinstance(code, int) and code != 0):
    raise SystemExit(1)
PY
  then
    printf 'Greptime SQL failed: %s\n' "${response}" >&2
    exit 1
  fi

  printf '%s\n' "${response}"
}

query_count() {
  local sql="$1"
  local response
  response="$(query_sql_checked "${sql}")"
  RESPONSE_JSON="${response}" python3 - <<'PY'
import json
import os

body = json.loads(os.environ["RESPONSE_JSON"])
rows = (((body.get("output") or [{}])[0].get("records") or {}).get("rows") or [])
if not rows or not rows[0]:
    print("0")
else:
    print(rows[0][0])
PY
}

read -r -d '' create_table_sql <<'SQL' || true
CREATE TABLE IF NOT EXISTS "hzb_traces" (
  "timestamp" TIMESTAMP(9) NOT NULL,
  "timestamp_end" TIMESTAMP(9) NULL,
  "duration_nano" BIGINT UNSIGNED NULL,
  "trace_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "span_id" STRING NULL,
  "parent_span_id" STRING NULL,
  "span_kind" STRING NULL,
  "span_name" STRING NULL,
  "span_status_code" STRING NULL,
  "span_status_message" STRING NULL,
  "trace_state" STRING NULL,
  "scope_name" STRING NULL,
  "scope_version" STRING NULL,
  "service_name" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "resource_attributes" JSON NULL,
  "span_attributes" JSON NULL,
  "span_events" JSON NULL,
  "span_links" JSON NULL,
  TIME INDEX ("timestamp"),
  PRIMARY KEY ("service_name")
)
ENGINE=mito
WITH(
  append_mode = 'true',
  table_data_model = 'greptime_trace_v1'
)
SQL

query_sql_checked "${create_table_sql}" >/tmp/greptime-trace-rich-demo-create.out

existing_rows="$(query_count "select count(*) as total from hzb_traces where trace_id = '${TRACE_ID}'")"
if [[ "${existing_rows}" != "0" ]]; then
  printf 'trace demo already exists: %s\n' "${TRACE_ID}"
  printf 'open: %s\n' "${TRACE_ROUTE}"
  exit 0
fi

RESOURCE_ATTRIBUTES_JSON='{"service.name":"checkout-service","service.namespace":"storefront","deployment.environment.name":"dev","service.version":"2026.04.01"}'
ROOT_SPAN_ATTRIBUTES_JSON='{"http.route":"/checkout"}'
AUTH_SPAN_ATTRIBUTES_JSON='{"http.route":"/checkout","auth.strategy":"session","user.id":"u-2048"}'
DB_SPAN_ATTRIBUTES_JSON='{"http.route":"/checkout","db.rows":3,"db.system":"mysql","retry.count":1}'
CACHE_SPAN_ATTRIBUTES_JSON='{"http.route":"/checkout","cache.key":"cart:summary","cache.hit":true}'
TEMPLATE_SPAN_ATTRIBUTES_JSON='{"http.route":"/checkout","template.name":"checkout-summary"}'

ROOT_SPAN_EVENTS_JSON='[{"time_unix_nano":'"${ROOT_EVENT_NS}"',"name":"request.validated","attributes":{"http.route":"/checkout","user.segment":"vip"},"dropped_attributes_count":0}]'
AUTH_SPAN_EVENTS_JSON='[{"time_unix_nano":'"${AUTH_EVENT_NS}"',"name":"auth.user.loaded","attributes":{"auth.strategy":"session","user.id":"u-2048"},"dropped_attributes_count":0}]'
DB_SPAN_EVENTS_JSON='[{"time_unix_nano":'"${DB_EVENT_PREP_NS}"',"name":"db.statement.prepared","attributes":{"db.rows":3,"db.system":"mysql"},"dropped_attributes_count":0},{"time_unix_nano":'"${DB_EVENT_RETRY_NS}"',"name":"db.retry.success","attributes":{"retry.count":1},"dropped_attributes_count":0}]'
CACHE_SPAN_EVENTS_JSON='[{"time_unix_nano":'"${CACHE_EVENT_NS}"',"name":"cache.hit","attributes":{"cache.key":"cart:summary","cache.hit":true},"dropped_attributes_count":0}]'
TEMPLATE_SPAN_EVENTS_JSON='[{"time_unix_nano":'"${TEMPLATE_EVENT_NS}"',"name":"template.partial.rendered","attributes":{"template.name":"checkout-summary"},"dropped_attributes_count":0}]'

AUTH_SPAN_LINKS_JSON='[{"trace_id":"'"${TRACE_ID}"'","span_id":"span-root-rich","trace_state":"vendor=greptime-demo","attributes":{"link.kind":"follows-from"},"dropped_attributes_count":0}]'
DB_SPAN_LINKS_JSON='[{"trace_id":"'"${TRACE_ID}"'","span_id":"span-root-rich","trace_state":"vendor=greptime-demo","attributes":{"link.kind":"caused-by"},"dropped_attributes_count":0}]'

read -r -d '' insert_sql <<SQL || true
INSERT INTO hzb_traces (
  timestamp,
  timestamp_end,
  duration_nano,
  trace_id,
  span_id,
  parent_span_id,
  span_kind,
  span_name,
  span_status_code,
  span_status_message,
  trace_state,
  scope_name,
  scope_version,
  service_name,
  resource_attributes,
  span_attributes,
  span_events,
  span_links
) VALUES
  (${ROOT_START_NS}, ${ROOT_END_NS}, 120000000, '${TRACE_ID}', 'span-root-rich', NULL, 'SPAN_KIND_SERVER', 'GET /checkout', 'STATUS_CODE_OK', 'checkout rendered successfully', 'vendor=greptime-demo', 'checkout-api', '1.0.0', 'checkout-service', '${RESOURCE_ATTRIBUTES_JSON}', '${ROOT_SPAN_ATTRIBUTES_JSON}', '${ROOT_SPAN_EVENTS_JSON}', '[]'),
  (${AUTH_START_NS}, ${AUTH_END_NS}, 25000000, '${TRACE_ID}', 'span-auth-rich', 'span-root-rich', 'SPAN_KIND_INTERNAL', 'AuthMiddleware', 'STATUS_CODE_OK', 'session token verified', 'vendor=greptime-demo', 'checkout-auth', '1.0.0', 'checkout-service', '${RESOURCE_ATTRIBUTES_JSON}', '${AUTH_SPAN_ATTRIBUTES_JSON}', '${AUTH_SPAN_EVENTS_JSON}', '${AUTH_SPAN_LINKS_JSON}'),
  (${DB_START_NS}, ${DB_END_NS}, 55000000, '${TRACE_ID}', 'span-db-rich', 'span-root-rich', 'SPAN_KIND_CLIENT', 'SELECT cart_items', 'STATUS_CODE_ERROR', 'db timeout recovered', 'vendor=greptime-demo', 'checkout-db-instrumentation', '1.0.0', 'checkout-service', '${RESOURCE_ATTRIBUTES_JSON}', '${DB_SPAN_ATTRIBUTES_JSON}', '${DB_SPAN_EVENTS_JSON}', '${DB_SPAN_LINKS_JSON}'),
  (${CACHE_START_NS}, ${CACHE_END_NS}, 12000000, '${TRACE_ID}', 'span-cache-rich', 'span-root-rich', 'SPAN_KIND_CLIENT', 'redis GET cart:summary', 'STATUS_CODE_OK', 'cache read completed', 'vendor=greptime-demo', 'checkout-cache', '1.0.0', 'checkout-service', '${RESOURCE_ATTRIBUTES_JSON}', '${CACHE_SPAN_ATTRIBUTES_JSON}', '${CACHE_SPAN_EVENTS_JSON}', '[]'),
  (${TEMPLATE_START_NS}, ${TEMPLATE_END_NS}, 6000000, '${TRACE_ID}', 'span-template-rich', 'span-root-rich', 'SPAN_KIND_INTERNAL', 'RenderCheckoutSummary', 'STATUS_CODE_OK', 'template render finished', 'vendor=greptime-demo', 'checkout-renderer', '1.0.0', 'checkout-service', '${RESOURCE_ATTRIBUTES_JSON}', '${TEMPLATE_SPAN_ATTRIBUTES_JSON}', '${TEMPLATE_SPAN_EVENTS_JSON}', '[]');
SQL

query_sql_checked "${insert_sql}" >/tmp/greptime-trace-rich-demo.out
printf 'seeded trace demo: %s\n' "${TRACE_ID}"
printf 'open: %s\n' "${TRACE_ROUTE}"
