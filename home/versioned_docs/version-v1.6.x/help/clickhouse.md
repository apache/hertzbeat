---
id: clickhouse  
title: Monitoring ClickHouse Database Monitoring  
sidebar_label: ClickHouse Database  
keywords: [open source monitoring system, open source database monitoring, ClickHouse database monitoring]
---

> Collect and monitor general performance metrics for the ClickHouse database.

### Configuration Parameters

|   Parameter Name    |                                                     Parameter Description                                                      |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | IP address, IPV4, IPV6, or domain name of the host being monitored. Note ⚠️ without protocol prefix (e.g., https://, http://). |
| Task Name           | Name identifying this monitoring, ensuring uniqueness.                                                                         |
| Port                | Port number of the database exposed to the outside, default is 8123.                                                           |
| Query Timeout       | Timeout for SQL queries to respond, in milliseconds (ms), default is 6000ms.                                                   |
| Database Name       | Name of the database instance, optional.                                                                                       |
| Username            | Username for database connection, optional.                                                                                    |
| Password            | Password for database connection, optional.                                                                                    |
| Collection Interval | Interval for periodic data collection during monitoring, in seconds, with a minimum interval of 30 seconds.                    |
| Tag Binding         | Used for categorizing and managing monitored resources.                                                                        |
| Description         | Additional information to identify and describe this monitoring, where users can add remarks.                                  |

### Collected Metrics

#### Metric Set: ping Availability

| Metric Name  | Metric Unit | Metric Description |
|--------------|-------------|--------------------|
| responseTime | N/A         | Response time      |

#### Metric Set: Data from system.metrics table

|     Metric Name      | Metric Unit |                    Metric Description                    |
|----------------------|-------------|----------------------------------------------------------|
| Query                | N/A         | Number of queries being executed                         |
| Merge                | N/A         | Number of background merges being executed               |
| Move                 | N/A         | Number of background moves being executed                |
| PartMutation         | N/A         | Number of table mutations                                |
| ReplicatedFetch      | N/A         | Number of data blocks fetched from replicas              |
| ReplicatedSend       | N/A         | Number of data blocks sent to replicas                   |
| ReplicatedChecks     | N/A         | Number of consistency checks on data blocks              |
| QueryPreempted       | N/A         | Number of queries stopped or waiting                     |
| TCPConnection        | N/A         | Number of TCP connections                                |
| HTTPConnection       | N/A         | Number of HTTP connections                               |
| OpenFileForRead      | N/A         | Number of open readable files                            |
| OpenFileForWrite     | N/A         | Number of open writable files                            |
| QueryThread          | N/A         | Number of threads processing queries                     |
| ReadonlyReplica      | N/A         | Number of Replicated tables in read-only state           |
| EphemeralNode        | N/A         | Number of ephemeral nodes in ZooKeeper                   |
| ZooKeeperWatch       | N/A         | Number of ZooKeeper event subscriptions                  |
| StorageBufferBytes   | Bytes       | Bytes in Buffer tables                                   |
| VersionInteger       | N/A         | ClickHouse version number                                |
| RWLockWaitingReaders | N/A         | Number of threads waiting for read-write lock on a table |
| RWLockWaitingWriters | N/A         | Number of threads waiting for write lock on a table      |
| RWLockActiveReaders  | N/A         | Number of threads holding read lock on a table           |
| RWLockActiveWriters  | N/A         | Number of threads holding write lock on a table          |
| GlobalThread         | N/A         | Number of threads in global thread pool                  |
| GlobalThreadActive   | N/A         | Number of active threads in global thread pool           |
| LocalThread          | N/A         | Number of threads in local thread pool                   |
| LocalThreadActive    | N/A         | Number of active threads in local thread pool            |

#### Metric Set: Data from system.events table

|            Metric Name             | Metric Unit |                                                                                                        Metric Description                                                                                                        |
|------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Query                              | N/A         | Number of queries to parse and possibly execute. Excludes queries rejected due to AST size limits, quota limits, or simultaneous query limits. May include internal queries initiated by ClickHouse. Subqueries are not counted. |
| SelectQuery                        | N/A         | Number of Select queries possibly executed                                                                                                                                                                                       |
| InsertQuery                        | N/A         | Number of Insert queries possibly executed                                                                                                                                                                                       |
| InsertedRows                       | N/A         | Number of rows inserted into all tables                                                                                                                                                                                          |
| InsertedBytes                      | Bytes       | Number of bytes inserted into all tables                                                                                                                                                                                         |
| FailedQuery                        | N/A         | Number of failed queries                                                                                                                                                                                                         |
| FailedSelectQuery                  | N/A         | Number of failed Select queries                                                                                                                                                                                                  |
| FileOpen                           | N/A         | Number of file openings                                                                                                                                                                                                          |
| MergeTreeDataWriterRows            | N/A         | Number of data rows written to MergeTree tables                                                                                                                                                                                  |
| MergeTreeDataWriterCompressedBytes | Bytes       | Number of compressed data bytes written to MergeTree tables                                                                                                                                                                      |

#### Metric Set: Data from system.asynchronous_metrics table

|               Metric Name                | Metric Unit |                  Metric Description                   |
|------------------------------------------|-------------|-------------------------------------------------------|
| AsynchronousMetricsCalculationTimeSpent  | N/A         | Time spent calculating asynchronous metrics (seconds) |
| jemalloc.arenas.all.muzzy_purged         | N/A         | Number of purged muzzy pages                          |
| jemalloc.arenas.all.dirty_purged         | N/A         | Number of purged dirty pages                          |
| BlockReadBytes_ram1                      | N/A         | Number of bytes read from ram1 block                  |
| jemalloc.background_thread.run_intervals | N/A         | Number of intervals jemalloc background thread ran    |
| BlockQueueTime_nbd13                     | N/A         | Queue wait time for nbd13 block                       |
| jemalloc.background_thread.num_threads   | N/A         | Number of jemalloc background threads                 |
| jemalloc.resident                        | N/A         | Physical memory size allocated by jemalloc (bytes)    |
| InterserverThreads                       | N/A         | Number of Interserver threads                         |
| BlockWriteMerges_nbd7                    | N/A         | Number of block write merges for nbd7 block           |
| MarkCacheBytes                           | N/A         | Size of marks cache in StorageMergeTree               |
| MarkCacheFiles                           | N/A         | Number of files in marks cache for StorageMergeTree   |
| MaxPartCountForPartition                 | N/A         | Maximum active data blocks in partitions              |
