---
id: 1.9.0-update
title: How to update to 1.9.0
sidebar_label: Update to 1.9.0 guide
---

## HertzBeat 1.9.0 Upgrade Guide

:::danger This release contains breaking changes
1.9.0 is **not** a drop-in replacement for the 1.8.x jar or image. The runtime, configuration file, authorization rules, collector credential encryption, GreptimeDB table schema and several alerting semantics changed incompatibly. Read this guide in full and follow the steps in order.
:::

:::note
This guide is applicable for upgrading from 1.8.x to 1.9.0.
On an older version: from 1.6.x / 1.7.x follow the [1.7.0 upgrade guide](1.7.0-update) first, then move to 1.8.0 (that step has no breaking changes) and come back here. You can also reinstall straight onto 1.9.0 with the export and import function described at the end.
:::

Follow the [HertzBeat New Version Upgrade](upgrade)

## Before You Start

1. **Back up** the metadata database (the `data/` directory for H2, or the MySQL / PostgreSQL database), the `define/` custom template directory, `ext-lib/` and `config/`.
2. **The order matters**: upgrade GreptimeDB first (if enabled), then every collector, and the manager last. See the "Collectors" section for why.
3. **There is no in-place rollback**: 1.9.0 rewrites some stored credentials in a new cipher format that 1.8.x cannot decrypt. Rolling back means restoring the pre-upgrade database backup.
4. Rehearse the upgrade in a test environment first, especially if you use GreptimeDB, scheduled alert rules or a customised `sureness.yml`.

## Step 1: Runtime

### Java 25

1.9.0 requires **Java 25**. The installation package does not bundle a JDK.

- If the default Java on the server is already 25, nothing to do.
- If the default Java is not 25 (for example 8, 11, 17 or 21) and no other application depends on it, install Java 25 and point the environment variable to it.
- If other applications depend on the older Java, download Java 25, rename the extracted folder to `java` and place it in the HertzBeat installation directory; the startup script prefers it.

The Docker images are now based on `eclipse-temurin:25-jdk`; Docker users need no action.

### Package layout

The startup scripts now put `lib/*` and `ext-lib/*` on the classpath explicitly instead of relying on the jar manifest. **Replace the whole installation directory**, do not swap only the main jar.

### Collector image path

The collector image working directory moved from `/opt/apache-hertzbeat-collector-<version>-bin/` to the fixed `/opt/hertzbeat-collector/`. Update every volume or Kubernetes ConfigMap mount that targets `config/`, `logs/` or `ext-lib/`.

## Step 2: application.yml

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

Flyway migration V190 runs automatically at startup and needs no manual action, but two of its statements have visible effects:

- It **disables every AI SOP schedule that has no recorded creator**. Those scheduled tasks stop running after the upgrade; the rows stay in the database and can be restored once ownership is verified, see [New Version Upgrade](upgrade#ai-schedule-ownership-after-upgrade).
- It widens `hzb_alert_define.expr` to a large-text type (`TEXT` on PostgreSQL, `LONGTEXT` on MySQL, `CLOB` on H2) so expressions binding many monitors are no longer truncated.

:::caution Deployments that mount their own application.yml
Docker Compose overrides the file inside the image with `./conf/application.yml`, and `docker run` setups commonly mount `-v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml`. **Pulling a new image does not update a mounted file**, so a 1.8.x copy hits the EclipseLink failure above just the same. Regenerate it from the 1.9.0 version and merge your own changes back in.
:::

### Other configuration keys

| 1.8.x | 1.9.0 | Notes |
|---|---|---|
| `management.endpoints.enabled-by-default: on` | `management.endpoints.access.default: read_only` | Spring Boot 4 removed the old key. Keeping it does not fail, but the actuator falls back to unrestricted mode. |
| none | `springdoc.api-docs.enabled: false`, `springdoc.swagger-ui.enabled: false` | The OpenAPI document is disabled by default. Enable it when needed; only the admin role can read it. |
| none | `hertzbeat.otlp.grpc.port: 14317` | New OTLP/gRPC listener when GreptimeDB is enabled, see [New Version Upgrade](upgrade#new-otlpgrpc-listener-on-port-14317). |
| none | `hertzbeat.collector.mysql.query-engine: auto` | Query engine selection for MySQL-family monitors, see "Collectors". |
| `spring.mail.properties.mail.smtp.ssl.trust` | the "verify SSL certificate" toggle in the mail settings page | The yml property is no longer honoured; disable verification in the UI for self-signed SMTP servers. |

## Step 3: sureness.yml

1.9.0 tightens the role requirements of many endpoints. The 1.9.0 installation package, Docker image, the `conf/sureness.yml` of all five Compose variants and `script/sureness.yml` all ship the new rules.

- Nothing mounted over `sureness.yml`: no action needed.
- A `sureness.yml` copy downloaded or copied on 1.8.x is mounted: **replace it with the 1.9.0 file**, otherwise the new admin restrictions never take effect. The old file has no `/api/plugin/**` or `/api/account/token*` rules, and sureness lets an unruled path through for any authenticated role, so even guest can upload plugins and issue or revoke API tokens.
- You customised the file: merge your changes onto the 1.9.0 version.

Notable changes:

- Alert and manager SSE streams (`/api/alert/sse/**`, `/api/manager/sse/**`) now require an authenticated user instead of anonymous access. The browser-native `EventSource` cannot send an authorization header; the web UI switched to an authenticated fetch stream and third-party dashboards must do the same.
- The following moved from "any logged-in user" to **admin only**: plugin upload `/api/plugin/**`, AI and SOP `/api/ai/**`, API token management `/api/account/token*`, configuration writes `/api/config/**`, template writes `/api/apps/**` (PUT/DELETE), `/actuator/**`, `/api/metrics`, `/api/warehouse/query`, single monitor deletion.
- Creating and editing alert definitions (`POST/PUT /api/alert/define`, `/api/alert/defines/import`) moved from admin and user to **admin only**; guest can no longer read alert definitions. The threshold preview route `GET /api/alert/define/preview/**` is now **admin only** as well.
- Deleting labels, `DELETE /api/label/**`, is now **admin only** (1.8.x had no rule, which let any signed-in user delete them).
- External alert ingestion `POST /api/v2/alerts` is limited to admin and user. Alertmanager / Zabbix integrations pushing with a guest account need admin or user credentials instead.
- `GET /api/config/secret` returns 403 for every role; the JWT and AES master keys are no longer exposed through the API.
- The OpenAPI endpoints `/v3/api-docs/**` moved from anonymous to admin.
- CORS no longer returns `Access-Control-Allow-Credentials`; cross-origin front ends relying on cookies must switch to an `Authorization: Bearer` header.

If Prometheus scrapes `/actuator/prometheus`, configure the scrape job with an admin-role API token.

## Step 4: GreptimeDB (only when enabled)

:::caution
1.9.0 initialises GreptimeDB tables and the log pipeline at startup and **exits the manager when any step fails**, instead of degrading as 1.8.x did. Finish this section before starting the manager.
:::

### Version requirement

The `greptime/greptimedb:v0.14.3` shipped with the 1.8.x Docker Compose does not support the 1.9.0 log pipeline. **Upgrade GreptimeDB to 1.x first** (Compose now pins `v1.1.3`). Consult the GreptimeDB documentation for data compatibility across major versions and back up its data directory first.

The configured GreptimeDB account needs permission to create and alter tables and to upload pipelines.

### The body column of hertzbeat_logs

1.8.x created `body` as a `JSON` column; 1.9.0 writes it as `STRING`. 1.9.0 does not alter the existing table, so **after a plain upgrade GreptimeDB rejects every new log write**. The only visible symptom is that logs stop updating, and log-based alerting stops with them.

Before upgrading, run in GreptimeDB:

```sql
ALTER TABLE hertzbeat_logs RENAME hertzbeat_logs_v18;
```

Start 1.9.0 so it creates the new table, then copy the history back:

```sql
INSERT INTO hertzbeat_logs (time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, body, attributes, resource, instrumentation_scope, dropped_attributes_count)
SELECT time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, json_to_string(body), attributes, resource, instrumentation_scope, dropped_attributes_count
FROM hertzbeat_logs_v18;
```

:::danger
Do not run `ALTER TABLE hertzbeat_logs MODIFY COLUMN body STRING`. The statement succeeds, but the existing JSON binary content is then read back as garbage strings.
:::

### Self-monitoring tables renamed

HertzBeat's self-monitoring log and trace tables were renamed from `hzb_logs` / `hzb_traces` to `hzb_internal_logs` / `hzb_internal_traces`. There is no automatic migration; the SQL is in [New Version Upgrade](upgrade#greptimedb-signal-tables-renamed).

The product trace table `hertzbeat_traces` is created fresh: 1.8.x had no trace ingestion route, query API or traces page, and `hzb_traces` holds nothing but HertzBeat's own spans, so there is no historical business trace data to migrate.

## Step 5: Collectors

:::danger Collectors must be upgraded before the manager
1.9.0 changed the AES cipher format of monitor credentials. The manager never decrypts; it forwards the stored ciphertext to collectors. **A 1.8.x collector cannot decrypt passwords sent by a 1.9.0 manager**, so every monitor that needs authentication fails silently, with no connection-level error. The manager rewrites some credentials in the new format on its first start, without any user action.

Correct order: upgrade every collector to 1.9.0 first (a 1.9.0 collector decrypts the 1.8.x format and works fine against an old manager), then upgrade the manager.
:::

### MySQL-family query engine

1.9.0 ships a built-in R2DBC query engine for MySQL / MariaDB / OceanBase / TiDB. `query-engine` defaults to `auto`: when `mysql-connector-j` is present under `ext-lib/`, JDBC is used and behaviour is unchanged; otherwise the built-in engine is used. If your driver lives outside `ext-lib/`, set `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc` explicitly.

The built-in engine is stricter than JDBC:

- Connection options in the `url` parameter (`useSSL`, `serverTimezone`, ...) are ignored.
- Custom SQL goes through an **allowlist**: only a single statement starting with `SELECT` or `SHOW` is accepted.
- Any comment (`--`, `#`, `/* */`) is rejected, and so is any statement containing `insert`/`update`/`delete`/`replace`/`merge`/`alter`/`drop`/`truncate`/`create`/`call` as a whole word — which also rules out `WITH ... SELECT`, `DESC` and `SHOW CREATE TABLE`.

### JDBC database name validation

The `database` parameter of JDBC monitors must now match `[A-Za-z0-9_$][A-Za-z0-9_$.-]{0,63}`. For names containing spaces, non-ASCII characters or more than 64 characters, put the full connection string in the `url` parameter instead.

## Step 6: Monitors

### SFTP monitors

SFTP monitors (FTP template with SSL enabled) reject every server host key after the upgrade. **Each SFTP monitor needs a host-key fingerprint**, or the temporary skip-verification option. See [New Version Upgrade](upgrade#sftp-monitors-require-an-explicit-host-key-policy).

### Synology template renamed

The Synology template `app` identifier changed from `synology` to `synology_nas`. Existing monitors are not migrated automatically. Before upgrading, run in the metadata database:

```sql
UPDATE hzb_monitor SET app = 'synology_nas' WHERE app = 'synology';
```

Update alert definitions, notice rules and dashboard filters that reference `synology` accordingly.

### Push style monitors removed

The `push` protocol monitor template (Push Style Monitor) was removed. Delete the related monitors before upgrading:

```sql
DELETE FROM hzb_param WHERE monitor_id IN (SELECT id FROM hzb_monitor WHERE app = 'push');
DELETE FROM hzb_monitor WHERE app = 'push';
```

If you edited and saved a custom template containing a `push:` protocol block in the UI, or keep such a template in object storage, **delete it before upgrading**; otherwise template parsing fails and the manager exits at startup. The Prometheus push gateway `/api/push/prometheus/**` is a separate feature and is unaffected.

### Template field changes

- NVIDIA template, `basic` metric fields renamed: `utilization.gpu [%]` → `utilization_gpu`, `utilization.memory [%]` → `utilization_memory`, `memory.total [MiB]` → `memory_total`, `memory.used [MiB]` → `memory_used`, `memory.free [MiB]` → `memory_free`, `temperature.gpu` → `temperature_gpu`. Update alert definitions and dashboards that reference the old names. The same template also dropped the `proxyHost`, `proxyPort`, `proxyUsername`, `proxyPassword` and `proxyPrivateKey` parameters, so GPU monitors that reached the host through a jump server need another route to it.
- Redis Sentinel template, `sentinel` metric: `sentinel_masters`, `sentinel_tilt`, `sentinel_running_scripts`, `sentinel_scripts_queue_length`, `sentinel_simulate_failure_flags` changed from string to number. Rewrite string comparisons in alert definitions as numeric ones.
- Custom templates whose metric or field names contain `.`, `/`, spaces or similar characters are rejected by the history query API. Use letters, digits, `_` and `-`.

## Step 7: Alerting and Notification

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

## Step 8: API Consumers

- Log query, log management and log SSE endpoints moved from `/api/logs/**` to `/api/observability/**`; the old paths return 404. The old OTLP log ingestion paths `/api/logs/otlp/v1/logs` and `/api/logs/ingest/otlp` are kept as deprecated aliases. The trace and metric query endpoints (`/api/observability/traces/**`, `/api/observability/metrics/**`) are new in 1.9.0 and have no 1.8.x equivalent. The full mapping is in [New Version Upgrade](upgrade#observability-otlp--logs--traces-api-paths-moved).
- The success body of the `/api/logs/ingest/otlp` alias changed from `{"code":0,...}` to `{}`; requests without `Content-Type` are parsed as protobuf; 429 and 503 are new status codes.
- `GET /api/monitor/{id}` returns password parameters masked as `******`; submitting the mask on update keeps the stored value; the mask is rejected on create.
- Monitor Excel export grew from 11 to 14 columns. **A 1.8.x xlsx cannot be imported into 1.9.0**; re-export, or use JSON / YAML. Import is now validated as a batch: one failing row rejects the whole file.
- Alert definition export gained a `datasource` field. Rules exported from 1.8.x import with an empty `datasource` and scheduled rules then never run; fill it in after import.
- The anonymous Prometheus push gateway `/api/push/prometheus/**` is now bounded: at most 5 MB per request body, 10000 samples per request, and 10000 auto-created monitors in total. Exceeding any of them returns 400 with `code` 0 in the body; the real reason is only in the server log. Tune with `HERTZBEAT_PUSH_MAX_BODY_BYTES`, `HERTZBEAT_PUSH_MAX_SAMPLES` and `HERTZBEAT_PUSH_MAX_AUTO_CREATED_MONITORS`.
- Login tokens and API tokens issued by 1.8.x remain valid. Newly issued API tokens can be listed and revoked in the UI.

## Step 9: Docker Compose

- Every Compose variant binds its published ports to `127.0.0.1` by default. For remote access copy `.env.example` to `.env`, keeping the three cases apart:
  - `HERTZBEAT_BIND_ADDRESS` covers 1157 (web/API) and 1158 (collector transport);
  - `HERTZBEAT_OTLP_BIND_ADDRESS` covers 14317 (OTLP/gRPC) on its own — setting only the first does not open it;
  - the database and time-series ports (`127.0.0.1:15432:5432`, `127.0.0.1:14000:4000`, ...) are **hard-coded** in the compose file with no environment variable, so opening them means editing the compose file.

  Run `docker compose config` afterwards and check every final host binding.
- The `hertzbeat-postgresql-victoria-metrics` variant now requires `POSTGRES_PASSWORD`. Existing data volumes were initialised with `123456`; set the same value in `.env`, otherwise database authentication fails.
- The `hertzbeat-postgresql-greptimedb` variant upgrades the GreptimeDB image from `v0.14.3` to `v1.1.3`; see Step 4.

## Step 10: AI Conversations and SOP Schedules

1.9.0 adds ownership checks to AI conversations and SOP schedules:

- A conversation without a recorded creator is isolated and no longer appears in anyone's conversation list.
- A SOP schedule is owned by the creator of its target conversation. Migration V190 **disables every schedule with no recorded creator**; schedules with a missing conversation or a creator mismatch are disabled before each background execution.
- All of `/api/ai/**` is now admin only.

No rows are deleted. Restore them one by one after verifying ownership, following [New Version Upgrade](upgrade#ai-schedule-ownership-after-upgrade) — do not reassign legacy rows to one shared account.

## Other Behaviour Changes

None of these need a configuration change, but they change the data or the alerts you see. Watch for them after the upgrade:

- **Templates without a host** (`*_sd` service discovery, openai, deepseek, ...) now fill `instance` with the monitor name instead of `null:port`. The first edit and save breaks the time series once and changes the alert fingerprint once.
- **Single-row metrics from SSH / script collection**: when the command produces no output and no stderr, 1.8.x treated it as a collection failure while 1.9.0 records one successful row with NULL values. Availability alerts that relied on "response data is null" no longer fire; check the individual field for null instead. stderr is now surfaced as the failure message.
- **VictoriaMetrics storage**: custom labels colliding with the reserved `__name__`, `__monitor_id__`, `__metrics__`, `__metric__` and `instance` labels are dropped instead of overwriting the reserved ones.
- **Bulletins**: `hzb_bulletin.name` gained a unique constraint, `POST` no longer upserts by id (a duplicate name is rejected as already existing) and `PUT` requires an id. If duplicate names already exist, Hibernate silently skips creating the constraint, so clean them up before upgrading.
- **Notice receivers**: `PUT` against a non-existent id now fails instead of upserting, and the mask is rejected whenever a target field (host, port, webhook URL, ...) changes — the real secret must be submitted.

## Removed Features

- **Push style monitors (`app-push`)**, see Step 6.
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
- **Source change needed**: `PluginUpload` and `CollectorSummary` moved to `org.apache.hertzbeat.manager.pojo.dto`, and `PushProtocol` and `PushMetricsDto` were deleted along with push-style monitors.
- The core JSON library moved to Jackson 3 (`tools.jackson.*`). Jackson 2 databind is still present as a transitive dependency, but do not rely on it — write new code against Jackson 3.

## Post-upgrade Checks

1. The manager log shows no Flyway or Hibernate errors.
2. Every collector is online in the collector page and reports version 1.9.0.
3. Spot-check monitors that need authentication (databases, SSH, API-key based) for successful collection.
4. With GreptimeDB enabled, the logs page receives new data and the manager log has no `[warehouse greptime-log] Write failed` entries.
5. Scheduled alert rules show no execution errors; every alert silence has been reviewed.
6. With a mounted or customised `sureness.yml`, verify with a non-admin account that restricted endpoints return 403 — check at least `/api/plugin/**` and `/api/account/token`.
7. If you used AI SOP schedules, review the rows V190 disabled in `hzb_sop_schedule` and re-enable them one by one after verifying ownership.

## Upgrade via Export and Import

If you prefer not to go through the steps above, export the monitors from the old environment and import them into a new one:

- Deploy a new 1.9.0 environment
- Export monitors from the old environment as **JSON or YAML** (Excel is not compatible) and import them into the new one
- Fill in `datasource` for imported alert definitions
- Add host-key fingerprints to imported SFTP monitors
