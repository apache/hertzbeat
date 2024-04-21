---
id: clickhouse  
title: Monitoring：Clickhouse database monitoring       
sidebar_label: Clickhouse database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring clickhouse database metrics]
---

> Collect and monitor the general performance Metrics of Clickhouse database.

### Configuration parameter 

| Parameter name     | Parameter help description                                                                                                                                                |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host    | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name    | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port               | Port provided by the database. The default is 8123                                                                                                                        |
| Query timeout      | Set the timeout time when SQL query does not respond to data, unit: ms, default: 6000ms                                                                                   |
| Database name      | Database instance name, optional                                                                                                                                          |
| Username           | Database connection user name, optional                                                                                                                                   |
| Password           | Database connection password, optional                                                                                                                                    |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Bind Tags   | Used to classify and manage monitoring resources |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：ping_available

| Metric name      | Metric unit | Metric help description            |
| ----------- | ----------- |------------------------------------|
| responseTime         | none | response time                      |
#### Metric set：Data in the system.metrics table

| Metric name      | Metric unit | Metric help description |
| ----------- |-------------| ----------- |
| Query        | none        | Number of executing queries         |
| Merge            | none        | Number of executing background merges       |
| PartMutation         | none        | Number of mutations (ALTER DELETE/UPDATE)       |
| ReplicatedFetch| none        | Number of data parts being fetched from replica      |
| ReplicatedSend| none        | Number of data parts being sent to replicas       |
| ReplicatedChecks| none        | Number of data parts checking for consistency        |
| BackgroundMergesAndMutationsPoolTask| none        | Number of active merges and mutations in an associated background pool |
| BackgroundFetchesPoolTask| none        | Number of active fetches in an associated background pool    |
| BackgroundCommonPoolTask| none        | Number of active tasks in an associated background pool    |
| BackgroundMovePoolTask| none        | Number of active tasks in BackgroundProcessingPool for moves    |


#### Metric set：Data for the system.events table

| Metric name      | Metric unit | Metric help description |
| ----------- |-------------| ----------- |
| Query               | none        | Number of queries to be interpreted and potentially executed. Does not include queries that failed to parse or were rejected due to AST size limits, quota limits or limits on the number of simultaneously running queries. May include internal queries initiated by ClickHouse itself. Does not count subqueries. |
| SelectQuery         | none        | Same as Query, but only for SELECT queries.                                                                         |
| FailedQuery         | none        | Number of failed queries.                                                                                           |
| FailedSelectQuery   | none        | Same as FailedQuery, but only for SELECT queries.                                                                   |
| QueryTimeMicroseconds | none        | Total time of all queries.                                                                                          |


#### Metric set：Data from the system.asynchronous_metrics table

| Metric name      | Metric unit | Metric help description |
| ----------- |-------------| ----------- |
| AsynchronousMetricsCalculationTimeSpent     | none        | Time spent on asynchronous metrics calculation.            |
| jemalloc.arenas.all.muzzy_purged            | none        | Number of muzzy pages purged.                             |
| jemalloc.arenas.all.dirty_purged            | none        | Number of dirty pages purged.                              |
| BlockReadBytes_ram1                         | none        | Number of bytes read from RAM.                             |
| jemalloc.background_thread.run_intervals    | none        | Number of background thread run intervals.                 |
| BlockQueueTime_nbd13                        | none        | Time spent in block queue.                                 |
| jemalloc.background_thread.num_threads      | none        | Number of background threads.                              |
| jemalloc.resident                           | none        | Resident memory size.                                      |
| InterserverThreads                          | none        | Number of inter-server threads.                            |
| BlockWriteMerges_nbd7                       | none        | Number of block write merges.                              |

