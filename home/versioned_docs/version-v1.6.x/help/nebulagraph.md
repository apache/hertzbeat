---
id: nebulaGraph
title: Monitoring NebulaGraph
sidebar_label: NebulaGraph Database
keywords: [ open source monitoring tool, open source NebulaGraph monitoring tool, monitoring NebulaGraph metrics ]
---

> Collect and monitor the general performance Metrics of nebulaGraph.

**Protocol Use：nebulaGraph**

```text
The monitoring has two parts,nebulaGraph_stats and rocksdb_stats.
nebulaGraph_stats is nebulaGraph's statistics, and rocksdb_stats is rocksdb's statistics.
```

**1、Obtain available parameters through the stats and rocksdb stats interfaces.**

1.1、 If you only need to get nebulaGraph_stats, you need to ensure that you have access to stats, or you'll get errors.

The default port is 19669 and the access address is <http://ip:19669/stats>

1.2、If you need to obtain additional parameters for rocksdb stats, you need to ensure that you have access to rocksdb
stats, otherwise an error will be reported.

Once you connect to NebulaGraph for the first time, you must first register your Storage service in order to properly
query your data.

**There is help_doc: <https://docs.nebula-graph.com.cn/3.4.3/4.deployment-and-installation/connect-to-nebula-graph/>**

**<https://docs.nebula-graph.com.cn/3.4.3/2.quick-start/3.quick-start-on-premise/3.1add-storage-hosts/>**

The default port is 19779 and the access address is:<http://ip:19779/rocksdb_stats>

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| graphPort           | Port of the Graph service provided by Nebula Graph                                                                                                                        |
| timePeriod          | The value can be 5 seconds, 60 seconds, 600 seconds, or 3600 seconds, indicating the last 5 seconds, last 1 minute, last 10 minutes, and last 1 hour, respectively.       |
| storagePort         | Port of the storage service provided by Nebula Graph                                                                                                                      |
| Timeout             | Allow collection response time                                                                                                                                            |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：nebulaGraph_stats

Too many indicators, related links are as follows
**<https://docs.nebula-graph.com.cn/3.4.3/6.monitor-and-metrics/1.query-performance-metrics/>**

|              Metric name              | Metric unit |                   Metric help description                    |
|---------------------------------------|-------------|--------------------------------------------------------------|
| num_queries_hit_memory_watermark_rate |             | The rate of statements that reached the memory watermark.    |
| num_queries_hit_memory_watermark_sum  |             | The sum of statements that reached the memory watermark.     |
| num_reclaimed_expired_sessions_sum    |             | Number of expired sessions actively reclaimed by the server. |
| ...                                   |             | ...                                                          |

#### Metrics Set：rocksdb_stats

Too many indicators, related links are as follows
**<https://docs.nebula-graph.com.cn/3.4.3/6.monitor-and-metrics/2.rocksdb-statistics/>**

|        Metric name         | Metric unit |                   Metric help description                   |
|----------------------------|-------------|-------------------------------------------------------------|
| rocksdb.backup.read.bytes  |             | Number of bytes read during the RocksDB database backup.    |
| rocksdb.backup.write.bytes |             | Number of bytes written during the RocksDB database backup. |
| ...                        |             | ...                                                         |
