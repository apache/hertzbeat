---
id: native-collector
title: Native Hybrid Collector
sidebar_label: Native Hybrid Collector
---

The native Hybrid Collector is a platform-specific Collector executable with its managed OTel runtime assets. It is separate from the HertzBeat Server archive and from a language agent such as the OTel Java agent. A native package does not imply that every JVM collection protocol or native platform has been validated.

## Choose and verify an artifact

Use a Collector native archive produced from the intended source revision for the exact OS/architecture. Record its digest and declared platform. The source assembly is `script/assembly/collector/assembly-native.xml`; it includes the executable, launchers, configuration, licenses, platform runtime, manifests and SBOM/checksum files. A filename alone is not provenance.

From the source checkout, the existing package contract can inspect a declared archive:

```shell
sh script/ci/verify-hybrid-collector-native-package.sh "$COLLECTOR_ARCHIVE" "$COLLECTOR_PLATFORM"
```

Set both variables to your actual artifact and its platform name (for example `linux-arm64`). This checks package contents; it does not run or certify a target deployment. Building native code requires the repository's Java 25/GraalVM and native build prerequisites; running a verified native executable does not require installing a JVM on the target. Do not reuse a binary built for another architecture.

## Configure and launch deliberately

Start from the archive's `config/application.yml`. Set a unique `IDENTITY`, the correct `MANAGER_HOST` and manager cluster port (`MANAGER_PORT`, normally `1158`). The Server public HTTP endpoint and Collector cluster endpoint have different purposes. Agentless targets must be reachable from this collector.

The managed OTel runtime is opt-in (`HERTZBEAT_OTEL_RUNTIME_ENABLED` defaults to false). Use the matching Collector intake profile and generated instructions for endpoint, token and collector identity. Preserve its data directory for identity, queues and offsets. Language agents/SDKs are provisioned separately; the package does not bundle them.

On Unix, inspect a first launch in the foreground from the extracted archive:

```shell
./bin/foreground.sh
```

This launcher executes the packaged native binary and forwards additional application arguments. Inspect logs, registration and actual current samples. `bin/startup.sh` is a background helper: with `lsof`, it only reports listener success for the launched PID on the helper’s fixed port `1159`; without `lsof`, it reports process launch with **readiness unverified**. Neither a live process nor a TCP listener proves that telemetry reached storage.

## Linux service lifecycle and state

Linux native archives include `service/install-systemd.sh` and `service/README-systemd.md`. Follow that included version's instructions for installation/upgrade. The layout separates releases under `/opt/hertzbeat-collector`, protected configuration under `/etc/hertzbeat`, persistent state under `/var/lib/hertzbeat-collector` and logs under `/var/log/hertzbeat-collector`. Keep credentials in protected configuration/environment files, not command arguments.

The installer provides `install`, `upgrade`, `uninstall` and explicit `purge` operations. Uninstall preserves state; purge is destructive. Back up configuration and state before an upgrade and validate restored identity and sample continuity. Do not infer successful rollback from a script exit alone.

## Acceptance boundary

The 2.0 alpha local release proof exercised the Server on H2/MySQL/PostgreSQL, Agentless MySQL and an official OTel Java agent. It did not establish a full native Collector OS/protocol matrix, fleet scale or an SLO. Verify the chosen platform, managed-runtime lifecycle, authentication failure, stopped reporting and recovery with actual signals before using it as a verified source. Windows packages use their included batch launchers; Unix/systemd results do not establish Windows parity.

See [Server installation](./package-deploy.md) for the separate Server setup and [collector governance proposal](../roadmap/future-collector-fleet-governance.md) for future fleet work.
