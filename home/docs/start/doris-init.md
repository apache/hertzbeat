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

### Note: Install MySQL JDBC Driver Jar

- Download MySQL JDBC driver jar, for example mysql-connector-java-8.1.0.jar. [https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/8.1.0](https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/8.1.0)
- Copy this jar to the `ext-lib` directory in HertzBeat installation directory.
- Restart HertzBeat service.

### Prerequisites

1. Doris FE and BE are running normally.
2. HertzBeat can access:
   - FE MySQL port (default `9030`) for metadata/query
   - FE HTTP port (default `8030`) for Stream Load
3. The configured Doris user has permission to create database/table and insert/query data.

### Configure Doris in HertzBeat `application.yml`

1. Edit `hertzbeat/config/application.yml`.

   For Docker deployment, mount the config file from host.
   For package deployment, modify `hertzbeat/config/application.yml` directly.

2. Configure `warehouse.store.doris` (Production Environment Recommended using Stream Load Mode):

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
        replication-num: 3

      pool-config:
        minimum-idle: 5
        maximum-pool-size: 20
        connection-timeout: 30000

      write-config:
        # Strongly recommend stream mode in production for high throughput
        write-mode: stream
        batch-size: 1000
        flush-interval: 5
        stream-load-config:
          # FE HTTP port
          http-port: ":8030"
          timeout: 60
          max-bytes-per-batch: 10485760
          # For complex networks (K8s/cross-domain): direct / public / private
          redirect-policy: ""
```

### Switching to Stream Load Mode

#### Production Environment Configuration

For production deployments, **strongly recommend using Stream Load mode** to ensure high-performance large-scale writes. Stream Load writes directly to Doris storage layer, providing better throughput improvement compared to JDBC mode.

#### Pre-Switch Checklist

1. **Network Reachability**
   - Ensure HertzBeat can access Doris FE HTTP port (default `8030`)
   - If direct connection is not possible, configure BE endpoint labels in Doris

2. **Special Configuration for Complex Network Scenarios**
   
   In K8s, cross-domain, or load-balanced environments, Stream Load's redirect mechanism requires special attention:
   - FE redirects requests to an available BE, which must be reachable from HertzBeat
   - Control returned BE address type via `redirect-policy`:
     - `direct`: Direct BE IP connection
     - `public`: Use public IP (cloud environments)
     - `private`: Use private IP (private networks)
     - Leave empty to use Doris default policy
   
   Reference: [Doris Stream Load in Complex Networks](https://doris.apache.org/zh-CN/docs/4.x/data-operate/import/load-internals/stream-load-in-complex-network)

#### Switching Steps

1. **Modify Configuration File**
   
   Edit `hertzbeat/config/application.yml` and change `write-mode` to `stream`:
   ```yaml
   warehouse:
     store:
       doris:
         write-config:
           write-mode: stream  # Change here: from jdbc to stream
           stream-load-config:
             http-port: ":8030"
             timeout: 60
             max-bytes-per-batch: 10485760
             redirect-policy: ""  # Configure if complex network
   ```

2. **Restart HertzBeat Service**

3. **Verify Successful Switch**

Check HertzBeat logs for Stream Load messages

#### Common Switching Questions

**Q: Do I need to rebuild tables after switching?**

A: No. Stream Load and JDBC modes use the same table structure, fully compatible.

**Q: Will data be lost when switching from JDBC to Stream Load?**

A: No. Both write modes are independent, historical data remains unchanged.

**Q: How do I rollback if Stream Load fails?**

A: If the stream processing fails, it will automatically try to use the jdbc mode for fallback writing

**Q: Still getting timeouts in cross-network setup with redirect-policy configured?**

A: Possible causes:
- Returned BE address under current `redirect-policy` setting is unreachable
- Try different `redirect-policy` values (`direct` / `public` / `private`)
- Contact Doris admin to verify BE endpoint label configuration

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
