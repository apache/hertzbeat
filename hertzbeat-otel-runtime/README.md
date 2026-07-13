# HertzBeat Managed Telemetry Runtime

This module builds the private OpenTelemetry data-plane process supervised by
the Java HertzBeat Collector. It is not a second HertzBeat Collector and must
not register a separate Collector identity.

Phase 0 intentionally contains only host metrics, memory protection, resource
enrichment, batching, direct OTLP/HTTP export, and a loopback health endpoint.
The Java process owns configuration, validation, lifecycle, recovery, and the
single Collector identity. The Go process exports telemetry directly to the
HertzBeat Server and never proxies data through Java.

## Build and validate

Go 1.25 or newer is required.

```shell
make validate
make build-platforms
../script/ci/verify-otel-runtime-package-layout.sh
```

Generated sources, binaries, and release archives remain local under `_build`,
`dist`, and the repository-level `dist` directory. They must not be committed.

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

## Phase 0 limits

- Only host metrics are enabled; Prometheus, file logs, and persisted queues
  belong to later milestones.
- The local control surface is the versioned loopback health contract. Remote
  configuration and OpAMP are not included.
- Release publication still requires the Apache dependency license review,
  NOTICE updates, SBOM generation, vulnerability scanning, checksums, signing,
  and reproducibility checks for the final release environment.
