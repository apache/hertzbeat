#!/usr/bin/env bash

set -euo pipefail

HERTZBEAT_BASE="${HERTZBEAT_BASE:-http://127.0.0.1:1157}"
SERVICE_NAME="${SERVICE_NAME:-checkout}"
SERVICE_NAMESPACE="${SERVICE_NAMESPACE:-hertzbeat-demo}"
DEPLOYMENT_ENVIRONMENT="${DEPLOYMENT_ENVIRONMENT:-demo}"
HOST_NAME="${HOST_NAME:-checkout-node-a}"
K8S_NAMESPACE_NAME="${K8S_NAMESPACE_NAME:-payments}"
K8S_POD_NAME="${K8S_POD_NAME:-checkout-v1-78dfd}"
CONTAINER_NAME="${CONTAINER_NAME:-checkout}"
HERTZBEAT_ENTITY_ID="${HERTZBEAT_ENTITY_ID:-4200}"
HERTZBEAT_ENTITY_TYPE="${HERTZBEAT_ENTITY_TYPE:-service}"
HERTZBEAT_ENTITY_NAME="${HERTZBEAT_ENTITY_NAME:-Checkout API}"
HOST_ENTITY_ID="${HOST_ENTITY_ID:-4201}"
K8S_ENTITY_ID="${K8S_ENTITY_ID:-4202}"
HERTZBEAT_USER="${HERTZBEAT_USER:-admin}"
HERTZBEAT_PASSWORD="${HERTZBEAT_PASSWORD:-hertzbeat}"
METRIC_QUERY="${METRIC_QUERY:-hertzbeat_demo_checkout_latency_ms_milliseconds}"
SERVICE_VERSION="${SERVICE_VERSION:-1.2.3}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-12}"
VERIFY_SLEEP_SECONDS="${VERIFY_SLEEP_SECONDS:-5}"
TRACE_ID="${TRACE_ID:-$(python3 - <<'PY'
import secrets

print(secrets.token_hex(16))
PY
)}"
ROOT_SPAN_ID="${ROOT_SPAN_ID:-1111222233334444}"

DRY_RUN=false
SKIP_SEED=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run)
      DRY_RUN=true
      ;;
    --skip-seed)
      SKIP_SEED=true
      ;;
    *)
      printf 'unsupported argument: %s\n' "${arg}" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

url_encode() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
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

api_get() {
  local token="$1"
  local path="$2"
  local output_file="$3"
  local status_code
  status_code="$(
    curl -sS \
      -o "${output_file}" \
      -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H 'Accept: application/json' \
      "${HERTZBEAT_BASE}${path}"
  )"
  if [[ "${status_code}" != 2* ]]; then
    printf 'GET %s failed with HTTP %s\n' "${path}" "${status_code}" >&2
    cat "${output_file}" >&2
    exit 1
  fi
}

fetch_live_state() {
  local token="$1"
  local entity_file="$2"
  local host_entity_file="$3"
  local k8s_entity_file="$4"
  local bindings_file="$5"
  local metrics_file="$6"
  local logs_file="$7"
  local traces_file="$8"
  local metrics_breakout_file="$9"
  local logs_breakout_file="${10}"
  local traces_breakout_file="${11}"
  local metrics_resource_breakout_file="${12}"
  local logs_host_breakout_file="${13}"
  local logs_k8s_pod_breakout_file="${14}"
  local traces_host_breakout_file="${15}"
  local traces_k8s_pod_breakout_file="${16}"
  local related_metrics_file="${17}"
  api_get "${token}" "/api/entities/${HERTZBEAT_ENTITY_ID}" "${entity_file}"
  api_get "${token}" "/api/entities/${HOST_ENTITY_ID}" "${host_entity_file}"
  api_get "${token}" "/api/entities/${K8S_ENTITY_ID}" "${k8s_entity_file}"
  api_get "${token}" "/api/ingestion/otlp/bindings" "${bindings_file}"
  api_get "${token}" "${metrics_console_path}" "${metrics_file}"
  api_get "${token}" "${logs_list_path}" "${logs_file}"
  api_get "${token}" "${traces_list_path}" "${traces_file}"
  api_get "${token}" "${metrics_breakout_path}" "${metrics_breakout_file}"
  api_get "${token}" "${logs_breakout_path}" "${logs_breakout_file}"
  api_get "${token}" "${traces_breakout_path}" "${traces_breakout_file}"
  api_get "${token}" "${metrics_resource_breakout_path}" "${metrics_resource_breakout_file}"
  api_get "${token}" "${logs_host_breakout_path}" "${logs_host_breakout_file}"
  api_get "${token}" "${logs_k8s_pod_breakout_path}" "${logs_k8s_pod_breakout_file}"
  api_get "${token}" "${traces_host_breakout_path}" "${traces_host_breakout_file}"
  api_get "${token}" "${traces_k8s_pod_breakout_path}" "${traces_k8s_pod_breakout_file}"
  api_get "${token}" "${related_metrics_path}" "${related_metrics_file}"
}

validate_live_state() {
  local entity_file="$1"
  local host_entity_file="$2"
  local k8s_entity_file="$3"
  local bindings_file="$4"
  local metrics_file="$5"
  local logs_file="$6"
  local traces_file="$7"
  local metrics_breakout_file="$8"
  local logs_breakout_file="$9"
  local traces_breakout_file="${10}"
  local metrics_resource_breakout_file="${11}"
  local logs_host_breakout_file="${12}"
  local logs_k8s_pod_breakout_file="${13}"
  local traces_host_breakout_file="${14}"
  local traces_k8s_pod_breakout_file="${15}"
  local related_metrics_file="${16}"
  python3 - \
    "${entity_file}" \
    "${host_entity_file}" \
    "${k8s_entity_file}" \
    "${bindings_file}" \
    "${metrics_file}" \
    "${logs_file}" \
    "${traces_file}" \
    "${metrics_breakout_file}" \
    "${logs_breakout_file}" \
    "${traces_breakout_file}" \
    "${metrics_resource_breakout_file}" \
    "${logs_host_breakout_file}" \
    "${logs_k8s_pod_breakout_file}" \
    "${traces_host_breakout_file}" \
    "${traces_k8s_pod_breakout_file}" \
    "${related_metrics_file}" \
    "${HERTZBEAT_ENTITY_ID}" \
    "${HOST_ENTITY_ID}" \
    "${K8S_ENTITY_ID}" \
    "${SERVICE_NAME}" \
    "${SERVICE_NAMESPACE}" \
    "${DEPLOYMENT_ENVIRONMENT}" \
    "${HERTZBEAT_ENTITY_NAME}" \
    "${METRIC_QUERY}" \
    "${TRACE_ID}" \
    "${ROOT_SPAN_ID}" \
    "${SERVICE_VERSION}" \
    "${HOST_NAME}" \
    "${K8S_NAMESPACE_NAME}" \
    "${K8S_POD_NAME}" \
    "${CONTAINER_NAME}" <<'PY'
import json
import sys

entity_path, host_entity_path, k8s_entity_path, bindings_path, metrics_path, logs_path, traces_path = sys.argv[1:8]
metrics_breakout_path, logs_breakout_path, traces_breakout_path = sys.argv[8:11]
metrics_resource_breakout_path, logs_host_breakout_path, logs_k8s_pod_breakout_path = sys.argv[11:14]
traces_host_breakout_path, traces_k8s_pod_breakout_path = sys.argv[14:16]
related_metrics_path = sys.argv[16]
entity_id, host_entity_id, k8s_entity_id = sys.argv[17:20]
service_name, namespace, environment, display_name, metric_query, trace_id, root_span_id = sys.argv[20:27]
service_version, host_name, k8s_namespace, k8s_pod, container_name = sys.argv[27:32]

def load_message(path):
    with open(path, encoding="utf-8") as handle:
        body = json.load(handle)
    if body.get("code") != 0:
        raise SystemExit(f"{path} returned non-success message: {json.dumps(body, ensure_ascii=False)}")
    return body.get("data") or {}

def assert_group_contains(path, expected_group_by, expected_value, count_keys):
    group_data = load_message(path)
    if group_data.get("groupBy") != expected_group_by:
        raise SystemExit(f"{path} groupBy mismatch: {group_data.get('groupBy')} != {expected_group_by}")
    groups = group_data.get("groups") or []
    group = next((item for item in groups if str(item.get("value")) == expected_value), None)
    if not group:
        raise SystemExit(f"{path} missing group value {expected_value}; groups={groups}")
    if not any(float(group.get(key) or 0) > 0 for key in count_keys):
        raise SystemExit(f"{path} group {expected_value} has no positive count in {count_keys}: {group}")
    return groups

def extract_promql_group_labels(query):
    marker = " by ("
    start = query.find(marker)
    if start < 0:
        return set()
    labels_start = start + len(marker)
    labels_end = query.find(")", labels_start)
    if labels_end < 0:
        return set()
    return {label.strip() for label in query[labels_start:labels_end].split(",") if label.strip()}

def assert_metric_frame_label_contains(metric_data, label, expected_value):
    frames = ((metric_data.get("results") or {}).get("frames") or [])
    seen_values = []
    for frame in frames:
        labels = ((frame.get("schema") or {}).get("labels") or {})
        if str(labels.get(label)) == expected_value:
            return
        if label in labels:
            seen_values.append(labels.get(label))
    raise SystemExit(
        f"metrics breakout missing frame label {label}={expected_value}; seen={seen_values}; frames={len(frames)}"
    )

entity_data = load_message(entity_path)
entity = entity_data.get("entity") or {}
if str(entity.get("id")) != str(entity_id):
    raise SystemExit(f"entity id mismatch: {entity.get('id')} != {entity_id}")
if entity.get("name") != service_name:
    raise SystemExit(f"entity name mismatch: {entity.get('name')} != {service_name}")
if entity.get("displayName") != display_name:
    raise SystemExit(f"entity displayName mismatch: {entity.get('displayName')} != {display_name}")
if entity.get("namespace") != namespace:
    raise SystemExit(f"entity namespace mismatch: {entity.get('namespace')} != {namespace}")
if entity.get("environment") != environment:
    raise SystemExit(f"entity environment mismatch: {entity.get('environment')} != {environment}")

host_entity_data = load_message(host_entity_path)
host_entity = host_entity_data.get("entity") or {}
if str(host_entity.get("id")) != str(host_entity_id):
    raise SystemExit(f"host entity id mismatch: {host_entity.get('id')} != {host_entity_id}")
if host_entity.get("type") != "host":
    raise SystemExit(f"host entity type mismatch: {host_entity.get('type')}")
if host_entity.get("name") != host_name:
    raise SystemExit(f"host entity name mismatch: {host_entity.get('name')} != {host_name}")

k8s_entity_data = load_message(k8s_entity_path)
k8s_entity = k8s_entity_data.get("entity") or {}
if str(k8s_entity.get("id")) != str(k8s_entity_id):
    raise SystemExit(f"k8s entity id mismatch: {k8s_entity.get('id')} != {k8s_entity_id}")
if k8s_entity.get("type") != "k8s_workload":
    raise SystemExit(f"k8s entity type mismatch: {k8s_entity.get('type')}")
if k8s_entity.get("name") != k8s_pod:
    raise SystemExit(f"k8s entity name mismatch: {k8s_entity.get('name')} != {k8s_pod}")
if k8s_entity.get("namespace") != k8s_namespace:
    raise SystemExit(f"k8s entity namespace mismatch: {k8s_entity.get('namespace')} != {k8s_namespace}")

identities = entity_data.get("identities") or []
identity_pairs = {(item.get("identityKey"), item.get("identityValue")) for item in identities}
required_pairs = {
    ("service.name", service_name),
    ("service.namespace", namespace),
    ("deployment.environment.name", environment),
    ("service.version", service_version),
    ("host.name", host_name),
    ("k8s.namespace.name", k8s_namespace),
    ("k8s.pod.name", k8s_pod),
    ("container.name", container_name),
}
missing_pairs = sorted(required_pairs - identity_pairs)
if missing_pairs:
    raise SystemExit(f"entity identities missing: {missing_pairs}")

host_identity_pairs = {
    (item.get("identityKey"), item.get("identityValue"))
    for item in (host_entity_data.get("identities") or [])
}
if ("host.name", host_name) not in host_identity_pairs:
    raise SystemExit(f"host entity identities missing host.name={host_name}: {host_identity_pairs}")

k8s_identity_pairs = {
    (item.get("identityKey"), item.get("identityValue"))
    for item in (k8s_entity_data.get("identities") or [])
}
for pair in (("k8s.pod.name", k8s_pod), ("k8s.namespace.name", k8s_namespace), ("container.name", container_name)):
    if pair not in k8s_identity_pairs:
        raise SystemExit(f"k8s entity identities missing {pair}: {k8s_identity_pairs}")

relations = entity_data.get("relations") or []
relation_pairs = {
    (str(item.get("targetEntityId")), item.get("relationType"), item.get("status"))
    for item in relations
}
if (str(host_entity_id), "runs_on", "confirmed") not in relation_pairs:
    raise SystemExit(f"service entity missing runs_on host relation: {relations}")
if (str(k8s_entity_id), "deployed_on", "confirmed") not in relation_pairs:
    raise SystemExit(f"service entity missing deployed_on k8s relation: {relations}")

bindings = load_message(bindings_path)
bound_entities = bindings.get("recentBoundEntities") or []
bound = next((item for item in bound_entities if str(item.get("entityId")) == str(entity_id)), None)
if not bound:
    raise SystemExit(f"entity {entity_id} not present in recentBoundEntities")
if bound.get("primaryIdentityKey") != "service.name" or bound.get("primaryIdentityValue") != service_name:
    raise SystemExit(f"binding primary identity mismatch: {bound}")

metrics = load_message(metrics_path)
query = metrics.get("query") or ""
for expected in (metric_query, service_name, namespace, environment):
    if expected not in query:
        raise SystemExit(f"metrics console query missing {expected}: {query}")

metrics_breakout = load_message(metrics_breakout_path)
metrics_breakout_query = metrics_breakout.get("query") or ""
if "service_version" not in extract_promql_group_labels(metrics_breakout_query):
    raise SystemExit(f"metrics breakout query missing service_version group-by: {metrics_breakout_query}")
for expected in (metric_query, service_name, namespace, environment):
    if expected not in metrics_breakout_query:
        raise SystemExit(f"metrics breakout query missing {expected}: {metrics_breakout_query}")

metrics_resource_breakout = load_message(metrics_resource_breakout_path)
metrics_resource_breakout_query = metrics_resource_breakout.get("query") or ""
metrics_resource_group_labels = extract_promql_group_labels(metrics_resource_breakout_query)
for expected_label in ("service_version", "host_name", "k8s_pod_name"):
    if expected_label not in metrics_resource_group_labels:
        raise SystemExit(
            f"metrics resource breakout query missing {expected_label} group-by: {metrics_resource_breakout_query}"
        )
for expected in (metric_query, service_name, namespace, environment):
    if expected not in metrics_resource_breakout_query:
        raise SystemExit(f"metrics resource breakout query missing {expected}: {metrics_resource_breakout_query}")
assert_metric_frame_label_contains(metrics_resource_breakout, "service_version", service_version)
assert_metric_frame_label_contains(metrics_resource_breakout, "host_name", host_name)
assert_metric_frame_label_contains(metrics_resource_breakout, "k8s_pod_name", k8s_pod)

logs_data = load_message(logs_path)
logs = logs_data.get("content") or []
log = next((item for item in logs if item.get("traceId") == trace_id and item.get("spanId") == root_span_id), None)
if not log:
    raise SystemExit(f"log row missing trace/span {trace_id}/{root_span_id}; rows={len(logs)}")
log_resource = log.get("resource") or {}
for key, expected in {
    "service.name": service_name,
    "service.namespace": namespace,
    "deployment.environment.name": environment,
    "service.version": service_version,
    "host.name": host_name,
    "k8s.namespace.name": k8s_namespace,
    "k8s.pod.name": k8s_pod,
    "container.name": container_name,
}.items():
    if str(log_resource.get(key)) != expected:
        raise SystemExit(f"log resource {key} mismatch: {log_resource.get(key)} != {expected}")

traces_data = load_message(traces_path)
traces = traces_data.get("content") or []
trace = next((item for item in traces if item.get("traceId") == trace_id), None)
if not trace:
    raise SystemExit(f"trace row missing traceId {trace_id}; rows={len(traces)}")
if trace.get("rootSpanId") != root_span_id:
    raise SystemExit(f"trace rootSpanId mismatch: {trace.get('rootSpanId')} != {root_span_id}")
if trace.get("serviceName") != service_name:
    raise SystemExit(f"trace serviceName mismatch: {trace.get('serviceName')} != {service_name}")
if trace.get("serviceNamespace") != namespace:
    raise SystemExit(f"trace serviceNamespace mismatch: {trace.get('serviceNamespace')} != {namespace}")
trace_resource = trace.get("resourceAttributes") or {}
if trace_resource.get("deployment.environment.name") != environment:
    raise SystemExit(f"trace environment resource mismatch: {trace_resource.get('deployment.environment.name')} != {environment}")
for key, expected in {
    "service.version": service_version,
    "host.name": host_name,
    "k8s.namespace.name": k8s_namespace,
    "k8s.pod.name": k8s_pod,
    "container.name": container_name,
}.items():
    if str(trace_resource.get(key)) != expected:
        raise SystemExit(f"trace resource {key} mismatch: {trace_resource.get(key)} != {expected}")

log_groups = assert_group_contains(logs_breakout_path, "resource:service.version", service_version, ("count",))
trace_groups = assert_group_contains(traces_breakout_path, "resource:service.version", service_version, ("traceCount", "errorTraceCount"))
log_host_groups = assert_group_contains(logs_host_breakout_path, "resource:host.name", host_name, ("count",))
log_k8s_pod_groups = assert_group_contains(logs_k8s_pod_breakout_path, "resource:k8s.pod.name", k8s_pod, ("count",))
trace_host_groups = assert_group_contains(traces_host_breakout_path, "resource:host.name", host_name, ("traceCount", "errorTraceCount"))
trace_k8s_pod_groups = assert_group_contains(traces_k8s_pod_breakout_path, "resource:k8s.pod.name", k8s_pod, ("traceCount", "errorTraceCount"))

related_metrics = load_message(related_metrics_path)
related_context = related_metrics.get("context") or {}
if str(related_context.get("entityId")) != str(entity_id):
    raise SystemExit(f"related metrics entity context mismatch: {related_context}")
if related_context.get("serviceName") != service_name:
    raise SystemExit(f"related metrics serviceName mismatch: {related_context}")
if related_metrics.get("source") != "backend-related-metrics":
    raise SystemExit(f"related metrics source mismatch: {related_metrics.get('source')}")
resource_matchers = related_metrics.get("resourceMatchers") or []
matcher_pairs = {(item.get("label"), item.get("value")) for item in resource_matchers}
for pair in (("host_name", host_name), ("k8s_pod_name", k8s_pod), ("container_name", container_name)):
    if pair not in matcher_pairs:
        raise SystemExit(f"related metrics missing resource matcher {pair}: {resource_matchers}")
related_candidates = related_metrics.get("candidates") or []
candidate_keys = {
    (item.get("query"), item.get("source"), item.get("family"))
    for item in related_candidates
}
for expected in (
    (metric_query, "service", "latency"),
    ("container.cpu.usage", "pod", "cpu"),
    ("container.memory.working_set", "pod", "memory"),
    ("system.cpu.utilization", "host", "cpu"),
    ("system.memory.usage", "host", "memory"),
):
    if expected not in candidate_keys:
        raise SystemExit(f"related metrics missing candidate {expected}: {related_candidates}")

print(json.dumps({
    "ok": True,
    "entityId": entity_id,
    "serviceName": service_name,
    "serviceNamespace": namespace,
    "environment": environment,
    "traceId": trace_id,
    "rootSpanId": root_span_id,
    "boundEntityCount": len(bound_entities),
    "metricsQuery": query,
    "metricsBreakoutQuery": metrics_breakout_query,
    "metricsResourceBreakoutQuery": metrics_resource_breakout_query,
    "logRecordCount": len(logs),
    "traceRecordCount": len(traces),
    "logServiceVersionGroups": len(log_groups),
    "traceServiceVersionGroups": len(trace_groups),
    "logHostGroups": len(log_host_groups),
    "logK8sPodGroups": len(log_k8s_pod_groups),
    "traceHostGroups": len(trace_host_groups),
    "traceK8sPodGroups": len(trace_k8s_pod_groups),
    "relatedMetricCandidateCount": len(related_candidates),
    "relatedMetricQueries": [item.get("query") for item in related_candidates],
}, ensure_ascii=False, indent=2))
PY
}

validate_with_retry() {
  local token="$1"
  local entity_file="$2"
  local host_entity_file="$3"
  local k8s_entity_file="$4"
  local bindings_file="$5"
  local metrics_file="$6"
  local logs_file="$7"
  local traces_file="$8"
  local metrics_breakout_file="$9"
  local logs_breakout_file="${10}"
  local traces_breakout_file="${11}"
  local metrics_resource_breakout_file="${12}"
  local logs_host_breakout_file="${13}"
  local logs_k8s_pod_breakout_file="${14}"
  local traces_host_breakout_file="${15}"
  local traces_k8s_pod_breakout_file="${16}"
  local related_metrics_file="${17}"
  local error_file
  local attempt
  error_file="$(mktemp)"
  for attempt in $(seq 1 "${VERIFY_ATTEMPTS}"); do
    fetch_live_state "${token}" "${entity_file}" "${host_entity_file}" "${k8s_entity_file}" \
      "${bindings_file}" "${metrics_file}" "${logs_file}" "${traces_file}" \
      "${metrics_breakout_file}" "${logs_breakout_file}" "${traces_breakout_file}" \
      "${metrics_resource_breakout_file}" "${logs_host_breakout_file}" "${logs_k8s_pod_breakout_file}" \
      "${traces_host_breakout_file}" "${traces_k8s_pod_breakout_file}" "${related_metrics_file}"
    if validate_live_state "${entity_file}" "${host_entity_file}" "${k8s_entity_file}" \
      "${bindings_file}" "${metrics_file}" "${logs_file}" "${traces_file}" \
      "${metrics_breakout_file}" "${logs_breakout_file}" "${traces_breakout_file}" \
      "${metrics_resource_breakout_file}" "${logs_host_breakout_file}" "${logs_k8s_pod_breakout_file}" \
      "${traces_host_breakout_file}" "${traces_k8s_pod_breakout_file}" "${related_metrics_file}" 2>"${error_file}"; then
      rm -f "${error_file}"
      return 0
    fi
    if [[ "${attempt}" == "${VERIFY_ATTEMPTS}" ]]; then
      printf 'verification failed after %s attempts; last error:\n' "${VERIFY_ATTEMPTS}" >&2
      cat "${error_file}" >&2
      rm -f "${error_file}"
      return 1
    fi
    printf 'verification attempt %s/%s not ready; retrying in %ss\n' "${attempt}" "${VERIFY_ATTEMPTS}" "${VERIFY_SLEEP_SECONDS}" >&2
    cat "${error_file}" >&2
    sleep "${VERIFY_SLEEP_SECONDS}"
  done
}

require_command curl
require_command python3
if [[ ! "${VERIFY_ATTEMPTS}" =~ ^[1-9][0-9]*$ ]]; then
  printf 'VERIFY_ATTEMPTS must be a positive integer: %s\n' "${VERIFY_ATTEMPTS}" >&2
  exit 1
fi
if [[ ! "${VERIFY_SLEEP_SECONDS}" =~ ^[0-9]+$ ]]; then
  printf 'VERIFY_SLEEP_SECONDS must be a non-negative integer: %s\n' "${VERIFY_SLEEP_SECONDS}" >&2
  exit 1
fi
if [[ ! "${TRACE_ID}" =~ ^[0-9a-fA-F]{32}$ ]]; then
  printf 'TRACE_ID must be a 32-character hex OTLP trace id: %s\n' "${TRACE_ID}" >&2
  exit 1
fi
if [[ ! "${ROOT_SPAN_ID}" =~ ^[0-9a-fA-F]{16}$ ]]; then
  printf 'ROOT_SPAN_ID must be a 16-character hex OTLP span id: %s\n' "${ROOT_SPAN_ID}" >&2
  exit 1
fi

service_name_q="$(url_encode "${SERVICE_NAME}")"
service_namespace_q="$(url_encode "${SERVICE_NAMESPACE}")"
environment_q="$(url_encode "${DEPLOYMENT_ENVIRONMENT}")"
entity_type_q="$(url_encode "${HERTZBEAT_ENTITY_TYPE}")"
metric_query_q="$(url_encode "${METRIC_QUERY}")"
service_version_group_q="$(url_encode "resource:service.version")"
host_group_q="$(url_encode "resource:host.name")"
k8s_pod_group_q="$(url_encode "resource:k8s.pod.name")"
trace_id_q="$(url_encode "${TRACE_ID}")"
root_span_id_q="$(url_encode "${ROOT_SPAN_ID}")"
metrics_console_path="/api/ingestion/otlp/metrics/console?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&query=${metric_query_q}"
metrics_breakout_path="${metrics_console_path}&groupBy=service.version"
metrics_resource_breakout_path="${metrics_console_path}&groupBy=service.version,host.name,k8s.pod.name"
related_metrics_filter_q="$(url_encode "host.name=\"${HOST_NAME}\" and k8s.namespace.name=\"${K8S_NAMESPACE_NAME}\" and k8s.pod.name=\"${K8S_POD_NAME}\" and container.name=\"${CONTAINER_NAME}\"")"
related_metrics_path="/api/ingestion/otlp/metrics/related?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&filter=${related_metrics_filter_q}&limit=8"
logs_list_path="/api/logs/list?pageIndex=0&pageSize=8&entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&spanId=${root_span_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}"
logs_breakout_path="/api/logs/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&spanId=${root_span_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&groupBy=${service_version_group_q}&limit=8"
logs_host_breakout_path="/api/logs/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&spanId=${root_span_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&groupBy=${host_group_q}&limit=8"
logs_k8s_pod_breakout_path="/api/logs/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&spanId=${root_span_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&groupBy=${k8s_pod_group_q}&limit=8"
traces_list_path="/api/traces/list?pageIndex=0&pageSize=8&entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&spanScope=root"
traces_breakout_path="/api/traces/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&spanScope=all&groupBy=${service_version_group_q}&limit=8"
traces_host_breakout_path="/api/traces/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&spanScope=all&groupBy=${host_group_q}&limit=8"
traces_k8s_pod_breakout_path="/api/traces/stats/group-by?entityId=${HERTZBEAT_ENTITY_ID}&entityType=${entity_type_q}&traceId=${trace_id_q}&serviceName=${service_name_q}&serviceNamespace=${service_namespace_q}&environment=${environment_q}&spanScope=all&groupBy=${k8s_pod_group_q}&limit=8"

if [[ "${DRY_RUN}" == "true" ]]; then
  python3 - <<PY
import json

print(json.dumps({
    "seedCommand": "bash script/dev/seed-otlp-three-signal-demo.sh --ensure-entity",
    "skipSeedOption": "--skip-seed",
    "checks": {
        "entity": "${HERTZBEAT_BASE}/api/entities/${HERTZBEAT_ENTITY_ID}",
        "hostEntity": "${HERTZBEAT_BASE}/api/entities/${HOST_ENTITY_ID}",
        "k8sEntity": "${HERTZBEAT_BASE}/api/entities/${K8S_ENTITY_ID}",
        "bindings": "${HERTZBEAT_BASE}/api/ingestion/otlp/bindings",
        "metricsConsole": "${HERTZBEAT_BASE}${metrics_console_path}",
        "logsList": "${HERTZBEAT_BASE}${logs_list_path}",
        "tracesList": "${HERTZBEAT_BASE}${traces_list_path}",
        "metricsByServiceVersion": "${HERTZBEAT_BASE}${metrics_breakout_path}",
        "metricsByResourceDimensions": "${HERTZBEAT_BASE}${metrics_resource_breakout_path}",
        "relatedMetrics": "${HERTZBEAT_BASE}${related_metrics_path}",
        "logsByServiceVersion": "${HERTZBEAT_BASE}${logs_breakout_path}",
        "logsByHost": "${HERTZBEAT_BASE}${logs_host_breakout_path}",
        "logsByK8sPod": "${HERTZBEAT_BASE}${logs_k8s_pod_breakout_path}",
        "tracesByServiceVersion": "${HERTZBEAT_BASE}${traces_breakout_path}",
        "tracesByHost": "${HERTZBEAT_BASE}${traces_host_breakout_path}",
        "tracesByK8sPod": "${HERTZBEAT_BASE}${traces_k8s_pod_breakout_path}"
    },
    "retry": {
        "attempts": ${VERIFY_ATTEMPTS},
        "sleepSeconds": ${VERIFY_SLEEP_SECONDS},
        "refetches": [
            "entity",
            "hostEntity",
            "k8sEntity",
            "bindings",
            "metricsConsole",
            "logsList",
            "tracesList",
            "metricsByServiceVersion",
            "metricsByResourceDimensions",
            "relatedMetrics",
            "logsByServiceVersion",
            "logsByHost",
            "logsByK8sPod",
            "tracesByServiceVersion",
            "tracesByHost",
            "tracesByK8sPod"
        ]
    },
    "expected": {
        "entityId": "${HERTZBEAT_ENTITY_ID}",
        "entityType": "${HERTZBEAT_ENTITY_TYPE}",
        "entityName": "${HERTZBEAT_ENTITY_NAME}",
        "hostEntityId": "${HOST_ENTITY_ID}",
        "k8sEntityId": "${K8S_ENTITY_ID}",
        "serviceName": "${SERVICE_NAME}",
        "serviceNamespace": "${SERVICE_NAMESPACE}",
        "environment": "${DEPLOYMENT_ENVIRONMENT}",
        "resourceDimensions": {
            "host.name": "${HOST_NAME}",
            "k8s.namespace.name": "${K8S_NAMESPACE_NAME}",
            "k8s.pod.name": "${K8S_POD_NAME}",
            "container.name": "${CONTAINER_NAME}"
        },
        "serviceVersion": "${SERVICE_VERSION}",
        "metricQuery": "${METRIC_QUERY}",
        "traceId": "${TRACE_ID}",
        "rootSpanId": "${ROOT_SPAN_ID}"
    }
}, ensure_ascii=False, indent=2))
PY
  exit 0
fi

export TRACE_ID
export ROOT_SPAN_ID
if [[ "${SKIP_SEED}" != "true" ]]; then
  bash "${REPO_ROOT}/script/dev/seed-otlp-three-signal-demo.sh" --ensure-entity
fi

token="$(login_token)"
entity_file="$(mktemp)"
host_entity_file="$(mktemp)"
k8s_entity_file="$(mktemp)"
bindings_file="$(mktemp)"
metrics_file="$(mktemp)"
logs_file="$(mktemp)"
traces_file="$(mktemp)"
metrics_breakout_file="$(mktemp)"
logs_breakout_file="$(mktemp)"
traces_breakout_file="$(mktemp)"
metrics_resource_breakout_file="$(mktemp)"
logs_host_breakout_file="$(mktemp)"
logs_k8s_pod_breakout_file="$(mktemp)"
traces_host_breakout_file="$(mktemp)"
traces_k8s_pod_breakout_file="$(mktemp)"
related_metrics_file="$(mktemp)"
trap 'rm -f "${entity_file}" "${host_entity_file}" "${k8s_entity_file}" "${bindings_file}" "${metrics_file}" "${logs_file}" "${traces_file}" "${metrics_breakout_file}" "${logs_breakout_file}" "${traces_breakout_file}" "${metrics_resource_breakout_file}" "${logs_host_breakout_file}" "${logs_k8s_pod_breakout_file}" "${traces_host_breakout_file}" "${traces_k8s_pod_breakout_file}" "${related_metrics_file}"' EXIT

validate_with_retry "${token}" "${entity_file}" "${host_entity_file}" "${k8s_entity_file}" \
  "${bindings_file}" "${metrics_file}" "${logs_file}" "${traces_file}" \
  "${metrics_breakout_file}" "${logs_breakout_file}" "${traces_breakout_file}" \
  "${metrics_resource_breakout_file}" "${logs_host_breakout_file}" "${logs_k8s_pod_breakout_file}" \
  "${traces_host_breakout_file}" "${traces_k8s_pod_breakout_file}" "${related_metrics_file}"
