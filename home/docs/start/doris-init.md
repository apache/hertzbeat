---
id: doris-init
title: Use Apache Doris to Store Metrics and Logs Data (Optional)
sidebar_label: Metrics/Logs Store Doris
---

Apache HertzBeat's historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use Greptime as metrics storage.

Apache Doris is an MPP-based real-time analytics database. In HertzBeat, Doris can be used to store:

- Metrics history data (`hzb_history`)
- Log data (`hzb_log`)

**⚠️ If you do not configure a time-series database, only the last hour of historical data is retained.**

> If you already have a Doris cluster, skip directly to the YML configuration section.

### Install Doris (Optional)

You can deploy Doris by package or Docker. For production, follow the official deployment guide:

- Doris docs: [Quick Start](https://doris.apache.org/docs/4.x/gettingStarted/quick-start/)

For HertzBeat integration, ensure at least:

- FE MySQL service port is reachable (default `9030`)
- FE HTTP service port is reachable (default `8030`)

### Prerequisites

1. Doris FE and BE are running normally.
2. HertzBeat can access:
   - FE MySQL port (default `9030`) for metadata/query
   - FE HTTP port (default `8030`) for Stream Load
3. The configured Doris user has permission to create database/table and insert/query data.

### Important: Stream Load Redirect in Complex Networks

When HertzBeat writes in Stream Load mode, the request is sent to FE first. FE then returns an HTTP redirect to an available BE endpoint, and the client writes to that BE.

In cross-network/Kubernetes/LB scenarios, this means:

- The redirected BE endpoint must be reachable from HertzBeat.
- Or you should configure Doris BE endpoint tags and set a proper `redirect-policy` (`direct` / `public` / `private`) in HertzBeat so FE returns a reachable endpoint.

Reference:

- [Stream Load in Complex Network](https://doris.apache.org/zh-CN/docs/4.x/data-operate/import/load-internals/stream-load-in-complex-network)

### Configure Doris in HertzBeat `application.yml`

1. Edit `hertzbeat/config/application.yml`.

   For Docker deployment, mount the config file from host.
   For package deployment, modify `hertzbeat/config/application.yml` directly.

2. Configure `warehouse.store.doris`:

```yaml
warehouse:
  store:
    doris:
      enabled: true
      # FE MySQL endpoint
      url: jdbc:mysql://127.0.0.1:9030
      username: root
      password:

      table-config:
        # Enable dynamic partition for automatic expiration
        enable-partition: true
        # HOUR / DAY / MONTH
        partition-time-unit: DAY
        # Number of history partitions to keep
        partition-retention-days: 30
        # Number of future partitions to pre-create
        partition-future-days: 3
        buckets: 8
        replication-num: 1

      pool-config:
        minimum-idle: 5
        maximum-pool-size: 20
        connection-timeout: 30000

      write-config:
        # jdbc or stream (stream is recommended for higher throughput)
        write-mode: stream
        # batch settings
        batch-size: 1000
        flush-interval: 5
        stream-load-config:
          # FE HTTP port
          http-port: ":8030"
          timeout: 60
          max-bytes-per-batch: 10485760
          # Optional: direct / public / private
          redirect-policy: ""
```

### Parameter Notes

| Parameter | Description |
| --- | --- |
| `enabled` | Enable/disable Doris storage |
| `url` | Doris FE MySQL JDBC endpoint |
| `table-config.enable-partition` | Enable dynamic partition and automatic expiration |
| `table-config.partition-time-unit` | Partition granularity: `HOUR` / `DAY` / `MONTH` |
| `table-config.partition-retention-days` | Number of partitions retained |
| `table-config.partition-future-days` | Number of future partitions pre-created |
| `table-config.buckets` | Bucket count for table distribution |
| `table-config.replication-num` | Replica count |
| `write-config.write-mode` | `jdbc` or `stream` |
| `write-config.batch-size` | Write batch size |
| `write-config.flush-interval` | Flush interval in seconds |
| `stream-load-config.http-port` | Doris FE HTTP port for Stream Load |
| `stream-load-config.timeout` | Stream Load timeout in seconds |
| `stream-load-config.max-bytes-per-batch` | Max bytes per stream-load batch |
| `stream-load-config.redirect-policy` | Redirect policy for FE->BE endpoint selection: `direct` / `public` / `private` |

### Restart HertzBeat

After configuration changes, restart HertzBeat to apply Doris storage settings.

### Verify Doris Storage Is Working

1. Check HertzBeat logs for Stream Load success messages.
2. Verify database and tables:

```sql
SHOW CREATE TABLE hertzbeat.hzb_history;
SHOW CREATE TABLE hertzbeat.hzb_log;
```

3. If partition is enabled, check dynamic partition state:

```sql
SHOW DYNAMIC PARTITION TABLES FROM hertzbeat;
SHOW PARTITIONS FROM hertzbeat.hzb_history;
SHOW PARTITIONS FROM hertzbeat.hzb_log;
```

### FAQ

1. Do I need to enable partition to use bucket distribution?

   > No. Buckets work with or without dynamic partition. `enable-partition` only controls dynamic partition and automatic expiration.

2. Can I use Doris for both metrics and logs at the same time?

   > Yes. HertzBeat writes metrics into `hzb_history` and logs into `hzb_log` with the same Doris datasource configuration.

3. If I change partition/bucket settings in `application.yml`, will existing tables auto-update?

   > No. Existing Doris table DDL is not automatically altered. For schema-level changes, apply DDL manually or recreate tables.

4. Is stream load compression enabled?

   > Current implementation uses JSON stream load by default.
