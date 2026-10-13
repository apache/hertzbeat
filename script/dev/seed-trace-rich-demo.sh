#!/usr/bin/env bash

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

GREPTIME_USERNAME="${GREPTIME_USERNAME:-greptime}"
GREPTIME_PASSWORD="${GREPTIME_PASSWORD:-greptime}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
TRACE_TABLE_SQL_FILE="${REPOSITORY_ROOT}/hertzbeat-observability/src/main/resources/greptime/tables/hzb_traces.sql"

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

hex_to_base64() {
  HEX_VALUE="$1" python3 - <<'PY'
import base64
import os

print(base64.b64encode(bytes.fromhex(os.environ["HEX_VALUE"])).decode())
PY
}

GREPTIME_HTTP="$(resolve_greptime_http)"
GREPTIME_DB_NAME="${GREPTIME_DB_NAME:-public}"
TRACE_WINDOW_END_MS="${TRACE_WINDOW_END_MS:-$(resolve_now_ms)}"
TRACE_WINDOW_END_MS="$((TRACE_WINDOW_END_MS / 60000 * 60000))"
TRACE_WINDOW_START_MS="${TRACE_WINDOW_START_MS:-$((TRACE_WINDOW_END_MS - 600000))}"
TRACE_ROOT_START_MS="${TRACE_ROOT_START_MS:-$((TRACE_WINDOW_START_MS + 180000))}"
TRACE_ID="${TRACE_ID:-$(TRACE_WINDOW_END_MS="${TRACE_WINDOW_END_MS}" python3 - <<'PY'
import hashlib
import os

print(hashlib.sha256(("trace-ui-rich-demo-" + os.environ["TRACE_WINDOW_END_MS"]).encode()).hexdigest()[:32])
PY
)}"
if [[ ! "${TRACE_ID}" =~ ^[[:xdigit:]]{32}$ ]]; then
  printf 'TRACE_ID must be exactly 32 hexadecimal characters\n' >&2
  exit 1
fi
TRACE_ROUTE="http://127.0.0.1:4200/explore?signal=traces&traceId=${TRACE_ID}&start=${TRACE_WINDOW_START_MS}&end=${TRACE_WINDOW_END_MS}"

ROOT_SPAN_ID="0000000000000001"
AUTH_SPAN_ID="0000000000000002"
DB_SPAN_ID="0000000000000003"
CACHE_SPAN_ID="0000000000000004"
TEMPLATE_SPAN_ID="0000000000000005"
TRACE_ID_BASE64="$(hex_to_base64 "${TRACE_ID}")"
ROOT_SPAN_ID_BASE64="$(hex_to_base64 "${ROOT_SPAN_ID}")"
AUTH_SPAN_ID_BASE64="$(hex_to_base64 "${AUTH_SPAN_ID}")"
DB_SPAN_ID_BASE64="$(hex_to_base64 "${DB_SPAN_ID}")"
CACHE_SPAN_ID_BASE64="$(hex_to_base64 "${CACHE_SPAN_ID}")"
TEMPLATE_SPAN_ID_BASE64="$(hex_to_base64 "${TEMPLATE_SPAN_ID}")"

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

if [[ ! -r "${TRACE_TABLE_SQL_FILE}" ]]; then
  printf 'Trace schema resource is not readable: %s\n' "${TRACE_TABLE_SQL_FILE}" >&2
  exit 1
fi
query_sql_checked "$(<"${TRACE_TABLE_SQL_FILE}")" >/tmp/greptime-trace-rich-demo-create.out

existing_rows="$(query_count "select count(*) as total from hzb_traces where trace_id = '${TRACE_ID}'")"
if [[ "${existing_rows}" != "0" ]]; then
  printf 'trace demo already exists: %s\n' "${TRACE_ID}"
  printf 'open: %s\n' "${TRACE_ROUTE}"
  exit 0
fi

read -r -d '' otlp_payload <<JSON || true
{
  "resourceSpans": [{
    "resource": {"attributes": [
      {"key":"service.name","value":{"stringValue":"checkout-service"}},
      {"key":"service.namespace","value":{"stringValue":"storefront"}},
      {"key":"service.instance.id","value":{"stringValue":"checkout-rich-demo"}},
      {"key":"deployment.environment.name","value":{"stringValue":"dev"}},
      {"key":"hertzbeat.workspace_id","value":{"stringValue":"default"}},
      {"key":"hertzbeat.entity_id","value":{"stringValue":"checkout-service"}},
      {"key":"hertzbeat.entity_type","value":{"stringValue":"service"}},
      {"key":"hertzbeat.collector.id","value":{"stringValue":"local-demo"}},
      {"key":"service.version","value":{"stringValue":"2026.04.01"}}
    ]},
    "scopeSpans": [{
      "scope": {"name":"checkout-rich-demo","version":"1.0.0"},
      "spans": [
        {"traceId":"${TRACE_ID_BASE64}","spanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","name":"GET /checkout","kind":"SPAN_KIND_SERVER","startTimeUnixNano":"${ROOT_START_NS}","endTimeUnixNano":"${ROOT_END_NS}","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}}],"events":[{"timeUnixNano":"${ROOT_EVENT_NS}","name":"request.validated","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}},{"key":"user.segment","value":{"stringValue":"vip"}}]}],"status":{"message":"checkout rendered successfully","code":"STATUS_CODE_OK"}},
        {"traceId":"${TRACE_ID_BASE64}","spanId":"${AUTH_SPAN_ID_BASE64}","parentSpanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","name":"AuthMiddleware","kind":"SPAN_KIND_INTERNAL","startTimeUnixNano":"${AUTH_START_NS}","endTimeUnixNano":"${AUTH_END_NS}","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}},{"key":"auth.strategy","value":{"stringValue":"session"}},{"key":"user.id","value":{"stringValue":"u-2048"}}],"events":[{"timeUnixNano":"${AUTH_EVENT_NS}","name":"auth.user.loaded","attributes":[{"key":"auth.strategy","value":{"stringValue":"session"}},{"key":"user.id","value":{"stringValue":"u-2048"}}]}],"links":[{"traceId":"${TRACE_ID_BASE64}","spanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","attributes":[{"key":"link.kind","value":{"stringValue":"follows-from"}}]}],"status":{"message":"session token verified","code":"STATUS_CODE_OK"}},
        {"traceId":"${TRACE_ID_BASE64}","spanId":"${DB_SPAN_ID_BASE64}","parentSpanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","name":"SELECT cart_items","kind":"SPAN_KIND_CLIENT","startTimeUnixNano":"${DB_START_NS}","endTimeUnixNano":"${DB_END_NS}","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}},{"key":"db.rows","value":{"intValue":"3"}},{"key":"db.system","value":{"stringValue":"mysql"}},{"key":"retry.count","value":{"intValue":"1"}}],"events":[{"timeUnixNano":"${DB_EVENT_PREP_NS}","name":"db.statement.prepared","attributes":[{"key":"db.rows","value":{"intValue":"3"}},{"key":"db.system","value":{"stringValue":"mysql"}}]},{"timeUnixNano":"${DB_EVENT_RETRY_NS}","name":"db.retry.success","attributes":[{"key":"retry.count","value":{"intValue":"1"}}]}],"links":[{"traceId":"${TRACE_ID_BASE64}","spanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","attributes":[{"key":"link.kind","value":{"stringValue":"caused-by"}}]}],"status":{"message":"db timeout recovered","code":"STATUS_CODE_ERROR"}},
        {"traceId":"${TRACE_ID_BASE64}","spanId":"${CACHE_SPAN_ID_BASE64}","parentSpanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","name":"redis GET cart:summary","kind":"SPAN_KIND_CLIENT","startTimeUnixNano":"${CACHE_START_NS}","endTimeUnixNano":"${CACHE_END_NS}","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}},{"key":"cache.key","value":{"stringValue":"cart:summary"}},{"key":"cache.hit","value":{"boolValue":true}}],"events":[{"timeUnixNano":"${CACHE_EVENT_NS}","name":"cache.hit","attributes":[{"key":"cache.key","value":{"stringValue":"cart:summary"}},{"key":"cache.hit","value":{"boolValue":true}}]}],"status":{"message":"cache read completed","code":"STATUS_CODE_OK"}},
        {"traceId":"${TRACE_ID_BASE64}","spanId":"${TEMPLATE_SPAN_ID_BASE64}","parentSpanId":"${ROOT_SPAN_ID_BASE64}","traceState":"vendor=greptime-demo","name":"RenderCheckoutSummary","kind":"SPAN_KIND_INTERNAL","startTimeUnixNano":"${TEMPLATE_START_NS}","endTimeUnixNano":"${TEMPLATE_END_NS}","attributes":[{"key":"http.route","value":{"stringValue":"/checkout"}},{"key":"template.name","value":{"stringValue":"checkout-summary"}}],"events":[{"timeUnixNano":"${TEMPLATE_EVENT_NS}","name":"template.partial.rendered","attributes":[{"key":"template.name","value":{"stringValue":"checkout-summary"}}]}],"status":{"message":"template render finished","code":"STATUS_CODE_OK"}}
      ]
    }]
  }]
}
JSON

otlp_response="$(curl --fail-with-body -sS \
  -H "${AUTH_HEADER}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H "X-Greptime-DB-Name: ${GREPTIME_DB_NAME}" \
  -H 'X-Greptime-Trace-Table-Name: hzb_traces' \
  -H 'X-Greptime-Pipeline-Name: greptime_trace_v1' \
  --data-binary "${otlp_payload}" \
  "${GREPTIME_HTTP}/v1/otlp/v1/traces")"
OTLP_RESPONSE_JSON="${otlp_response}" python3 - <<'PY'
import json
import os

body = json.loads(os.environ["OTLP_RESPONSE_JSON"] or "{}")
partial = body.get("partialSuccess") or {}
if int(partial.get("rejectedSpans", 0)) != 0:
    raise SystemExit("Greptime rejected trace spans: " + json.dumps(body))
PY

printf '%s\n' "${otlp_response}" >/tmp/greptime-trace-rich-demo-otlp.out
printf 'seeded trace demo: %s\n' "${TRACE_ID}"
printf 'open: %s\n' "${TRACE_ROUTE}"
