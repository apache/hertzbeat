# HertzBeat Managed Telemetry Runtime

This module builds the private OpenTelemetry data-plane process supervised by
the Java HertzBeat Collector. It is not a second HertzBeat Collector and must
not register a separate Collector identity.

The managed runtime contains host metrics, explicitly managed Prometheus
targets, locally approved file-log profiles with persistent offsets, memory
protection, resource detection, fixed attribute governance, batching, direct
OTLP/HTTP export, and a loopback health endpoint.
The Java process owns configuration, validation, lifecycle, recovery, and the
single Collector identity. The Go process exports telemetry directly to the
HertzBeat Server and never proxies data through Java.

## Data acquisition model

The runtime combines active collection with standard OTLP ingestion:

- `hostmetrics`, `prometheus`, and `filelog` actively collect host metrics,
  scrape endpoints, and approved local log files.
- The upstream OTLP receiver accepts application metrics, logs, and traces over
  loopback gRPC `4317` and HTTP `4318` by default.

All signals share the same bounded processors and direct exporter. Applications
still need an OpenTelemetry SDK or agent to create traces. Bundled automatic
instrumentation is a separate capability and is not represented as telemetry
created by the Collector itself.

Resource precedence is fixed and shared by all three signals. Incoming SDK or
receiver attributes are preserved, enabled detectors fill missing values, and
HertzBeat ownership fields are then applied authoritatively. Authentication
headers, tokens, cookies, and API keys are removed from resource and signal
attributes before batching. The default detectors are only `env` and `system`;
Docker and cloud metadata detectors run only when the typed desired
configuration explicitly enables them. Filtering is limited to product-owned
presets such as health-check traces, and the server cannot send raw OTTL.

The direct exporter uses a bounded 2,048-request persistent queue with four
consumers. Failed deliveries back off without an elapsed-time cutoff, and queued
data resumes from the owner-only file-storage directory after a runtime restart.
When the queue or storage is full, new input is rejected instead of growing
memory or disk usage without a bound.

## Build and validate

Go 1.25 or newer is required.

```shell
make validate
make build-platforms
make license-check
make release-assets
../script/ci/verify-otel-runtime-package-layout.sh
```

Generated sources, binaries, and release archives remain local under `_build`,
`dist`, and the repository-level `dist` directory. They must not be committed.
`release-assets` creates a per-platform CycloneDX SBOM, SHA-512 checksums, and
the collected dependency license notices next to each Go runtime. It also runs
the pinned license and source-call-graph vulnerability gates.

## Java supervisor configuration

The runtime is opt-in until the server-side managed credential handoff is
available. A packaged Collector can enable it with these environment values:

```shell
export HERTZBEAT_OTEL_RUNTIME_ENABLED=true
export HERTZBEAT_OTLP_HTTP_ENDPOINT=http://server:1157/api/otlp
export HERTZBEAT_OTLP_TOKEN=<managed-intake-token>
export HERTZBEAT_WORKSPACE_ID=default
```

`IDENTITY` remains the only HertzBeat Collector identity. The Java supervisor
resolves the matching binary from `runtime/<os>-<arch>`, writes a generated
configuration without credentials, validates it, waits for loopback health,
and then reports its own runtime state. A runtime failure degrades only this
optional data plane; Java agentless collection continues.

### OTLP Agent and Gateway modes

Agent mode is the default. It listens only on `127.0.0.1:4317` and
`127.0.0.1:4318`, caps each request at 4 MiB, and is intended for applications
running on the same host. A non-loopback listener is rejected unless Gateway
mode is explicitly enabled.

Gateway mode requires a TLS certificate, its owner-only private key, and
exactly one bearer-token source. The token can be passed through
`HERTZBEAT_OTLP_GATEWAY_TOKEN`, or read from an owner-only local file so the
official bearer-token extension can reload it without restarting the runtime.
The certificate and secret file locations are local Collector configuration;
they are never accepted as server-managed desired configuration. Spring's
relaxed environment binding supports these local values:

```shell
export HERTZBEAT_OTLP_GATEWAY_ENABLED=true
export HERTZBEAT_OTLP_GRPC_LISTEN_ENDPOINT=0.0.0.0:4317
export HERTZBEAT_OTLP_HTTP_LISTEN_ENDPOINT=0.0.0.0:4318
export COLLECTOR_OTEL_RUNTIME_OTLP_GATEWAY_CERTIFICATE_FILE=/etc/hertzbeat/gateway.crt
export COLLECTOR_OTEL_RUNTIME_OTLP_GATEWAY_PRIVATE_KEY_FILE=/etc/hertzbeat/gateway.key
export COLLECTOR_OTEL_RUNTIME_OTLP_GATEWAY_BEARER_TOKEN_FILE=/etc/hertzbeat/gateway.token
```

Set `COLLECTOR_OTEL_RUNTIME_OTLP_GATEWAY_CLIENT_CA_FILE` to a trusted client CA
to require mTLS in addition to the bearer token. The private key and token file
must not be readable or writable by group or other users on POSIX systems.
Transport timeouts, the 4 MiB body limit, the persistent 2,048-request export
queue, and the shared memory admission budget remain bounded in both modes.
The default 256 MiB runtime memory budget can be locally tuned within enforced
limits; all active sources and incoming OTLP pipelines use the same limiter.

Prometheus targets are bounded server-managed intent. File-log paths are
resolved from administrator-owned local profiles, so a remote configuration
cannot expand the Collector host's filesystem access. For example:

```yaml
collector:
  otel-runtime:
    prometheus-targets:
      - name: payments
        endpoint: https://127.0.0.1:9464/metrics
        interval: 30s
        timeout: 5s
        header-secret-refs:
          X-Scrape-Token: payments-token
        tls-ca-profile: payments-ca
    # Values and local certificate paths are never part of server-managed intent.
    prometheus-header-secrets:
      payments-token: ${PAYMENTS_PROMETHEUS_TOKEN}
    prometheus-tls-ca-profiles:
      payments-ca: /etc/hertzbeat/certs/payments-ca.pem
    file-log-allow-roots:
      - /var/log/payments
    file-log-deny-paths:
      - /var/log/payments/private
    file-log-profiles:
      payments-logs:
        - /var/log/payments/*.log
    file-log-sources:
      - name: payments
        path-profile: payments-logs
    environment: staging
    resource-detectors:
      - ENV
      - SYSTEM
    telemetry-filter-presets:
      - HEALTH_CHECK_TRACES
```

## Current limits

- Prometheus supports at most 32 bounded static HTTP(S) targets. Scrapes have
  fixed sample, label and response-size ceilings; optional headers refer to
  local secrets and HTTPS trust refers to a local CA profile. Neither value is
  stored in server-managed intent.
- File logs use local path profiles, start at the end by default, preserve
  offsets across restart, and handle rename rotation and copytruncate. Policy
  rejects traversal, recursive globs, denied paths, symlink escapes, more than
  16 patterns, or more than 256 existing matches before runtime validation.
  Runtime concurrency, polling batches and line size are also bounded.
- File offsets and the bounded downstream exporter queue use the same
  owner-only `file_storage` directory.
- The local control surface is the versioned loopback health contract. Managed
  desired configuration uses the existing HertzBeat heartbeat channel; OpAMP
  is not included.
- The manual `Hybrid Collector Release Gate` workflow builds the Java Native
  Collector on Linux amd64/arm64, macOS amd64/arm64, and Windows amd64. Linux
  packages include the reviewed systemd unit; the multi-platform container uses
  the native foreground launcher and runs as the `hertzbeat` user.
- Automated license classification, SBOMs, vulnerability checks, checksums, and
  Go binary reproducibility are release inputs, not a substitute for the Apache
  release manager's LICENSE/NOTICE review, artifact signing, and vote.
