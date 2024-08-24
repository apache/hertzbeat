---
id: tidb  
title: Monitoring：TiDB database monitoring      
sidebar_label: TiDB database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring tidb database metrics]
---

> HertzBeat monitors general performance metrics of TiDB through HTTP and JDBC protocol.

[Metrics Schema](https://docs.pingcap.com/tidb/stable/metrics-schema)

[METRICS_SUMMARY](https://docs.pingcap.com/tidb/stable/information-schema-metrics-summary)

[METRICS_TABLES](https://docs.pingcap.com/tidb/stable/information-schema-metrics-tables)

**Protocol Use: HTTP and JDBC**

### Configuration parameter

|   Parameter name    |                                                                                                               Parameter help description                                                                                                                |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host         | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                                                                                              |
| Task name           | Identify the name of this monitoring. The name needs to be unique                                                                                                                                                                                       |
| Service Port        | The port that the TiDB database provides externally for status reporting is 10080 by default                                                                                                                                                            |
| PD Port             | The PD port for the TiDB database, which defaults to 2379                                                                                                                                                                                               |
| Query timeout       | Set the timeout time when SQL query does not respond to data, unit: ms, default: 6000ms                                                                                                                                                                 |
| JDBC Port           | The TiDB database externally provides the port used for client requests, which defaults to 4000                                                                                                                                                         |
| Database name       | Database instance name, optional                                                                                                                                                                                                                        |
| Username            | Database connection user name, optional                                                                                                                                                                                                                 |
| Password            | Database connection password, optional                                                                                                                                                                                                                  |
| JDBC URL            | Database using [JDBC](https://docs.pingcap.com/tidb/stable/dev-guide-connect-to-tidb#jdbc) connection URL，optional，If configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                                                                                                 |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful                                                                               |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                                                                                                  |

### Collection Metric

The monitoring template will retrieve the monitoring metrics from the TiDB System Variables table, and the user can retrieve the [TiDB System Variables Table](https://docs.pingcap.com/tidb/stable/system-variables) by himself to query the required information or other system variables.

Besides, TiDB also provides default monitoring metrics table, see [Metrics Schema](https://docs.pingcap.com/tidb/stable/metrics-schema) and [METRICS_SUMMARY](https://docs.pingcap.com/tidb/stable/information-schema-metrics-summary), and users can add their own sql codes according to their needs.

Due to the large number of metrics that can be monitored, only the metrics queried in the monitoring template are described below.

#### Metric set: global variables

|       Metric Name       | Metric Unit |                                                                                                                                                     Metric Help Description                                                                                                                                                      |
|-------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| version                 | none        | The MySQL version, followed by the TiDB version. For example '8.0.11-TiDB-v7.5.1'.                                                                                                                                                                                                                                               |
| version_comment         | none        | The TiDB version. For example, 'TiDB Server (Apache License 2.0) Community Edition, MySQL 8.0 compatible'.                                                                                                                                                                                                                       |
| version_compile_machine | none        | The name of the CPU architecture on which TiDB is running.                                                                                                                                                                                                                                                                       |
| version_compile_os      | none        | The name of the OS on which TiDB is running.                                                                                                                                                                                                                                                                                     |
| max_connections         | none        | The maximum number of concurrent connections permitted for a single TiDB instance. This variable can be used for resources control. The default value 0 means no limit. When the value of this variable is larger than 0, and the number of connections reaches the value, the TiDB server rejects new connections from clients. |
| datadir                 | none        | The location where data is stored. This location can be a local path /tmp/tidb, or point to a PD server if the data is stored on TiKV. A value in the format of ${pd-ip}:${pd-port} indicates the PD server that TiDB connects to on startup.                                                                                    |
| port                    | none        | The port that the tidb-server is listening on when speaking the MySQL protocol.                                                                                                                                                                                                                                                  |
