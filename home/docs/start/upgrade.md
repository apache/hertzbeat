---
id: upgrade
title: HertzBeat 2.0 Alpha Upgrade Boundaries
sidebar_label: Version Upgrade Guide
---

HertzBeat 2.0 is an alpha/community preview. A new package is not evidence that an arbitrary older database can be upgraded in place. Keep the original installation and a verified backup until the new installation has passed its own checks.

## Supported boundary

Local acceptance covered fresh H2, MySQL 8.4 and PostgreSQL 17 metadata installations, restart and native metadata backup/restore, plus a stopped single-node GreptimeDB 1.1.4 data-store backup/restore. It did not establish an online/distributed backup procedure, every historical 1.x upgrade path, or downgrade compatibility.

Earlier alpha snapshots may have different **V200** migration contents. Use a fresh database when evaluating such snapshots. Do not edit migration history, run Flyway checksum repair or copy new table definitions into a running old database to make the startup gate pass. A supported migration needs an explicit, tested path for its exact source and target versions.

For H2, retain the packaged JDBC compatibility option: `jdbc:h2:./data/hertzbeat;MODE=MYSQL`.

## Back up each responsibility

| Data | What to retain |
|---|---|
| H2 metadata | Stop HertzBeat cleanly, then copy the complete relevant database files. Never copy a live H2 file as a consistent backup. |
| MySQL/PostgreSQL metadata | Take and verify a native database backup, including account, monitor, entity, alert, dashboard, saved-query and migration state. External storage still requires a backup. |
| Telemetry | Back up Greptime separately using a procedure appropriate to its deployment. The alpha cold-copy proof required all writers stopped and a cleanly stopped single-node store; it is not an online backup guarantee. |
| Installation state | Preserve `config`, `data/config`, required secret material, customized `define` templates and any intentionally supplied `ext-lib` drivers. Protect file ownership and permissions. |
| Provenance | Retain the exact old/new artifact digests, versions, configuration choices and backup manifests. Keep private configuration and data outside public commits or issue attachments. |

Test restoration into an isolated destination before replacing the original. A metadata backup does not contain telemetry, and dashboard/query JSON exports do not replace a complete metadata backup.

## Package or container transition

1. Read the release-specific compatibility notes and verify the selected artifact.
2. Quiesce application emitters and any writers relevant to the backup; stop the old HertzBeat process cleanly. For packages, use `bin/shutdown.sh` and verify the process has stopped.
3. Complete and verify the backups above. Preserve the original installation or container volumes.
4. Extract the new package into a separate directory, or use the selected immutable container image with explicit volumes. Do not mix JARs from different builds. Follow [installation and Setup](package-deploy.md); use a fresh database where this alpha requires one.
5. Review operator overrides rather than copying an old full `application.yml` over the new package's imports. Reapply intentional settings and custom templates with their compatibility checked.
6. Verify login, monitor configuration and collection after restart, entity identities, alert rules/notices, saved queries and dashboards. Query a fixed telemetry window and compare real records. Exercise save/cancel and stale Dashboard revision rejection as applicable.
7. Resume emitters and verify new samples. Trigger and recover an isolated alert with a real notification destination before relying on delivery.

Monitor scheduler job IDs and the monitor's update timestamp can change during normal restart because the scheduler creates a new job and persists its binding. This does not justify ignoring changes to monitor configuration, IDs, parameters or other metadata.

For rollback, stop the new writer and restore the matching old artifact, configuration and verified data backup. Replacing only the binary against a changed schema is not a verified rollback.

## Saved queries and Dashboards

Saved queries and Dashboards remain installation-shared assets with existing administrator/user write permissions. Reopening or listing historical records does not silently rewrite them.

- Current saved queries store a versioned query document, preserving relative or exact time mode. Payload and legacy query snapshots are limited to 65,535 UTF-8 bytes. Convertible old routes can be reopened; invalid or unsupported records remain available for raw export rather than being overwritten.
- New Dashboards use the supported standard Perses document as their content source. Native revisions reject stale updates/deletes. Only a recognized, empty legacy composition with lossless metadata can be upgraded automatically on an explicit save; nonempty legacy widget/draft references are not reconstructed into guessed queries. See the [Dashboard guide](../help/perses_dashboard.md).
- Some older alpha PostgreSQL saved-query rows contain large-object OID strings in TEXT columns. The corrected mapping does not dereference or migrate those historical strings automatically. Keep the database backup and original large objects. Recovery requires an explicit offline conversion validated against the old database; a numeric string must not be treated as a valid query document.

MySQL requires keyword quoting for the saved-view `signal` column. The native configuration handles the supported MySQL datasource/dialect path and preserves explicit operator settings. Setting `hibernate.auto_quote_keyword=false` can prevent that path from working; a custom datasource without a Boot datasource URL needs an explicit dialect. Do not change schema identifiers to compensate.

## Identity and evidence

Automatic service attribution now requires meaningful service-name or instance evidence and rejects known contradictory service scope. Namespace/environment alone cannot attach unrelated telemetry to a service. This affects newly ingested data; previously stored attribution is not automatically rewritten. Workspace-validated explicit manual identity hints are a separate contract.

Keep installation, restart, metadata restore and telemetry restore evidence distinct. Local success does not establish GA readiness, scale performance, an SLO, or complete parity with previous frontends or other observability products.
