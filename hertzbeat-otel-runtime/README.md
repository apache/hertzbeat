# HertzBeat Managed Telemetry Runtime

This module builds the private OpenTelemetry data-plane process supervised by
the Java HertzBeat Collector. It is not a second HertzBeat Collector and must
not register a separate Collector identity.

The managed runtime contains host metrics, explicitly managed Prometheus
targets, locally approved file-log profiles with persistent offsets, memory
protection, resource enrichment, batching, direct OTLP/HTTP export, and a
loopback health endpoint.
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

Prometheus targets are bounded server-managed intent. File-log paths are
resolved from administrator-owned local profiles, so a remote configuration
cannot expand the Collector host's filesystem access. For example:

```yaml
collector:
  otel-runtime:
    prometheus-targets:
      - name: payments
        endpoint: http://127.0.0.1:9464/metrics
        interval: 30s
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
```

## Current limits

- Prometheus supports bounded static HTTP(S) targets. File logs use local path
  profiles, start at the end by default, and reject traversal, recursive globs,
  denied paths, and symlink escapes before runtime validation.
- File offsets use `file_storage`; downstream exporter persistence is not yet
  enabled and belongs to the release-hardening milestone.
- The local control surface is the versioned loopback health contract. Remote
  configuration and OpAMP are not included.
- The manual `Hybrid Collector Release Gate` workflow builds the Java Native
  Collector on Linux amd64/arm64, macOS amd64/arm64, and Windows amd64. Linux
  packages include the reviewed systemd unit; the multi-platform container uses
  the native foreground launcher and runs as the `hertzbeat` user.
- Automated license classification, SBOMs, vulnerability checks, checksums, and
  Go binary reproducibility are release inputs, not a substitute for the Apache
  release manager's LICENSE/NOTICE review, artifact signing, and vote.
