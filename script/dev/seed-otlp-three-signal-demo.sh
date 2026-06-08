#!/usr/bin/env bash

set -euo pipefail

HERTZBEAT_BASE="${HERTZBEAT_BASE:-http://127.0.0.1:1157}"
HERTZBEAT_USER="${HERTZBEAT_USER:-admin}"
HERTZBEAT_PASSWORD="${HERTZBEAT_PASSWORD:-hertzbeat}"
FRONTEND_BASE="${FRONTEND_BASE:-http://127.0.0.1:4200}"

SERVICE_NAME="${SERVICE_NAME:-checkout}"
SERVICE_NAMESPACE="${SERVICE_NAMESPACE:-hertzbeat-demo}"
SERVICE_VERSION="${SERVICE_VERSION:-1.2.3}"
DEPLOYMENT_ENVIRONMENT="${DEPLOYMENT_ENVIRONMENT:-demo}"
HOST_NAME="${HOST_NAME:-checkout-node-a}"
K8S_NAMESPACE_NAME="${K8S_NAMESPACE_NAME:-payments}"
K8S_POD_NAME="${K8S_POD_NAME:-checkout-v1-78dfd}"
CONTAINER_NAME="${CONTAINER_NAME:-checkout}"
HERTZBEAT_ENTITY_ID="${HERTZBEAT_ENTITY_ID:-4200}"
HERTZBEAT_ENTITY_TYPE="${HERTZBEAT_ENTITY_TYPE:-service}"
HERTZBEAT_ENTITY_NAME="${HERTZBEAT_ENTITY_NAME:-Checkout API}"
HOST_ENTITY_ID="${HOST_ENTITY_ID:-4201}"
HOST_ENTITY_NAME="${HOST_ENTITY_NAME:-Checkout Node A}"
K8S_ENTITY_ID="${K8S_ENTITY_ID:-4202}"
K8S_ENTITY_NAME="${K8S_ENTITY_NAME:-Checkout Pod}"
HERTZBEAT_WORKSPACE_ID="${HERTZBEAT_WORKSPACE_ID:-default}"
HERTZBEAT_COLLECTOR="${HERTZBEAT_COLLECTOR:-collector-demo-a}"
HERTZBEAT_TEMPLATE="${HERTZBEAT_TEMPLATE:-spring-boot}"
TRACE_ID="${TRACE_ID:-$(python3 - <<'PY'
import secrets

print(secrets.token_hex(16))
PY
)}"
ROOT_SPAN_ID="${ROOT_SPAN_ID:-1111222233334444}"
CART_SPAN_ID="${CART_SPAN_ID:-5555666677778888}"
PAYMENT_SPAN_ID="${PAYMENT_SPAN_ID:-9999aaaabbbbcccc}"
TEMPLATE_SPAN_ID="${TEMPLATE_SPAN_ID:-ddddeeeeffff0000}"

DRY_RUN=false
ENSURE_ENTITY=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run)
      DRY_RUN=true
      ;;
    --ensure-entity)
      ENSURE_ENTITY=true
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

require_command curl
require_command python3

validate_otlp_ids() {
  if [[ ! "${TRACE_ID}" =~ ^[0-9a-fA-F]{32}$ ]]; then
    printf 'TRACE_ID must be a 32-character hex OTLP trace id: %s\n' "${TRACE_ID}" >&2
    exit 1
  fi
  for span_name in ROOT_SPAN_ID CART_SPAN_ID PAYMENT_SPAN_ID TEMPLATE_SPAN_ID; do
    local span_value="${!span_name}"
    if [[ ! "${span_value}" =~ ^[0-9a-fA-F]{16}$ ]]; then
      printf '%s must be a 16-character hex OTLP span id: %s\n' "${span_name}" "${span_value}" >&2
      exit 1
    fi
  done
}

validate_otlp_ids

url_encode() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

now_ns() {
  python3 - <<'PY'
import time

print(int(time.time() * 1_000_000_000))
PY
}

login_token() {
  curl -sS \
    -H 'Content-Type: application/json' \
    --data '{"type":0,"identifier":"'"${HERTZBEAT_USER}"'","credential":"'"${HERTZBEAT_PASSWORD}"'"}' \
    "${HERTZBEAT_BASE}/api/account/auth/form" \
    | python3 -c '
import json
import sys

body = json.load(sys.stdin)
token = ((body.get("data") or {}).get("token"))
if body.get("code") != 0 or not token:
    raise SystemExit("login failed: " + json.dumps(body, ensure_ascii=False))
print(token)
'
}

build_payload() {
  local signal="$1"
  local timestamp_ns="$2"
  python3 - \
    "${signal}" \
    "${timestamp_ns}" \
    "${TRACE_ID}" \
    "${ROOT_SPAN_ID}" \
    "${CART_SPAN_ID}" \
    "${PAYMENT_SPAN_ID}" \
    "${TEMPLATE_SPAN_ID}" \
    "${SERVICE_NAME}" \
    "${SERVICE_NAMESPACE}" \
    "${SERVICE_VERSION}" \
    "${DEPLOYMENT_ENVIRONMENT}" \
    "${HOST_NAME}" \
    "${K8S_NAMESPACE_NAME}" \
    "${K8S_POD_NAME}" \
    "${CONTAINER_NAME}" \
    "${HERTZBEAT_ENTITY_ID}" \
    "${HERTZBEAT_ENTITY_TYPE}" \
    "${HERTZBEAT_ENTITY_NAME}" \
    "${HERTZBEAT_WORKSPACE_ID}" \
    "${HERTZBEAT_COLLECTOR}" \
    "${HERTZBEAT_TEMPLATE}" <<'PY'
import json
import sys

signal = sys.argv[1]
now = int(sys.argv[2])
trace_id = sys.argv[3]
root_span = sys.argv[4]
cart_span = sys.argv[5]
payment_span = sys.argv[6]
template_span = sys.argv[7]
service_name = sys.argv[8]
service_namespace = sys.argv[9]
service_version = sys.argv[10]
environment = sys.argv[11]
host_name = sys.argv[12]
k8s_namespace = sys.argv[13]
k8s_pod = sys.argv[14]
container_name = sys.argv[15]
entity_id = sys.argv[16]
entity_type = sys.argv[17]
entity_name = sys.argv[18]
workspace_id = sys.argv[19]
collector = sys.argv[20]
template = sys.argv[21]

def value(item):
    if isinstance(item, bool):
        return {"boolValue": item}
    if isinstance(item, int):
        return {"intValue": str(item)}
    if isinstance(item, float):
        return {"doubleValue": item}
    return {"stringValue": str(item)}

def kv(key, item):
    return {"key": key, "value": value(item)}

resource_attrs = [
    kv("service.name", service_name),
    kv("service.namespace", service_namespace),
    kv("service.version", service_version),
    kv("deployment.environment.name", environment),
    kv("host.name", host_name),
    kv("k8s.namespace.name", k8s_namespace),
    kv("k8s.pod.name", k8s_pod),
    kv("container.name", container_name),
    kv("hertzbeat.entity_id", entity_id),
    kv("hertzbeat.entity_type", entity_type),
    kv("hertzbeat.entity_name", entity_name),
    kv("hertzbeat.workspace_id", workspace_id),
    kv("hertzbeat.collector", collector),
    kv("hertzbeat.template", template),
]

def span(span_id, parent_id, name, kind, start_offset_ms, end_offset_ms, attrs, events, status):
    payload = {
        "traceId": trace_id,
        "spanId": span_id,
        "name": name,
        "kind": kind,
        "startTimeUnixNano": str(now + start_offset_ms * 1_000_000),
        "endTimeUnixNano": str(now + end_offset_ms * 1_000_000),
        "attributes": [kv(key, item) for key, item in attrs.items()],
        "events": [
            {
                "timeUnixNano": str(now + event_offset_ms * 1_000_000),
                "name": event_name,
                "attributes": [kv(key, item) for key, item in event_attrs.items()],
            }
            for event_offset_ms, event_name, event_attrs in events
        ],
        "status": status,
    }
    if parent_id:
        payload["parentSpanId"] = parent_id
    return payload

if signal == "traces":
    payload = {
        "resourceSpans": [{
            "resource": {"attributes": resource_attrs},
            "scopeSpans": [{
                "scope": {"name": "hertzbeat-demo", "version": "1.0.0"},
                "spans": [
                    span(root_span, None, "POST /checkout", 2, -900, -90,
                         {"http.route": "/checkout", "http.status_code": 200},
                         [(-760, "cart.validated", {"cart.items": 3}),
                          (-270, "payment.authorized", {"payment.provider": "demo-pay"})],
                         {"code": 1}),
                    span(cart_span, root_span, "SELECT cart_items", 3, -710, -240,
                         {"db.system": "postgresql", "db.rows": 3, "retry.count": 1},
                         [(-520, "db.statement.prepared", {"db.rows": 3}),
                          (-360, "db.retry.success", {"retry.count": 1})],
                         {"code": 2, "message": "slow query recovered"}),
                    span(payment_span, root_span, "POST /payment/authorize", 3, -330, -180,
                         {"http.route": "/payment/authorize", "http.status_code": 200},
                         [(-260, "payment.provider.accepted", {"payment.provider": "demo-pay"})],
                         {"code": 1}),
                    span(template_span, root_span, "RenderCheckoutSummary", 1, -170, -100,
                         {"template.name": "checkout-summary"},
                         [(-130, "template.partial.rendered", {"template.name": "checkout-summary"})],
                         {"code": 1}),
                ],
            }],
        }]
    }
elif signal == "metrics":
    latency_points = []
    rpc_duration_points = []
    request_points = []
    error_points = []
    for index, item in enumerate([(92.0, 14, 0), (118.0, 18, 0), (87.0, 21, 0), (145.0, 26, 1), (103.0, 32, 1)]):
        offset_ns = (index - 4) * 30_000_000_000
        point_time = now + offset_ns
        latency, requests, errors = item
        common_attrs = [
            kv("service.name", service_name),
            kv("service.namespace", service_namespace),
            kv("service.version", service_version),
            kv("deployment.environment.name", environment),
            kv("host.name", host_name),
            kv("k8s.namespace.name", k8s_namespace),
            kv("k8s.pod.name", k8s_pod),
            kv("container.name", container_name),
            kv("http.route", "/checkout"),
            kv("trace_id", trace_id),
            kv("span_id", root_span),
            kv("hertzbeat.entity_id", entity_id),
            kv("hertzbeat.entity_type", entity_type),
            kv("hertzbeat.entity_name", entity_name),
            kv("hertzbeat.workspace_id", workspace_id),
            kv("hertzbeat.collector", collector),
            kv("hertzbeat.template", template),
        ]
        rpc_attrs = common_attrs + [
            kv("rpc.system", "http"),
            kv("rpc.service", service_name),
            kv("rpc.method", "checkout"),
        ]
        latency_points.append({"timeUnixNano": str(point_time), "asDouble": latency, "attributes": common_attrs})
        rpc_duration_points.append({"timeUnixNano": str(point_time), "asDouble": latency, "attributes": rpc_attrs})
        request_points.append({"timeUnixNano": str(point_time), "asInt": str(requests), "attributes": common_attrs})
        error_points.append({"timeUnixNano": str(point_time), "asInt": str(errors), "attributes": common_attrs})
    payload = {
        "resourceMetrics": [{
            "resource": {"attributes": resource_attrs},
            "scopeMetrics": [{
                "scope": {"name": "hertzbeat-demo", "version": "1.0.0"},
                "metrics": [
                    {
                        "name": "hertzbeat_demo_checkout_latency_ms",
                        "unit": "ms",
                        "gauge": {"dataPoints": latency_points},
                    },
                    {
                        "name": "rpc_server_duration",
                        "unit": "ms",
                        "gauge": {"dataPoints": rpc_duration_points},
                    },
                    {
                        "name": "hertzbeat_demo_checkout_requests",
                        "unit": "1",
                        "gauge": {"dataPoints": request_points},
                    },
                    {
                        "name": "hertzbeat_demo_checkout_errors",
                        "unit": "1",
                        "gauge": {"dataPoints": error_points},
                    },
                ],
            }],
        }]
    }
elif signal == "logs":
    records = [
        (-820, 9, "INFO", "checkout request accepted", root_span,
         {"hertzbeat.event_id": "demo-checkout-accepted", "log.record.uid": "demo-log-1", "http.route": "/checkout",
          "hertzbeat.workspace_id": workspace_id, "hertzbeat.collector": collector, "hertzbeat.template": template}),
        (-430, 13, "WARN", "cart query retried once", cart_span,
         {"hertzbeat.event_id": "demo-cart-query-retry", "log.record.uid": "demo-log-2", "db.system": "postgresql",
          "hertzbeat.workspace_id": workspace_id, "hertzbeat.collector": collector, "hertzbeat.template": template}),
        (-300, 17, "ERROR", "cart query slow but recovered", cart_span,
         {"hertzbeat.event_id": "demo-cart-query-recovered", "log.record.uid": "demo-log-3", "retry.count": 1,
          "hertzbeat.workspace_id": workspace_id, "hertzbeat.collector": collector, "hertzbeat.template": template}),
        (-160, 9, "INFO", "checkout response rendered", template_span,
         {"hertzbeat.event_id": "demo-checkout-rendered", "log.record.uid": "demo-log-4", "template.name": "checkout-summary",
          "hertzbeat.workspace_id": workspace_id, "hertzbeat.collector": collector, "hertzbeat.template": template}),
    ]
    payload = {
        "resourceLogs": [{
            "resource": {"attributes": resource_attrs},
            "scopeLogs": [{
                "scope": {"name": "hertzbeat-demo", "version": "1.0.0"},
                "logRecords": [
                    {
                        "timeUnixNano": str(now + offset_ms * 1_000_000),
                        "observedTimeUnixNano": str(now + (offset_ms + 10) * 1_000_000),
                        "severityNumber": severity_number,
                        "severityText": severity_text,
                        "body": {"stringValue": body},
                        "traceId": trace_id,
                        "spanId": span_id,
                        "attributes": [kv(key, item) for key, item in attrs.items()],
                    }
                    for offset_ms, severity_number, severity_text, body, span_id, attrs in records
                ],
            }],
        }]
    }
else:
    raise SystemExit(f"unsupported signal: {signal}")

print(json.dumps(payload, separators=(",", ":")))
PY
}

build_entity_payload() {
  local entity_kind="${1:-service}"
  python3 - \
    "${entity_kind}" \
    "${HERTZBEAT_ENTITY_ID}" \
    "${SERVICE_NAME}" \
    "${HERTZBEAT_ENTITY_NAME}" \
    "${HOST_ENTITY_ID}" \
    "${HOST_ENTITY_NAME}" \
    "${K8S_ENTITY_ID}" \
    "${K8S_ENTITY_NAME}" \
    "${SERVICE_NAMESPACE}" \
    "${DEPLOYMENT_ENVIRONMENT}" \
    "${HERTZBEAT_WORKSPACE_ID}" \
    "${SERVICE_VERSION}" \
    "${HOST_NAME}" \
    "${K8S_NAMESPACE_NAME}" \
    "${K8S_POD_NAME}" \
    "${CONTAINER_NAME}" <<'PY'
import json
import sys

entity_kind = sys.argv[1]
service_entity_id = sys.argv[2]
service_name = sys.argv[3]
service_entity_name = sys.argv[4]
host_entity_id = sys.argv[5]
host_entity_name = sys.argv[6]
k8s_entity_id = sys.argv[7]
k8s_entity_name = sys.argv[8]
service_namespace = sys.argv[9]
environment = sys.argv[10]
workspace_id = sys.argv[11]
service_version = sys.argv[12]
host_name = sys.argv[13]
k8s_namespace = sys.argv[14]
k8s_pod = sys.argv[15]
container_name = sys.argv[16]

for name, value in {
    "HERTZBEAT_ENTITY_ID": service_entity_id,
    "HOST_ENTITY_ID": host_entity_id,
    "K8S_ENTITY_ID": k8s_entity_id,
}.items():
    if not value.isdigit():
        raise SystemExit(f"{name} must be numeric for /api/entities: {value}")

def identity(key, value, primary=False):
    return {
        "identityType": "otel_resource",
        "identityKey": key,
        "identityValue": value,
        "primaryIdentity": primary,
    }

service_payload = {
    "entity": {
        "id": int(service_entity_id),
        "type": "service",
        "name": service_name,
        "displayName": service_entity_name,
        "namespace": service_namespace,
        "environment": environment,
        "status": "unknown",
        "source": "manual",
        "workspaceId": workspace_id,
        "labels": {
            "service.name": service_name,
            "service.namespace": service_namespace,
            "deployment.environment.name": environment,
            "service.version": service_version,
            "host.name": host_name,
            "k8s.namespace.name": k8s_namespace,
            "k8s.pod.name": k8s_pod,
            "container.name": container_name,
        },
        "tags": [
            f"service:{service_name}",
            f"namespace:{service_namespace}",
            f"environment:{environment}",
        ],
    },
    "identities": [
        {
            "identityType": "otel_resource",
            "identityKey": "service.name",
            "identityValue": service_name,
            "primaryIdentity": True,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "service.namespace",
            "identityValue": service_namespace,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "deployment.environment.name",
            "identityValue": environment,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "service.version",
            "identityValue": service_version,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "host.name",
            "identityValue": host_name,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "k8s.namespace.name",
            "identityValue": k8s_namespace,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "k8s.pod.name",
            "identityValue": k8s_pod,
            "primaryIdentity": False,
        },
        {
            "identityType": "otel_resource",
            "identityKey": "container.name",
            "identityValue": container_name,
            "primaryIdentity": False,
        },
    ],
    "monitorBinds": [],
    "relations": [
        {
            "sourceEntityId": int(service_entity_id),
            "targetEntityId": int(host_entity_id),
            "targetRef": f"host:{host_name}",
            "relationType": "runs_on",
            "relationSource": "otel_resource",
            "status": "confirmed",
            "score": 95,
            "description": f"{service_name} runs on {host_name}",
            "attributes": {"resourceKey": "host.name", "resourceValue": host_name},
        },
        {
            "sourceEntityId": int(service_entity_id),
            "targetEntityId": int(k8s_entity_id),
            "targetRef": f"k8s_workload:{k8s_namespace}/{k8s_pod}",
            "relationType": "deployed_on",
            "relationSource": "otel_resource",
            "status": "confirmed",
            "score": 95,
            "description": f"{service_name} is observed in pod {k8s_pod}",
            "attributes": {"resourceKey": "k8s.pod.name", "resourceValue": k8s_pod},
        },
    ],
}

host_payload = {
    "entity": {
        "id": int(host_entity_id),
        "type": "host",
        "name": host_name,
        "displayName": host_entity_name,
        "environment": environment,
        "status": "unknown",
        "source": "manual",
        "workspaceId": workspace_id,
        "labels": {
            "host.name": host_name,
            "deployment.environment.name": environment,
        },
        "tags": [f"host:{host_name}", f"environment:{environment}"],
    },
    "identities": [
        identity("host.name", host_name, True),
        identity("deployment.environment.name", environment),
    ],
    "monitorBinds": [],
    "relations": [],
}

k8s_payload = {
    "entity": {
        "id": int(k8s_entity_id),
        "type": "k8s_workload",
        "name": k8s_pod,
        "displayName": k8s_entity_name,
        "namespace": k8s_namespace,
        "environment": environment,
        "status": "unknown",
        "source": "manual",
        "workspaceId": workspace_id,
        "labels": {
            "k8s.namespace.name": k8s_namespace,
            "k8s.pod.name": k8s_pod,
            "container.name": container_name,
            "deployment.environment.name": environment,
        },
        "tags": [f"k8s-namespace:{k8s_namespace}", f"pod:{k8s_pod}", f"container:{container_name}"],
    },
    "identities": [
        identity("k8s.pod.name", k8s_pod, True),
        identity("k8s.namespace.name", k8s_namespace),
        identity("container.name", container_name),
        identity("deployment.environment.name", environment),
    ],
    "monitorBinds": [],
    "relations": [],
}

payloads = {
    "service": service_payload,
    "host": host_payload,
    "k8s": k8s_payload,
}
if entity_kind not in payloads:
    raise SystemExit(f"unsupported entity payload kind: {entity_kind}")
print(json.dumps(payloads[entity_kind], separators=(",", ":")))
PY
}

message_success() {
  local response_file="$1"
  python3 - "${response_file}" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    body = json.load(handle)
print("true" if body.get("code") == 0 else "false")
PY
}

post_signal() {
  local signal="$1"
  local token="$2"
  local payload="$3"
  local response_file
  local status_code
  response_file="$(mktemp)"
  status_code="$(
    printf '%s' "${payload}" | curl -sS \
      -o "${response_file}" \
      -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      --data-binary @- \
      "${HERTZBEAT_BASE}/api/otlp/v1/${signal}"
  )"
  if [[ "${status_code}" != 2* ]]; then
    printf 'seed %s failed with HTTP %s\n' "${signal}" "${status_code}" >&2
    cat "${response_file}" >&2
    rm -f "${response_file}"
    exit 1
  fi
  rm -f "${response_file}"
  printf 'seeded %s via %s/api/otlp/v1/%s\n' "${signal}" "${HERTZBEAT_BASE}" "${signal}"
}

ensure_entity() {
  local token="$1"
  local entity_kind="${2:-service}"
  local entity_id="${3:-${HERTZBEAT_ENTITY_ID}}"
  local payload
  local lookup_file
  local lookup_status
  local exists
  local method
  local response_file
  local status_code
  local success
  payload="$(build_entity_payload "${entity_kind}")"
  lookup_file="$(mktemp)"
  lookup_status="$(
    curl -sS \
      -o "${lookup_file}" \
      -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H 'Accept: application/json' \
      "${HERTZBEAT_BASE}/api/entities/${entity_id}"
  )"
  if [[ "${lookup_status}" != 2* ]]; then
    printf 'entity lookup failed with HTTP %s\n' "${lookup_status}" >&2
    cat "${lookup_file}" >&2
    rm -f "${lookup_file}"
    exit 1
  fi
  exists="$(
    python3 - "${lookup_file}" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    body = json.load(handle)
print("true" if body.get("code") == 0 and body.get("data") else "false")
PY
  )"
  rm -f "${lookup_file}"
  if [[ "${exists}" == "true" ]]; then
    method="PUT"
  else
    method="POST"
  fi
  response_file="$(mktemp)"
  status_code="$(
    printf '%s' "${payload}" | curl -sS \
      -X "${method}" \
      -o "${response_file}" \
      -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      --data-binary @- \
      "${HERTZBEAT_BASE}/api/entities"
  )"
  if [[ "${status_code}" != 2* ]]; then
    printf 'entity %s failed with HTTP %s\n' "${method}" "${status_code}" >&2
    cat "${response_file}" >&2
    rm -f "${response_file}"
    exit 1
  fi
  success="$(message_success "${response_file}")"
  if [[ "${success}" != "true" ]]; then
    printf 'entity %s failed with response:\n' "${method}" >&2
    cat "${response_file}" >&2
    rm -f "${response_file}"
    exit 1
  fi
  rm -f "${response_file}"
  printf 'ensured %s entity %s via %s /api/entities\n' "${entity_kind}" "${entity_id}" "${method}"
}

trace_id_q="$(url_encode "${TRACE_ID}")"
root_span_id_q="$(url_encode "${ROOT_SPAN_ID}")"
service_name_q="$(url_encode "${SERVICE_NAME}")"
service_namespace_q="$(url_encode "${SERVICE_NAMESPACE}")"
deployment_environment_q="$(url_encode "${DEPLOYMENT_ENVIRONMENT}")"
entity_id_q="$(url_encode "${HERTZBEAT_ENTITY_ID}")"
entity_type_q="$(url_encode "${HERTZBEAT_ENTITY_TYPE}")"
entity_name_q="$(url_encode "${HERTZBEAT_ENTITY_NAME}")"
collector_q="$(url_encode "${HERTZBEAT_COLLECTOR}")"
template_q="$(url_encode "${HERTZBEAT_TEMPLATE}")"
metric_query_q="$(url_encode "hertzbeat_demo_checkout_latency_ms_milliseconds")"
common_signal_context="entityId=${entity_id_q}&entityType=${entity_type_q}&entityName=${entity_name_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${deployment_environment_q}&collector=${collector_q}&template=${template_q}&source=otlp"
trace_url="${FRONTEND_BASE}/trace/manage?traceId=${trace_id_q}&spanId=${root_span_id_q}&${common_signal_context}"
log_stream_url="${FRONTEND_BASE}/log/manage?view=stream&${common_signal_context}"
log_history_url="${FRONTEND_BASE}/log/manage?view=list&traceId=${trace_id_q}&spanId=${root_span_id_q}&${common_signal_context}"
metrics_url="${FRONTEND_BASE}/ingestion/otlp/metrics?traceId=${trace_id_q}&spanId=${root_span_id_q}&${common_signal_context}"
explicit_metrics_url="${metrics_url}&query=${metric_query_q}"
metrics_group_by_url="${explicit_metrics_url}&groupBy=service.version&groupLimit=8"
metrics_host_group_by_url="${explicit_metrics_url}&groupBy=host.name&groupLimit=8"
metrics_k8s_pod_group_by_url="${explicit_metrics_url}&groupBy=k8s.pod.name&groupLimit=8"
log_group_by_url="${FRONTEND_BASE}/log/manage?view=list&groupBy=resource%3Aservice.version&groupLimit=8&${common_signal_context}"
log_host_group_by_url="${FRONTEND_BASE}/log/manage?view=list&groupBy=resource%3Ahost.name&groupLimit=8&${common_signal_context}"
log_k8s_pod_group_by_url="${FRONTEND_BASE}/log/manage?view=list&groupBy=resource%3Ak8s.pod.name&groupLimit=8&${common_signal_context}"
trace_group_by_url="${FRONTEND_BASE}/trace/manage?view=list&spanScope=all&groupBy=resource%3Aservice.version&groupLimit=8&${common_signal_context}"
trace_host_group_by_url="${FRONTEND_BASE}/trace/manage?view=list&spanScope=all&groupBy=resource%3Ahost.name&groupLimit=8&${common_signal_context}"
trace_k8s_pod_group_by_url="${FRONTEND_BASE}/trace/manage?view=list&spanScope=all&groupBy=resource%3Ak8s.pod.name&groupLimit=8&${common_signal_context}"
entity_url="${FRONTEND_BASE}/entities/${entity_id_q}?traceId=${trace_id_q}&spanId=${root_span_id_q}&${common_signal_context}"
alert_url="${FRONTEND_BASE}/alert?status=firing&signal=metrics&search=${service_name_q}&traceId=${trace_id_q}&spanId=${root_span_id_q}&${common_signal_context}"

if [[ "${DRY_RUN}" == "true" ]]; then
  python3 - <<PY
import json

entity_api_id = "${HERTZBEAT_ENTITY_ID}"
if not entity_api_id.isdigit():
    raise SystemExit(f"HERTZBEAT_ENTITY_ID must be numeric for /api/entities: {entity_api_id}")

print(json.dumps({
    "traceId": "${TRACE_ID}",
    "serviceName": "${SERVICE_NAME}",
    "serviceNamespace": "${SERVICE_NAMESPACE}",
    "serviceVersion": "${SERVICE_VERSION}",
    "environment": "${DEPLOYMENT_ENVIRONMENT}",
    "resourceDimensions": {
        "host.name": "${HOST_NAME}",
        "k8s.namespace.name": "${K8S_NAMESPACE_NAME}",
        "k8s.pod.name": "${K8S_POD_NAME}",
        "container.name": "${CONTAINER_NAME}"
    },
    "entityId": "${HERTZBEAT_ENTITY_ID}",
    "entityType": "${HERTZBEAT_ENTITY_TYPE}",
    "entityName": "${HERTZBEAT_ENTITY_NAME}",
    "hostEntityId": "${HOST_ENTITY_ID}",
    "hostEntityName": "${HOST_ENTITY_NAME}",
    "k8sEntityId": "${K8S_ENTITY_ID}",
    "k8sEntityName": "${K8S_ENTITY_NAME}",
    "collector": "${HERTZBEAT_COLLECTOR}",
    "template": "${HERTZBEAT_TEMPLATE}",
    "entityBinding": {
        "entity": {
            "id": "${HERTZBEAT_ENTITY_ID}",
            "type": "${HERTZBEAT_ENTITY_TYPE}",
            "name": "${SERVICE_NAME}",
            "displayName": "${HERTZBEAT_ENTITY_NAME}",
            "namespace": "${SERVICE_NAMESPACE}",
            "environment": "${DEPLOYMENT_ENVIRONMENT}",
            "workspaceId": "${HERTZBEAT_WORKSPACE_ID}"
        },
        "relatedEntities": {
            "host": {
                "id": "${HOST_ENTITY_ID}",
                "type": "host",
                "name": "${HOST_NAME}",
                "displayName": "${HOST_ENTITY_NAME}",
                "environment": "${DEPLOYMENT_ENVIRONMENT}",
                "identityKey": "host.name",
                "identityValue": "${HOST_NAME}"
            },
            "k8s": {
                "id": "${K8S_ENTITY_ID}",
                "type": "k8s_workload",
                "name": "${K8S_POD_NAME}",
                "displayName": "${K8S_ENTITY_NAME}",
                "namespace": "${K8S_NAMESPACE_NAME}",
                "environment": "${DEPLOYMENT_ENVIRONMENT}",
                "identityKey": "k8s.pod.name",
                "identityValue": "${K8S_POD_NAME}"
            }
        },
        "identities": [
            {"identityType": "otel_resource", "identityKey": "service.name", "identityValue": "${SERVICE_NAME}"},
            {"identityType": "otel_resource", "identityKey": "service.namespace", "identityValue": "${SERVICE_NAMESPACE}"},
            {"identityType": "otel_resource", "identityKey": "deployment.environment.name", "identityValue": "${DEPLOYMENT_ENVIRONMENT}"},
            {"identityType": "otel_resource", "identityKey": "service.version", "identityValue": "${SERVICE_VERSION}"},
            {"identityType": "otel_resource", "identityKey": "host.name", "identityValue": "${HOST_NAME}"},
            {"identityType": "otel_resource", "identityKey": "k8s.namespace.name", "identityValue": "${K8S_NAMESPACE_NAME}"},
            {"identityType": "otel_resource", "identityKey": "k8s.pod.name", "identityValue": "${K8S_POD_NAME}"},
            {"identityType": "otel_resource", "identityKey": "container.name", "identityValue": "${CONTAINER_NAME}"}
        ],
        "entityApiEndpoint": "${HERTZBEAT_BASE}/api/entities",
        "ensureEntityDefault": False,
        "ensureEntityOption": "--ensure-entity",
        "ensureEntityCommand": "bash script/dev/seed-otlp-three-signal-demo.sh --ensure-entity",
        "entityApiPayload": {
            "entity": {
                "id": int(entity_api_id),
                "type": "${HERTZBEAT_ENTITY_TYPE}",
                "name": "${SERVICE_NAME}",
                "displayName": "${HERTZBEAT_ENTITY_NAME}",
                "namespace": "${SERVICE_NAMESPACE}",
                "environment": "${DEPLOYMENT_ENVIRONMENT}",
                "status": "unknown",
                "source": "manual",
                "workspaceId": "${HERTZBEAT_WORKSPACE_ID}",
                "labels": {
                    "service.name": "${SERVICE_NAME}",
                    "service.namespace": "${SERVICE_NAMESPACE}",
                    "deployment.environment.name": "${DEPLOYMENT_ENVIRONMENT}",
                    "service.version": "${SERVICE_VERSION}",
                    "host.name": "${HOST_NAME}",
                    "k8s.namespace.name": "${K8S_NAMESPACE_NAME}",
                    "k8s.pod.name": "${K8S_POD_NAME}",
                    "container.name": "${CONTAINER_NAME}",
                    "hertzbeat.entity_id": "${HERTZBEAT_ENTITY_ID}",
                    "hertzbeat.entity_type": "${HERTZBEAT_ENTITY_TYPE}",
                    "hertzbeat.entity_name": "${HERTZBEAT_ENTITY_NAME}"
                },
                "tags": [
                    "service:${SERVICE_NAME}",
                    "namespace:${SERVICE_NAMESPACE}",
                    "environment:${DEPLOYMENT_ENVIRONMENT}"
                ]
            },
            "identities": [
                {"identityType": "otel_resource", "identityKey": "service.name", "identityValue": "${SERVICE_NAME}", "primaryIdentity": True},
                {"identityType": "otel_resource", "identityKey": "service.namespace", "identityValue": "${SERVICE_NAMESPACE}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "deployment.environment.name", "identityValue": "${DEPLOYMENT_ENVIRONMENT}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "service.version", "identityValue": "${SERVICE_VERSION}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "host.name", "identityValue": "${HOST_NAME}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "k8s.namespace.name", "identityValue": "${K8S_NAMESPACE_NAME}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "k8s.pod.name", "identityValue": "${K8S_POD_NAME}", "primaryIdentity": False},
                {"identityType": "otel_resource", "identityKey": "container.name", "identityValue": "${CONTAINER_NAME}", "primaryIdentity": False}
            ],
            "monitorBinds": [],
            "relations": [
                {
                    "sourceEntityId": int(entity_api_id),
                    "targetEntityId": int("${HOST_ENTITY_ID}"),
                    "targetRef": "host:${HOST_NAME}",
                    "relationType": "runs_on",
                    "relationSource": "otel_resource",
                    "status": "confirmed",
                    "score": 95,
                    "description": "${SERVICE_NAME} runs on ${HOST_NAME}",
                    "attributes": {"resourceKey": "host.name", "resourceValue": "${HOST_NAME}"}
                },
                {
                    "sourceEntityId": int(entity_api_id),
                    "targetEntityId": int("${K8S_ENTITY_ID}"),
                    "targetRef": "k8s_workload:${K8S_NAMESPACE_NAME}/${K8S_POD_NAME}",
                    "relationType": "deployed_on",
                    "relationSource": "otel_resource",
                    "status": "confirmed",
                    "score": 95,
                    "description": "${SERVICE_NAME} is observed in pod ${K8S_POD_NAME}",
                    "attributes": {"resourceKey": "k8s.pod.name", "resourceValue": "${K8S_POD_NAME}"}
                }
            ]
        },
        "strongEntityRoute": "/entities/${entity_id_q}",
        "fallbackEntityRoute": "/entities?search=${service_name_q}"
    },
    "signals": ["traces", "metrics", "logs"],
    "counts": {
        "traces": {"spans": 4, "events": 6},
        "metrics": {"series": 4, "pointsPerSeries": 5},
        "logs": {"records": 4, "linkedTraceRecords": 4}
    },
    "endpoints": {
        "traces": "${HERTZBEAT_BASE}/api/otlp/v1/traces",
        "metrics": "${HERTZBEAT_BASE}/api/otlp/v1/metrics",
        "logs": "${HERTZBEAT_BASE}/api/otlp/v1/logs",
    },
    "metricQuery": "hertzbeat_demo_checkout_latency_ms_milliseconds",
    "metricQueries": [
        "hertzbeat_demo_checkout_latency_ms_milliseconds",
        "rpc_server_duration_milliseconds",
        "hertzbeat_demo_checkout_requests",
        "hertzbeat_demo_checkout_errors"
    ],
    "metricSeries": [
        {
            "name": "hertzbeat_demo_checkout_latency_ms_milliseconds",
            "points": 5,
            "traceId": "${TRACE_ID}",
            "spanId": "${ROOT_SPAN_ID}",
            "labels": [
                "service.name",
                "service.namespace",
                "service.version",
                "deployment.environment.name",
                "host.name",
                "k8s.namespace.name",
                "k8s.pod.name",
                "container.name",
                "http.route",
        "hertzbeat.entity_id",
        "hertzbeat.entity_type",
        "hertzbeat.entity_name",
                "hertzbeat.workspace_id",
                "hertzbeat.collector",
                "hertzbeat.template",
                "trace_id",
                "span_id"
            ]
        },
        {
            "name": "rpc_server_duration_milliseconds",
            "points": 5,
            "traceId": "${TRACE_ID}",
            "spanId": "${ROOT_SPAN_ID}",
            "labels": [
                "service.name",
                "service.namespace",
                "service.version",
                "deployment.environment.name",
                "host.name",
                "k8s.namespace.name",
                "k8s.pod.name",
                "container.name",
                "rpc.system",
                "rpc.service",
                "rpc.method",
        "hertzbeat.entity_id",
        "hertzbeat.entity_type",
        "hertzbeat.entity_name",
                "hertzbeat.workspace_id",
                "hertzbeat.collector",
                "hertzbeat.template",
                "trace_id",
                "span_id"
            ]
        }
    ],
    "traceUrl": "${trace_url}",
    "logUrl": "${log_stream_url}",
    "logHistoryUrl": "${log_history_url}",
    "metricsUrl": "${metrics_url}",
    "explicitMetricsUrl": "${explicit_metrics_url}",
    "breakoutRoutes": {
        "metricsByServiceVersion": "${metrics_group_by_url}",
        "metricsByHost": "${metrics_host_group_by_url}",
        "metricsByK8sPod": "${metrics_k8s_pod_group_by_url}",
        "logsByServiceVersion": "${log_group_by_url}",
        "logsByHost": "${log_host_group_by_url}",
        "logsByK8sPod": "${log_k8s_pod_group_by_url}",
        "tracesByServiceVersion": "${trace_group_by_url}",
        "tracesByHost": "${trace_host_group_by_url}",
        "tracesByK8sPod": "${trace_k8s_pod_group_by_url}"
    },
    "entityUrl": "${entity_url}",
    "alertUrl": "${alert_url}",
}, ensure_ascii=False, indent=2))
PY
  exit 0
fi

timestamp_ns="$(now_ns)"
traces_payload="$(build_payload traces "${timestamp_ns}")"
metrics_payload="$(build_payload metrics "${timestamp_ns}")"
logs_payload="$(build_payload logs "${timestamp_ns}")"

token="$(login_token)"
if [[ "${ENSURE_ENTITY}" == "true" ]]; then
  ensure_entity "${token}" host "${HOST_ENTITY_ID}"
  ensure_entity "${token}" k8s "${K8S_ENTITY_ID}"
  ensure_entity "${token}" service "${HERTZBEAT_ENTITY_ID}"
fi
post_signal traces "${token}" "${traces_payload}"
post_signal metrics "${token}" "${metrics_payload}"
post_signal logs "${token}" "${logs_payload}"

printf 'traceId: %s\n' "${TRACE_ID}"
printf 'service: %s / %s / %s\n' "${SERVICE_NAME}" "${SERVICE_NAMESPACE}" "${DEPLOYMENT_ENVIRONMENT}"
printf 'service version: %s\n' "${SERVICE_VERSION}"
printf 'resource dimensions: host=%s k8s.pod=%s container=%s\n' "${HOST_NAME}" "${K8S_POD_NAME}" "${CONTAINER_NAME}"
printf 'entity: %s / %s\n' "${HERTZBEAT_ENTITY_ID}" "${HERTZBEAT_ENTITY_NAME}"
printf 'collector/template: %s / %s\n' "${HERTZBEAT_COLLECTOR}" "${HERTZBEAT_TEMPLATE}"
printf 'open trace: %s\n' "${trace_url}"
printf 'open logs stream: %s\n' "${log_stream_url}"
printf 'open logs linked: %s\n' "${log_history_url}"
printf 'open metrics: %s\n' "${metrics_url}"
printf 'open metrics explicit: %s\n' "${explicit_metrics_url}"
printf 'open metrics by service version: %s\n' "${metrics_group_by_url}"
printf 'open metrics by host: %s\n' "${metrics_host_group_by_url}"
printf 'open metrics by k8s pod: %s\n' "${metrics_k8s_pod_group_by_url}"
printf 'open logs by service version: %s\n' "${log_group_by_url}"
printf 'open logs by host: %s\n' "${log_host_group_by_url}"
printf 'open logs by k8s pod: %s\n' "${log_k8s_pod_group_by_url}"
printf 'open traces by service version: %s\n' "${trace_group_by_url}"
printf 'open traces by host: %s\n' "${trace_host_group_by_url}"
printf 'open traces by k8s pod: %s\n' "${trace_k8s_pod_group_by_url}"
printf 'open entity: %s\n' "${entity_url}"
printf 'open alert handling: %s\n' "${alert_url}"
printf 'metric query: hertzbeat_demo_checkout_latency_ms_milliseconds\n'
