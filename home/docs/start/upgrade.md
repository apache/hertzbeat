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

1.9.0 stops accepting any SFTP server key by default. Every SFTP monitor must
either pin one or more trusted `SHA256:...` host-key fingerprints or explicitly
select the dangerous temporary skip-verification option.

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

1.9.0 consolidates the 1.8.x log module into `hertzbeat-observability`. Metrics, logs and traces now share one ingestion prefix (`/api/otlp/v1/{signal}`) and one query prefix (`/api/observability/**`). Any OpenTelemetry Collector, Vector, SDK exporter, script or dashboard that was configured against a 1.8.x path must be updated.

| 1.8.x path | 1.9.0 path | Status in 1.9.x |
|---|---|---|
| `POST /api/logs/otlp/v1/logs` | `POST /api/otlp/v1/logs` | **Deprecated alias kept**, still works, responds with `Deprecation: true`; removed in 2.0 |
| `POST /api/logs/ingest/otlp` | `POST /api/otlp/v1/logs` | **Deprecated alias kept**, still works, responds with `Deprecation: true`; removed in 2.0 |
| `POST /api/logs/ingest/{other protocol}` | — | Removed (`400`), only `otlp` ever had an adapter |
| `GET /api/logs/list` | `GET /api/observability/logs` | Removed (`404`) |
| `GET /api/logs/stats/overview` | `GET /api/observability/logs/overview` | Removed (`404`) |
| `GET /api/logs/stats/trace-coverage` | `GET /api/observability/logs/trace-coverage` | Removed (`404`) |
| `GET /api/logs/stats/trend` | `GET /api/observability/logs/trend` | Removed (`404`) |
| `GET /api/logs/sse/subscribe` | `GET /api/observability/logs/stream` | Removed (`404`); the new route requires an authenticated `admin/user/guest` instead of anonymous access |
| `DELETE /api/logs` | `DELETE /api/observability/logs` | Removed (`404`) |
| `GET /api/traces/**` | `GET /api/observability/traces/**` | Removed (`404`) |
| `GET /api/ingestion/otlp/metrics/console` | `GET /api/observability/metrics/query` | Removed (`404`) |
| `GET /api/ingestion/otlp/metrics/inventory` | `GET /api/observability/metrics/inventory` | Removed (`404`) |

Recommended upgrade steps:

- Before upgrading, search your collector / exporter configuration for `/api/logs/` and change it to `/api/otlp/v1/logs`. OTLP HTTP exporters treat a `404` as a permanent error and silently drop the batch, so a stale path shows up only as "logs stopped arriving".
- If you cannot change the exporters in the same maintenance window, the two ingestion aliases above keep accepting data on 1.9.x. Watch the HertzBeat log for `Deprecated OTLP log route ... was called` warnings and migrate before 2.0.
- If you use a customised `sureness.yml`, add `/api/otlp/v1/**===post===[admin,user]` and `/api/observability/**===get===[admin,user,guest]` (see the packaged `sureness.yml`); the old `/api/logs/**`, `/api/traces/**` and `/api/ingestion/otlp/**` rules can be dropped once your exporters are migrated.

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

When `warehouse.store.greptime.enabled=true`, HertzBeat writes two different kinds of telemetry to GreptimeDB: the traces and logs **you** send it over OTLP, and its **own** runtime logs and traces shipped via OpenTelemetry. On 1.8.x both kinds of traces landed in the same `hzb_traces` table. 1.9.0 separates them, which renames one product table and both self-monitoring tables:

| Data | 1.8.x table | 1.9.0 table |
|---|---|---|
| Product OTLP traces (the traces page, trace queries) | `hzb_traces` | `hertzbeat_traces` |
| Product OTLP logs (the logs page, log alerting, SQL editor) | `hertzbeat_logs` | `hertzbeat_logs` (unchanged) |
| HertzBeat internal logs (self-monitoring) | `hzb_logs` | `hzb_internal_logs` |
| HertzBeat internal traces (self-monitoring) | `hzb_traces` | `hzb_internal_traces` |

- **The traces page will be empty for data ingested before the upgrade.** 1.9.0 creates `hertzbeat_traces` and queries only that table, so spans written to `hzb_traces` on 1.8.x are no longer visible in the UI until you copy them over.
- The product log table `hertzbeat_logs` is **not** renamed; historical logs ingested on 1.8.x remain queryable with no action needed.
- No automatic migration is performed. The old `hzb_logs` / `hzb_traces` tables are left untouched but no longer receive new data. Once 1.9.0 has created the new tables you can copy the history manually, for example:

  ```sql
  INSERT INTO hzb_internal_logs SELECT * FROM hzb_logs;
  ```

  Copying traces needs more care, because `hzb_traces` holds your spans and HertzBeat's own spans mixed together. Filter by service so the self-monitoring spans do not end up in the product table:

  ```sql
  -- keep only your own services; HertzBeat's self-telemetry uses service.name = 'HertzBeat'
  INSERT INTO hertzbeat_traces SELECT * FROM hzb_traces WHERE service_name <> 'HertzBeat';
  INSERT INTO hzb_internal_traces SELECT * FROM hzb_traces WHERE service_name = 'HertzBeat';
  ```

  Otherwise you can `DROP` the old tables when the retention no longer matters.
- If you have dashboards or ad-hoc SQL against `hzb_logs` / `hzb_traces`, point them at the new table names.

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

## AI Schedule Ownership After Upgrade

AI conversations without a recorded creator are isolated and do not appear in
any user's conversation list. Scheduled AI SOP tasks are owned by the creator
of their target conversation. During upgrade, schedules without a recorded
creator are disabled. Schedules without a target conversation or whose creator
does not match the conversation creator are disabled before they can execute.
The records remain in the database so an administrator can recover them after
verifying the intended owner.

Ownerless schedules are disabled by the database migration. Missing
conversations and creator mismatches are rechecked and disabled before every
background execution.

Before re-enabling a legacy schedule:

1. Back up the metadata database.
2. Verify the owner of the target row in `hzb_ai_conversation`.
3. Set the same verified principal in the conversation and schedule `creator`
   columns.
4. Re-enable only the reviewed schedule.

Do not assign all legacy rows to a shared account. A schedule is executed only
while its stored creator still owns the target conversation; ownership
mismatches are disabled automatically.

**HAVE FUN**
