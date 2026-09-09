---
id: 1.9.0-update
title: How to update to 1.9.0
sidebar_label: Update to 1.9.0 guide
---

## HertzBeat 1.9.0 Upgrade Guide

:::danger This release contains breaking changes
1.9.0 is **not** a drop-in replacement for the 1.8.x jar or image. The runtime, the configuration file, the authorization rules, the collector credential format, the GreptimeDB table schema and several alerting semantics all changed incompatibly. Read this guide in full before you start.
:::

:::note
This guide applies to an upgrade from a **released 1.8.x** to a released 1.9.0.
On 1.6.x / 1.7.x, first upgrade step by step to 1.8.x using the [1.7.0 upgrade guide](1.7.0-update) and the guides for the versions in between, verify that it runs, and only then use this guide.
:::

Follow the [HertzBeat New Version Upgrade](upgrade)

## Am I Affected? Quick Check

| Your deployment or usage | Sections to read |
|---|---|
| Installation package | [Runtime](#runtime), [Manager configuration](#manager-configuration-applicationyml), [Authorization rules](#authorization-rules-surenessyml) |
| Docker / Docker Compose | [Manager configuration](#manager-configuration-applicationyml), [Authorization rules](#authorization-rules-surenessyml), [Docker Compose](#docker-compose) |
| Helm | [Helm deployments](#helm-deployments); do not just override the image tag on a chart that has not been adapted |
| GreptimeDB enabled | [GreptimeDB](#greptimedb-only-when-enabled); skipping this stops log ingestion |
| Remote collectors deployed | [Collectors](#collectors); they must reach 1.9.0 before the manager does |
| SFTP, Synology, NVIDIA, Redis Sentinel or push style monitors | [Monitors](#monitors) |
| Scheduled thresholds, silences or group convergence | [Alerting and notification](#alerting-and-notification) |
| Scripts or third-party systems calling the HertzBeat API | [API consumers](#api-consumers) |
| Third-party jars in `ext-lib/`, or the template marketplace deployed | [Dependencies](#dependencies-and-third-party-components), [Removed features](#removed-features) |
| Your own plugins | [Plugin developers](#plugin-developers) |

## Recommended Order and Maintenance Window

There is no fixed dependency between the collectors and GreptimeDB, but both must be ready before manager 1.9.0 starts. The recommended order:

1. Use the quick check above to identify every applicable section and rehearse in a test environment. Download and stage the 1.9.0 package, Java 25 and the new `application.yml` and `sureness.yml`, without overwriting the running 1.8.x files yet.
2. Before changing production data, upgrading a component or replacing a file, back up the configuration and deployment files listed in the next section and record the current version of every component.
3. While 1.8.x is still running, complete the actions that must happen in advance: delete push style monitors and their custom templates, review scheduled alert rules, rename hostless monitors where needed, clean up duplicate bulletin names, export templates from the marketplace, and remove conflicting old dependencies from `ext-lib/`.
4. With remote collectors, upgrade them to 1.9.0 one by one first. A 1.9.0 collector works against a 1.8.x manager, so this step usually needs no manager downtime.
5. Enter the maintenance window: stop the manager, and pause every sender that writes HertzBeat product logs to that GreptimeDB, directly or indirectly. Stop the collectors too if you want to avoid continuous retries.
6. Now that writes have stopped, take consistent backups or snapshots of the metadata database and GreptimeDB.
7. With GreptimeDB enabled, follow the staged upgrade path in this guide and rename the old `hertzbeat_logs` table.
8. Replace the whole manager installation, merge the new configuration and authorization rules, then start manager 1.9.0. With external writes still paused, copy the log history back and verify it after the new table has been created.
9. Resume one sender in a controlled manner, or send one test log, and work through the [post-upgrade checks](#post-upgrade-checks). Resume all external writers and close the window only after they pass.

:::caution Downtime
The manager is unavailable from step 5 until it starts successfully in step 8. Collectors can be upgraded ahead of the window. Product log writes must stay stopped while GreptimeDB is upgraded, the table is renamed, the manager is switched over and the log history is copied back. The actual duration depends on the staged GreptimeDB upgrade, any volume restore and the history copy. Resume all senders only after a controlled new-log check succeeds.
:::

## Backups Before Upgrading

Backups happen in two stages. **Before making any change**, preserve:

1. HertzBeat and collector files: `define/`, `ext-lib/`, `config/`, plus any externally mounted `application.yml`, `sureness.yml`, certificates and key files.
2. Container deployment files: `.env`, the compose file you actually use and any local edits to it; for Kubernetes, the ConfigMaps, Secrets, values files and mount declarations.
3. A record of the current 1.8.x package or image tag, every collector version and the GreptimeDB version, so the same artifacts can still be obtained if you need to roll back.

After entering the maintenance window and stopping the related writes, take these **consistent backups**:

1. The metadata database: the complete `data/` directory for H2, or a consistent dump of MySQL / PostgreSQL.
2. With GreptimeDB enabled: the complete data directory, Docker volume or external storage snapshot. This backup must be restorable together with the GreptimeDB version you were running before the upgrade.

Do not overwrite or delete these backups until the upgrade is complete. Rehearsing both the upgrade and the rollback is strongly recommended if you use GreptimeDB, scheduled alert rules or a customised `sureness.yml`.

## Runtime

### Java 25

1.9.0 raises the Java runtime requirement from Java 17 to **Java 25**. As in 1.8.x, the generic installation package does not bundle a JDK.

- The default Java on the server is already 25: nothing to do.
- The default Java is not 25 (for example 8, 11, 17 or 21) and no other application depends on it: install Java 25 and point the environment variable at it.
- Other applications depend on the older Java: download Java 25, rename the extracted folder to `java` and place it in the HertzBeat installation directory. The startup script prefers it.

The Docker images are now based on `eclipse-temurin:25-jdk`, so Docker users need no action.

### Package layout

The startup scripts now put `lib/*` and `ext-lib/*` on the classpath explicitly instead of relying on the jar manifest. **Replace the whole installation directory**; do not swap only the main jar.

### Collector image path

The collector image working directory moved from `/opt/apache-hertzbeat-collector-<version>-bin/` to the fixed `/opt/hertzbeat-collector/`. Update every volume or Kubernetes ConfigMap mount that targets `config/`, `logs/` or `ext-lib/`.

## Manager Configuration: application.yml

### JPA provider switched from EclipseLink to Hibernate

This is the easiest change to miss and the most immediate failure. **Keeping the 1.8.x `application.yml` prevents the manager from starting.** Replace the whole `spring.jpa` block according to your database.

1.8.x form (remove it):

```yaml
spring:
  jpa:
    show-sql: false
    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
    database: h2
    properties:
      eclipselink:
        logging:
          level: SEVERE
```

1.9.0 form, H2:

```yaml
spring:
  jpa:
    show-sql: false
    database: h2
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
        format_sql: true
```

MySQL:

```yaml
spring:
  jpa:
    show-sql: false
    database: mysql
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
```

PostgreSQL:

```yaml
spring:
  jpa:
    show-sql: false
    database: postgresql
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
```

:::caution
`hibernate.ddl-auto: update` is mandatory. Tables and columns new in 1.9.0 (such as `hzb_auth_token` and the ntfy fields on notice receivers) are created by Hibernate. Without it the manager starts, but those features fail at runtime with SQL errors.
:::

The Flyway migration new in 1.9.0 runs automatically at startup and needs no manual action. One of its statements has a visible effect:

- It widens `hzb_alert_define.expr` to a large-text type (`TEXT` on PostgreSQL, `LONGTEXT` on MySQL, `CLOB` on H2), so expressions binding many monitors are no longer truncated.

:::caution Deployments that mount their own application.yml
Docker Compose overrides the file inside the image with `./conf/application.yml`, and `docker run` setups commonly mount `-v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml`. **Pulling a new image does not update a mounted file**, so a 1.8.x copy hits the EclipseLink failure above just the same. Regenerate it from the 1.9.0 version and merge your own changes back in.
:::

### Other configuration keys

| 1.8.x | 1.9.0 | Notes |
|---|---|---|
| `management.endpoints.enabled-by-default: on` | `management.endpoints.access.default: read_only` | Spring Boot 4 removed the old key. Keeping it does not fail, but the actuator falls back to unrestricted mode. |
| none | `springdoc.api-docs.enabled: false`, `springdoc.swagger-ui.enabled: false` | The OpenAPI document is disabled by default. Enable it when needed; only the admin role can read it. |
| none | `hertzbeat.otlp.grpc.port: 14317` | New OTLP/gRPC listener when GreptimeDB is enabled, see [New Version Upgrade](upgrade#new-otlpgrpc-listener-on-port-14317). |
| none | `hertzbeat.collector.mysql.query-engine: auto` | Query engine selection for MySQL-family monitors, see [Collectors](#collectors). |
| `spring.mail.properties.mail.smtp.ssl.trust` | the "verify SSL certificate" toggle in the mail settings page | The yml property is no longer honoured; disable verification in the UI for self-signed SMTP servers. |

## Authorization Rules: sureness.yml

1.9.0 tightens the role requirements of many endpoints. The 1.9.0 installation package, the Docker image, the `conf/sureness.yml` of all five Compose variants and `script/sureness.yml` all ship the new rules.

- Nothing mounted over `sureness.yml`: no action needed.
- A `sureness.yml` copy downloaded or copied on 1.8.x is mounted: **replace it with the 1.9.0 file**. The authorization rules changed in 1.9.0, and a mounted file overrides the one shipped in the package and the image.
- You customised the file: merge your changes onto the 1.9.0 version.

What changed:

- The alert and manager SSE streams (`/api/alert/sse/**`, `/api/manager/sse/**`) require an authenticated user in 1.9.0. The browser-native `EventSource` cannot send an authorization header; the web UI switched to an authenticated fetch stream and third-party dashboards must do the same.
- The following are **admin only** in 1.9.0: plugin upload `/api/plugin/**`, AI and SOP `/api/ai/**`, API token management `/api/account/token*`, configuration writes `/api/config/**`, template writes `/api/apps/**` (PUT/DELETE), `/actuator/**`, `/api/metrics`, `/api/warehouse/query`, single monitor deletion. Automation calling these endpoints has to switch to admin credentials.
- Creating and editing alert definitions (`POST/PUT /api/alert/define`, `/api/alert/defines/import`) and the threshold preview route `GET /api/alert/define/preview/**` are **admin only** in 1.9.0; guest cannot read alert definitions.
- Deleting labels, `DELETE /api/label/**`, is **admin only** in 1.9.0.
- External alert ingestion `POST /api/v2/alerts` accepts admin and user only in 1.9.0; Alertmanager / Zabbix integrations need credentials with one of those roles.
- The system secret configuration can no longer be read through the REST API; such requests return 403 for every role.
- The OpenAPI endpoints `/v3/api-docs/**` are admin only in 1.9.0.
- CORS no longer returns `Access-Control-Allow-Credentials`; cross-origin front ends relying on cookies must switch to an `Authorization: Bearer` header.

If Prometheus scrapes `/actuator/prometheus`, configure the scrape job with an admin-role API token.

## GreptimeDB (only when enabled)

:::caution
1.9.0 initialises the GreptimeDB tables and the log pipeline at startup and **exits the manager when any step fails**, instead of degrading as 1.8.x did. Finish this section before starting the manager.
:::

### Version requirement

The `greptime/greptimedb:v0.14.3` shipped with the 1.8.x Docker Compose does not support the 1.9.0 log pipeline, and Compose 1.9.0 now pins `v1.1.3`. **Do not replace v0.14.3 directly with v1.1.3.** The [official GreptimeDB upgrade path](https://docs.greptime.com/user-guide/deployments-administration/upgrade/) requires releases earlier than v0.16 to upgrade to v0.16 first, and then to v1.0.

Proceed in stages, following the official instructions applicable to each version. Before continuing, verify at every stage that GreptimeDB starts, the old tables can be queried and their row counts are as expected, then create a new restorable snapshot for the next stage:

1. `v0.14.3` → a compatible `v0.16.x` release;
2. `v0.16.x` → `v1.0.x`;
3. `v1.0.x` → the Compose version, `v1.1.3`.

If verification fails at any stage, restore the snapshot from before that stage. Do not let a later GreptimeDB version continue writing to that data directory.

The configured GreptimeDB account needs permission to create and alter tables and to upload pipelines.

### The body column of hertzbeat_logs

1.8.x created `body` as a `JSON` column; 1.9.0 writes it as `STRING`. 1.9.0 does not alter the existing table, so **after a plain upgrade GreptimeDB rejects every new log write**. The only visible symptom is that logs stop updating, and log-based alerting stops with them.

With the manager and every other log writer stopped, and the GreptimeDB snapshot taken, first check the old table and its size:

```sql
SHOW CREATE TABLE hertzbeat_logs;
SELECT COUNT(*) AS row_count, MIN(time_unix_nano) AS min_time, MAX(time_unix_nano) AS max_time
FROM hertzbeat_logs;
```

Once you have confirmed that `body` is `JSON` and the table name is right:

```sql
ALTER TABLE hertzbeat_logs RENAME hertzbeat_logs_v18;
```

Start 1.9.0 so it creates the new table, but keep external log writes paused. Confirm that the new table is empty, then copy the history back:

```sql
INSERT INTO hertzbeat_logs (time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, body, attributes, resource, instrumentation_scope, dropped_attributes_count)
SELECT time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, json_to_string(body), attributes, resource, instrumentation_scope, dropped_attributes_count
FROM hertzbeat_logs_v18;
```

:::caution Copy the log history only once
The new table uses append-only mode, so this `INSERT ... SELECT` is **not idempotent** and running it twice duplicates logs. Record the old table's row count and earliest and latest timestamp before the copy. Those values should match in both tables after it succeeds. Only then resume one sender in a controlled manner and verify that a new log arrives.

If the client disconnects, times out or cannot tell whether the statement completed, **do not rerun it directly**. Keep all product-log writers paused and compare the two tables' counts and time ranges. If you cannot prove that the target is still empty or that the copy completed, restore the pre-upgrade snapshot and repeat the whole GreptimeDB upgrade. If the target data must be retained, first design and verify a deduplicating migration in an isolated environment.
:::

Do not assume GreptimeDB DDL rolls back with a transaction the way a relational database would: verify the result of every statement before moving on.

:::danger
Do not run `ALTER TABLE hertzbeat_logs MODIFY COLUMN body STRING`. The statement succeeds, but the existing JSON binary content is then read back as garbage strings.
:::

### Self-monitoring tables renamed

HertzBeat's self-monitoring log and trace tables were renamed from `hzb_logs` / `hzb_traces` to `hzb_internal_logs` / `hzb_internal_traces`. There is no automatic migration; see [New Version Upgrade](upgrade#greptimedb-signal-tables-renamed) for how to approach it.

The product trace table `hertzbeat_traces` is created fresh: 1.8.x had no trace ingestion route, no trace query API and no traces page, and `hzb_traces` holds nothing but HertzBeat's own spans, so there is no historical business trace data to migrate.

## Collectors

:::danger Collectors must be upgraded before the manager
1.9.0 changed the AES cipher format of monitor credentials. The manager never decrypts; it forwards the stored ciphertext to collectors. **A 1.8.x collector cannot decrypt passwords sent by a 1.9.0 manager**, so monitors that need authentication may fail to collect. The manager rewrites some credentials in the new format on its first start, without any user action.

The handshake carries no version gate, so nothing stops the mismatched pair from connecting. The collector logs an AES decode error and the failure usually surfaces as an authentication error returned by the monitored service, which is easy to mistake for a wrong credential.

Correct order: upgrade every collector to 1.9.0 first (a 1.9.0 collector decrypts the 1.8.x format and works fine against an old manager), then upgrade the manager.
:::

### MySQL-family query engine

1.9.0 ships a built-in R2DBC query engine for MySQL / MariaDB / OceanBase / TiDB. `query-engine` defaults to `auto`: when `mysql-connector-j` is present under `ext-lib/`, JDBC is used and behaviour is unchanged; otherwise the built-in engine is used. If your driver lives outside `ext-lib/`, set `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc` explicitly.

The built-in engine is stricter than JDBC:

- Connection options in the `url` parameter (`useSSL`, `serverTimezone`, ...) are ignored.
- Custom SQL goes through an **allowlist**: only a single statement starting with `SELECT` or `SHOW` is accepted.
- Any comment (`--`, `#`, `/* */`) is rejected, and so is any statement containing `insert`/`update`/`delete`/`replace`/`merge`/`alter`/`drop`/`truncate`/`create`/`call` as a whole word — which also rules out `WITH ... SELECT`, `DESC` and `SHOW CREATE TABLE`.

The built-in R2DBC path prefers TLS. If a TLS handshake or a MySQL authentication plugin compatibility error appears after the upgrade, configure a compatible TLS and authentication method for the monitoring account, or place `mysql-connector-j` in `ext-lib/` and set `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc` to return to the JDBC path.

### JDBC database name validation

The `database` parameter of JDBC monitors must now match `[A-Za-z0-9_$][A-Za-z0-9_$.-]{0,63}`. For names containing spaces, non-ASCII characters or more than 64 characters, put the full connection string in the `url` parameter instead.

## Monitors

### SFTP monitors

SFTP monitors (FTP template with SSL enabled) reject every server host key after the upgrade. **Each SFTP monitor needs a host-key fingerprint**, or the temporary skip-verification option. See [New Version Upgrade](upgrade#sftp-monitors-require-an-explicit-host-key-policy).

### Synology template renamed

The Synology template `app` identifier changed from `synology` to `synology_nas`, and existing monitors are not migrated automatically. With the manager stopped and the metadata database backed up, first confirm which rows are affected:

```sql
SELECT id, name, app FROM hzb_monitor WHERE app = 'synology';
```

Once the result looks right, run the update and query again to confirm nothing was missed:

```sql
UPDATE hzb_monitor SET app = 'synology_nas' WHERE app = 'synology';
SELECT id, name, app FROM hzb_monitor WHERE app = 'synology';
```

Alert definitions, notice rules and dashboard filters referencing `synology` need the same change.

### Push style monitors removed

The `push` protocol monitor template (Push Style Monitor) was removed. Before upgrading, find the affected monitors:

```sql
SELECT id, name, app FROM hzb_monitor WHERE app = 'push';
```

Delete them through the UI or the API **while still running 1.8.x**, so that HertzBeat also cleans up their parameters, alert bindings, parent-child bindings, metric favourites, collector bindings and scheduled jobs. **Do not hand-delete rows from `hzb_param` and `hzb_monitor` only** — that leaves orphaned data behind. If the UI and the API are no longer available, stop the manager first, then write and verify a complete transactional cleanup script for your database rather than copying an incomplete generic one.

If you edited and saved a custom template containing a `push:` protocol block in the UI, or keep such a template in object storage, **delete it before upgrading**; otherwise template parsing fails and the manager exits at startup. The Prometheus push gateway `/api/push/prometheus/**` is a separate feature and is unaffected.

### Template field changes

- NVIDIA template, `basic` metric fields renamed: `utilization.gpu [%]` → `utilization_gpu`, `utilization.memory [%]` → `utilization_memory`, `memory.total [MiB]` → `memory_total`, `memory.used [MiB]` → `memory_used`, `memory.free [MiB]` → `memory_free`, `temperature.gpu` → `temperature_gpu`. Update alert definitions and dashboards that reference the old names. The same template also dropped the `proxyHost`, `proxyPort`, `proxyUsername`, `proxyPassword` and `proxyPrivateKey` parameters, so GPU monitors that reached the host through a jump server need another route to it.
- Redis Sentinel template, `sentinel` metric: `sentinel_masters`, `sentinel_tilt`, `sentinel_running_scripts`, `sentinel_scripts_queue_length` and `sentinel_simulate_failure_flags` changed from string to number. Rewrite string comparisons in alert definitions as numeric ones.
- The history query API now validates every parameter: `app`, the metric group and the field names accept only letters, digits, `_` and `-`, with a length of 1 to 200; `instance` additionally accepts `. : [ ]` but no spaces or non-ASCII characters; the time range must be 1–6 digits followed by `s`, `m`, `h`, `d`, `w` or `y`, case-insensitively (for example `6h`, `1D`). Check custom templates and API consumers against this.

## Alerting and Notification

### Scheduled alert rules

Scheduled rules (PromQL and SQL) are now bounded at execution time: the query must be at most 8192 characters, the time range at most one day (`[2d]`, `[1w]`, `RANGE '2d'` are rejected) and the result at most 1000 rows. SQL rules must additionally be a single read-only statement starting with `SELECT` or `WITH`, without a database prefix, and parseable by a standard SQL parser.

**Rules violating these limits save without error but are silently skipped at execution**, and alerts they already raised never resolve. Review every scheduled rule before upgrading; the threshold preview API can validate them (that API is admin-only now).

### Empty values in real-time rules

In 1.8.x a row was skipped when a metric field was empty or unparseable. In 1.9.0 numeric fields evaluate as `null` and string fields as an empty string. Consequences:

- Negated expressions such as `field != 0`, `!contains(field, "x")` or `!matches(field, "...")` become true on empty rows and may raise false alerts.
- Alerts whose field went empty earlier are resolved in the first evaluation after the upgrade, producing a burst of resolved notifications.

Guard such rules with `exists(field) &&`.

### Cyclic alert silences

Cyclic silence rules were effectively dead in 1.8.x after their creation day. 1.9.0 fixes them: they now match by time of day, with inclusive bounds, across midnight, and are evaluated in the **server time zone**. Every enabled cyclic silence starts suppressing alerts after the upgrade; review each one. Rules created from a browser in a different time zone shift by that offset.

### Alert group convergence

A firing group is re-notified every `repeat_interval` (default 4 hours). A `repeat_interval` of 0 re-sends every `group_interval` (default 5 minutes); set a large value instead. Label-filtered notice rules now fire when any alert in the group matches, and the group passed to the channel is rebuilt for that rule, so its `groupKey` can differ from the stored one. Downstream systems deduplicating on `groupKey` should use the per-alert `fingerprint`.

### Notification channels

- Webhook URLs are sent verbatim and no longer re-encoded. Receivers whose URL contains spaces, `|`, `{` or `}` must be corrected.
- Email notifications verify the SMTP certificate by default; disable verification in the mail settings page for self-signed servers.
- Secret fields of notice receivers (webhook tokens, bot tokens, Slack URLs, ...) are returned masked as `******` plus the last four characters. Scripts that read a receiver and create a new one from the response would store the mask as the real value; read then update instead.

## API Consumers

- Log query, log management and log SSE endpoints moved from `/api/logs/**` to `/api/observability/**`; the old paths return 404. The old OTLP log ingestion paths `/api/logs/otlp/v1/logs` and `/api/logs/ingest/otlp` are kept as deprecated aliases. The trace and metric query endpoints (`/api/observability/traces/**`, `/api/observability/metrics/**`) are new in 1.9.0 and have no 1.8.x equivalent. The full mapping is in [New Version Upgrade](upgrade#observability-otlp--logs--traces-api-paths-moved).
- The success body of the `/api/logs/ingest/otlp` alias changed from `{"code":0,...}` to `{}`; requests without `Content-Type` are parsed as protobuf; 429 and 503 are new status codes.
- `GET /api/monitor/{id}` returns password parameters masked as `******`; submitting the mask on update keeps the stored value; the mask is rejected on create.
- Monitor Excel export grew from 11 to 14 columns. **A 1.8.x xlsx cannot be imported into 1.9.0**; re-export, or use JSON / YAML. Import is now validated as a batch: one failing row rejects the whole file.
- Alert definition export gained a `datasource` field. Rules exported from 1.8.x import with an empty `datasource` and scheduled rules then never run; fill it in after import.
- The anonymous Prometheus push gateway `/api/push/prometheus/**` is now bounded: at most 5 MB per request body, 10000 samples per request, and 10000 auto-created monitors in total. Exceeding any of them returns 400 with `code` 0 in the body; the real reason is only in the server log. Tune with `HERTZBEAT_PUSH_MAX_BODY_BYTES`, `HERTZBEAT_PUSH_MAX_SAMPLES` and `HERTZBEAT_PUSH_MAX_AUTO_CREATED_MONITORS`.
- Login tokens and API tokens issued by 1.8.x remain valid. Newly issued API tokens can be listed and revoked in the UI.

## Docker Compose

- Every Compose variant binds its published ports to `127.0.0.1` by default. For remote access copy `.env.example` to `.env`, keeping the three cases apart:
  - `HERTZBEAT_BIND_ADDRESS` covers 1157 (web/API) and 1158 (collector transport);
  - `HERTZBEAT_OTLP_BIND_ADDRESS` covers 14317 (OTLP/gRPC) on its own — setting only the first does not open it;
  - the database and time-series ports (`127.0.0.1:15432:5432`, `127.0.0.1:14000:4000`, ...) are **hard-coded** in the compose file with no environment variable, so opening them means editing the compose file.

  Run `docker compose config` afterwards and check every final host binding.
- The `hertzbeat-postgresql-victoria-metrics` variant now requires `POSTGRES_PASSWORD`. If the old deployment did not override the Compose default, its existing data volume was initialised with that old default; if it was customised, use the database user's actual password instead. Before upgrading, check the old `.env`, the Compose configuration and the database username, then put the **same password** in the new `.env` or authentication fails. To move to a strong password, change the database user's password in PostgreSQL first, then update `.env` to match.
- The `hertzbeat-postgresql-greptimedb` variant upgrades the GreptimeDB image from `v0.14.3` to `v1.1.3`; see [GreptimeDB](#greptimedb-only-when-enabled).

## Helm Deployments

The Helm chart is maintained as a separate project. **Do not simply override the manager image tag to 1.9.0 on a chart whose `appVersion` is still 1.8.x**: such a chart may keep mounting an EclipseLink-era `application.yml` and the old authorization rules, and it does not declare the OTLP/gRPC port 14317. The result is a manager that fails to start, authorization behaviour that does not match 1.9.0, or gRPC ingestion that is unavailable.

Before upgrading, confirm that the chart you use explicitly supports HertzBeat 1.9.0, and check at least that:

- `application.yml` uses the Hibernate configuration from this guide;
- `sureness.yml` carries the 1.9.0 rules;
- the Deployment, Service, NetworkPolicy and Ingress/Gateway are configured for 14317 if you use OTLP/gRPC;
- the collector configuration mount path moved from the versioned directory to `/opt/hertzbeat-collector/`;
- values, ConfigMaps, Secrets and persistent volumes are backed up.

If no chart with explicit 1.9.0 support is available yet, do not replace the image alone. Use the verified installation package or Compose flow instead, or wait for a compatible chart release.

## AI Conversations and SOP Schedules

1.9.0 adds ownership checks to AI conversations and SOP schedules:

- A conversation without a recorded creator is isolated and no longer appears in anyone's conversation list.
- A SOP schedule is owned by the creator of its target conversation. Schedules with no target conversation, no creator, or a creator that does not match the conversation creator are disabled before they execute.
- All of `/api/ai/**` is now admin only.

Released 1.8.x has no SOP schedules, so an upgrade from 1.8.x produces no historical schedules to restore.

## Other Behaviour Changes

None of these need a configuration change, but they change the data or the alerts you see. Watch for them after the upgrade:

- **Templates without a host** (`*_sd` service discovery, openai, deepseek, ...) now fill `instance` with the monitor name instead of `null:port`. The first edit and save breaks the time series once and changes the alert fingerprint once. The monitor name becomes the `instance` used by history queries, so a name containing spaces, non-ASCII characters or anything outside `[A-Za-z0-9_\-.:\[\]]` makes those queries fail — rename such monitors before upgrading.
- **Single-row metrics from SSH / script collection**: when the command produces no output and no stderr, 1.8.x treated it as a collection failure while 1.9.0 records one successful row with NULL values. Availability alerts that relied on "response data is null" no longer fire; check the individual field for null instead. stderr is now surfaced as the failure message.
- **VictoriaMetrics storage**: custom labels colliding with the reserved `__name__`, `__monitor_id__`, `__metrics__`, `__metric__` and `instance` labels are dropped instead of overwriting the reserved ones.
- **Bulletins**: `hzb_bulletin.name` gained a unique constraint, `POST` no longer upserts by id (a duplicate name is rejected as already existing) and `PUT` requires an id. If duplicate names already exist, Hibernate silently skips creating the constraint, so clean them up before upgrading.
- **Notice receivers**: `PUT` against a non-existent id now fails instead of upserting, and the mask is rejected whenever a target field (host, port, webhook URL, ...) changes — the real secret must be submitted.

## Removed Features

- **Push style monitors (`app-push`)**, see [Monitors](#monitors).
- **The monitoring template marketplace hub**: the separately deployed marketplace service is gone entirely. Its `/template`, `/tag`, `/star`, `/share`, `/category`, `/user`, `/version`, `/role`, `/resource` and `/auth` endpoints and its seven tables no longer exist, and **there is no upgrade path**. If you ran it, export the templates it holds before upgrading and manage them through the UI or the `define/` directory instead.

## Dependencies and Third-party Components

These only affect specific deployments; most users need to do nothing:

| Component | 1.8.0 | 1.9.0 | Impact |
|---|---|---|---|
| Nacos client | 2.2.1 | 3.1.1 | **Nacos 1.x servers are no longer supported.** Nacos service-discovery monitors (`nacos_sd`) need Nacos 2.x or newer |
| BouncyCastle | `bcprov-jdk15on` | `bcprov-jdk18on` 1.85 | A `jdk15on` jar sitting in `ext-lib/` now clashes; remove it |
| OkHttp | 4.12.0 | 5.3.2 | Third-party plugins bundling OkHttp must be recompiled |
| mssql-jdbc | 10.2.0.jre8 | 12.10.2.jre11 | Update an older SQL Server driver placed in `ext-lib/` by hand |
| gRPC / OpenTelemetry | 1.56.1 / 2.15.0 | 1.76.3 / 2.25.0 | Normally unnoticeable |

The outbound HTTP client for notifications and collection also moved from OkHttp to the JDK `HttpClient`: a `Connection: close` request header is silently dropped and an https-to-http redirect is refused. Adjust self-hosted webhook receivers that depend on either behaviour.

## Plugin Developers

`hertzbeat-common` was split into `hertzbeat-common-core` and `hertzbeat-common-spring`. The plugin SPI interfaces (`Plugin`, `PostAlertPlugin`, `PostCollectPlugin`, `PluginRunner`) and the fully-qualified names of `GroupAlert`, `SingleAlert`, `CollectRep` and `Job` are unchanged.

- **Required**: change the dependency from `org.apache.hertzbeat:hertzbeat-common:1.8.0` to `hertzbeat-common-core` or `hertzbeat-common-spring` and recompile against Java 25.
- **No source change**: `JsonUtil` and `XmlUtil` (now in `hertzbeat-common-core`) and `CommonThreadPool` (now in `hertzbeat-common-spring`) only moved module. Their package and class names are identical.
- **Source change needed**: `PluginUpload` and `CollectorSummary` moved to `org.apache.hertzbeat.manager.pojo.dto`, and `PushProtocol` and `PushMetricsDto` were deleted along with push style monitors.
- The core JSON library moved to Jackson 3 (`tools.jackson.*`). Jackson 2 databind is still present as a transitive dependency, but do not rely on it — write new code against Jackson 3.

## Post-upgrade Checks

1. The manager log shows no Flyway or Hibernate errors.
2. Every collector is online in the collector page and reports version 1.9.0.
3. Spot-check monitors that need authentication (databases, SSH, API-key based) for successful collection.
4. With GreptimeDB enabled, the logs page receives new data and the manager log has no `[warehouse greptime-log] Write failed` entries.
5. Scheduled alert rules show no execution errors; every alert silence has been reviewed.
6. With a mounted or customised `sureness.yml`, use an admin account, a regular user account and a guest account to exercise a few admin-only, authenticated and anonymous endpoints, and confirm the results match the 1.9.0 rules.

## Rolling Back to 1.8.x

:::danger
Data created after the upgrade may not be mergeable back into a pre-upgrade snapshot. Do not point a 1.8.x manager at a metadata database that 1.9.0 has already modified, and do not open a data directory written by GreptimeDB 1.1 with GreptimeDB 0.14.
:::

If the upgrade fails verification and you decide to roll back:

1. Stop the manager and every client that writes to this GreptimeDB directly or indirectly through OTLP, HTTP, SQL or another protocol. If the GreptimeDB instance is shared, stop writes from the other applications too. Stop the collectors as well if you need to avoid continuous retries.
2. Restore the pre-upgrade relational metadata database backup.
3. If GreptimeDB was upgraded or modified, restore the **complete pre-upgrade GreptimeDB data directory, Docker volume or external storage snapshot**, and start it with the GreptimeDB version recorded in the backup. Renaming tables is not a substitute for rolling a database back across major versions.
4. Restore the 1.8.x package or image together with its `config/`, `define/`, `ext-lib/`, `.env`, Compose/Helm configuration, certificates and keys.
5. A 1.9.0 collector can talk to a 1.8.x manager for the time being; restore the collectors to 1.8.x one by one if you need the original version everywhere. Never let a 1.9.0 manager issue credentials to a 1.8.x collector.
6. Start the databases and the time-series store first, then the manager and the collectors. Spot-check monitors, alerts, notifications and log ingestion against what you recorded before the upgrade.

Once 1.9.0 has created the new `hertzbeat_logs`, you cannot simply rename `hertzbeat_logs_v18` back, because the target name is taken. A full data snapshot is the preferred rollback path. If you must keep GreptimeDB 1.1 and roll back only HertzBeat, work out in an isolated environment how to archive the 1.9 table and restore the old name and the JSON `body` structure before touching production — do not improvise the DDL there.

## Migrating Only Monitors to a Fresh Environment

If you would rather abandon the existing environment and deploy 1.9.0 from scratch, you can export and import the monitors. This is not a full environment migration: the new environment still needs the Java, configuration, authorization, collector, GreptimeDB and deployment checks described above.

1. Deploy and verify a fresh 1.9.0 environment.
2. Export the monitors from the old environment as **JSON or YAML** (Excel is not compatible) and import them into the new one.
3. Export and import the alert definitions separately; rules exported from 1.8.x need `datasource` filled in on the new environment.
4. Add host-key fingerprints to imported SFTP monitors.

Accounts and roles, notice receivers and rules, dashboards, status pages, bulletins, AI conversations, system configuration, historical metrics and logs, and any other metadata are **not** migrated by importing monitors. Rebuild them item by item, or plan a separate data migration for them.

## Getting Help and Reporting Security Issues

- For general upgrade problems, ask through [GitHub Issues](https://github.com/apache/hertzbeat/issues), the [community contact channels](../community/contact) or the public developer mailing list `dev@hertzbeat.apache.org`. Remove passwords, tokens, database connection strings and any other sensitive information before posting.
- For a suspected security issue, do **not** open a public issue or discussion and do not write to a public mailing list. Report it privately following the [security model](../help/security_model) and the [ASF vulnerability reporting process](https://www.apache.org/security/#reporting-a-vulnerability).
