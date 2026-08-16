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
