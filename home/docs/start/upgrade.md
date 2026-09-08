---
id: upgrade  
title: HertzBeat New Version Upgrade
sidebar_label: Version Upgrade Guide
---

**HertzBeat Release Version List**

- [Download Page](https://hertzbeat.apache.org/docs/download)
- [Github Release](https://github.com/apache/hertzbeat/releases)
- [DockerHub Release](https://hub.docker.com/r/apache/hertzbeat/tags)

Apache HertzBeat's metadata information is stored in H2 or Mysql, PostgreSQL relational databases, and the collected metric data is stored in time series databases such as TDengine and IotDB.

**You need to save and back up the data files of the database and monitoring templates yml files before upgrading**

## Breaking Changes In 1.9.0

### SFTP monitors require an explicit host-key policy

From 1.9.0 on, every SFTP monitor must carry an explicit host-key policy: either
one or more trusted `SHA256:...` host-key fingerprints, or the operator explicitly
selecting the dangerous temporary skip-verification option.

This is a fail-closed breaking change. HertzBeat does not automatically enable
skip verification for 1.8.x monitors, imports, or direct API/SQL-created rows.
Before or immediately after upgrading, edit each SFTP monitor and:

1. obtain the server key and verify its fingerprint through a trusted channel;
2. add the verified fingerprint to **SFTP Host Key Fingerprints**; and
3. use the skip-verification option only as a short-lived recovery measure.

Until one of those policies is configured, the affected SFTP monitor reports a
configuration failure and does not connect. Plain FTP monitors are unchanged.
See [FTP Monitor](../help/ftp) for fingerprint acquisition and key rotation.

### Observability (OTLP / logs / traces) API paths moved

1.9.0 consolidates the 1.8.x log module into `hertzbeat-observability`. Metrics, logs and traces now share one ingestion prefix (`/api/otlp/v1/{signal}`) and one query prefix (`/api/observability/**`). Logs were the only signal with an API on 1.8.x, so every row below is a **log** route. Any OpenTelemetry Collector, Vector, SDK exporter, script or dashboard that was configured against a 1.8.x path must be updated.

| 1.8.x path | 1.9.0 path | Status in 1.9.x |
|---|---|---|
| `POST /api/logs/otlp/v1/logs` | `POST /api/otlp/v1/logs` | **Deprecated alias kept**, still works, responds with `Deprecation: true`; removed in 2.0 |
| `POST /api/logs/ingest/otlp` | `POST /api/otlp/v1/logs` | **Deprecated alias kept**, still works, responds with `Deprecation: true`; removed in 2.0 |
| `POST /api/logs/ingest/{other protocol}` | — | Removed (`400`), only `otlp` ever had an adapter |
| `GET /api/logs/list` | `GET /api/observability/logs` | Removed (`404`) |
| `GET /api/logs/stats/overview` | `GET /api/observability/logs/overview` | Removed (`404`) |
| `GET /api/logs/stats/trace-coverage` | `GET /api/observability/logs/trace-coverage` | Removed (`404`) |
| `GET /api/logs/stats/trend` | `GET /api/observability/logs/trend` | Removed (`404`) |
| `GET /api/logs/sse/subscribe` | `GET /api/observability/logs/stream` | Removed (`404`); the new route requires an authenticated `admin/user/guest` |
| `DELETE /api/logs` | `DELETE /api/observability/logs` | Removed (`404`) |

The `POST /api/otlp/v1/{metrics,traces}` ingestion routes and the `/api/observability/metrics/**` and `/api/observability/traces/**` query routes are **new** in 1.9.0. There is no 1.8.x path for them, so nothing has to be migrated.

Recommended upgrade steps:

- Before upgrading, search your collector / exporter configuration for `/api/logs/` and change it to `/api/otlp/v1/logs`. OTLP HTTP exporters treat a `404` as a permanent error and silently drop the batch, so a stale path shows up only as "logs stopped arriving".
- If you cannot change the exporters in the same maintenance window, the two ingestion aliases above keep accepting data on 1.9.x. Watch the HertzBeat log for `Deprecated OTLP log route ... was called` warnings and migrate before 2.0.
- If you use a customised `sureness.yml`, add `/api/otlp/v1/**===post===[admin,user]` and `/api/observability/**===get===[admin,user,guest]` (see the packaged `sureness.yml`); the old `/api/logs/**` rules can be dropped once your exporters are migrated.

### New OTLP/gRPC listener on port 14317

When `warehouse.store.greptime.enabled=true`, 1.9.0 additionally starts an OTLP/gRPC listener on
`0.0.0.0:14317` inside the HertzBeat container so exporters can push metrics, logs and traces over
gRPC. The packaged Dockerfile exposes that container port. The repository's five Docker Compose
quick-start variants publish it as host port `14317`, bound to `127.0.0.1` by default.

- **It is not the OpenTelemetry standard 4317.** An OTel Collector, Jaeger or Tempo on the same host
  normally holds 4317 already, and a clash on a published port makes `docker compose up` fail
  outright. HertzBeat serves OTLP/HTTP on its own port as well, so 14317 is consistent with the rest
  of the product.
- Existing non-Compose deployments gain one newly bound port. If your firewall or security policy
  enumerates listening ports, add 14317.
- Every 1.9.0 Docker Compose quick-start now binds all published ports to `127.0.0.1` by default,
  including `1157`, `1158`, `14317`, and the development database/time-series ports. Upgrading an
  older Compose checkout therefore preserves local access but intentionally stops remote browser,
  Collector, OTLP, and datastore access until explicitly configured.
- For a remote Collector, copy the selected variant's `.env.example` to `.env`, set
  `HERTZBEAT_BIND_ADDRESS` to the manager's reachable address, and allow `1158` only from Collector
  source networks. This setting also controls `1157`; prefer a TLS reverse proxy for remote web/API
  access. Set `HERTZBEAT_OTLP_BIND_ADDRESS` separately only for trusted OTLP senders. Before using a
  wildcard address, replace default credentials and apply firewall or security-group restrictions.
  Render `docker compose config` and inspect every final host binding before restarting.
- A port that cannot be bound does **not** stop HertzBeat: the failure is logged and the process
  starts without gRPC ingestion, while OTLP/HTTP on `/api/otlp/v1` keeps working.
- To move the listener to 4317, or disable it, set these in `application.yml` or through the matching
  environment variables, and update the docker-compose port mapping to match:

  ```yaml
  hertzbeat:
    otlp:
      grpc:
        enabled: ${HERTZBEAT_OTLP_GRPC_ENABLED:true}
        host: ${HERTZBEAT_OTLP_GRPC_HOST:0.0.0.0}
        port: ${HERTZBEAT_OTLP_GRPC_PORT:14317}
  ```

- If you deploy with the Helm chart, note that the chart is maintained in `apache/hertzbeat-helm-chart`;
  check that its release exposes 14317 before relying on gRPC ingestion there.

### GreptimeDB signal tables renamed

When `warehouse.store.greptime.enabled=true`, HertzBeat writes two different kinds of telemetry to GreptimeDB: the logs **you** send it over OTLP, and its **own** runtime logs and traces shipped via OpenTelemetry. 1.9.0 gives the self-monitoring tables an `hzb_internal_` prefix so they are no longer mistaken for product tables:

| Data | 1.8.x table | 1.9.0 table |
|---|---|---|
| Product OTLP logs (the logs page, log alerting, SQL editor) | `hertzbeat_logs` | `hertzbeat_logs` (same name, but the `body` column type changed — see below) |
| HertzBeat internal logs (self-monitoring) | `hzb_logs` | `hzb_internal_logs` |
| HertzBeat internal traces (self-monitoring) | `hzb_traces` | `hzb_internal_traces` |
| Product OTLP traces (the traces page, trace queries) | not available on 1.8.x | `hertzbeat_traces` (new) |

- **1.8.x had no product trace support**: no trace ingestion route, no trace query API and no traces page, so `hzb_traces` holds nothing but HertzBeat's own spans. Tracing is new in 1.9.0 and there is no historical business trace data to migrate.
- No automatic migration is performed. The old `hzb_logs` / `hzb_traces` tables are left untouched but no longer receive new data, and stay queryable until their retention expires. This is self-monitoring history, so the simplest option is to let it age out and `DROP` the old tables afterwards.
- If you do need that history in the new tables, compare the two schemas first and copy with an explicit column list. GreptimeDB adds columns to an OTLP table as new attributes arrive, so the old and the new table are not guaranteed to hold the same columns in the same order, and `INSERT ... SELECT *` fails with `Column count doesn't match insert query`.
- If you have dashboards or ad-hoc SQL against `hzb_logs` / `hzb_traces`, point them at the new table names.

### The body column of hertzbeat_logs changed type

The `hertzbeat_logs` table keeps its name, but 1.8.x created `body` as a `JSON` column and 1.9.0 writes it as `STRING`. The 1.9.0 schema is applied with `CREATE TABLE IF NOT EXISTS`, which is a no-op against the table 1.8.x already created, so **after a plain upgrade GreptimeDB rejects every new log write**: the exporter still receives a 200, the server logs a single `[warehouse greptime-log] Write failed` warning, the UI just stops showing new logs, and log-based alerting stops with it.

Rename the old table before upgrading, let 1.9.0 create the new one, then copy the history back. Do **not** run `ALTER TABLE ... MODIFY COLUMN`. The full procedure is in the [1.9.0 upgrade guide](1.9.0-update).

## Upgrade For Docker Deploy

1. If using custom monitoring templates
   - Need to back up docker templates directory `docker cp hertzbeat:/opt/hertzbeat/define ./define` in the container `/opt/hertzbeat/define`
   - `docker cp hertzbeat:/opt/hertzbeat/define ./define`
   - And mount the template define directory when docker start `-v $(pwd)/define:/opt/hertzbeat/define`
   - `-v $(pwd)/define:/opt/hertzbeat/define`
2. If using the built-in default H2 database
   - Need to mount or back up `-v $(pwd)/data:/opt/hertzbeat/data` database file directory in the container `/opt/hertzbeat/data`
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation of HertzBeat](./docker-deploy) to create a new container using a new image. Note that the database file directory needs to be mounted `-v $(pwd)/data:/opt/hertzbeat/data`
3. If using external relational database Mysql, PostgreSQL
   - No need to mount the database file directory in the backup container
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation HertzBeat](./docker-deploy) to create a new container using the new image, and configure the database connection in `application.yml`

### Upgrade For Package Deploy

1. If using the built-in default H2 database
   - Back up the database file directory under the installation package `/opt/hertzbeat/data`
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](./package-deploy) to start using the new installation package
2. If using external relational database Mysql, PostgreSQL
   - No need to back up the database file directory under the installation package
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](./package-deploy) to start with the new installation package and configure the database connection in `application.yml`

**HAVE FUN**
