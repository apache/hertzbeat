---
id: sqlserver  
title: Monitoring：SqlServer database monitoring      
sidebar_label: SqlServer database   
---

> Collect and monitor the general performance Metrics of SqlServer database. Support SqlServer 2017+.

### Configuration parameter

| Parameter name      | Parameter help description |
| ----------- | ----------- |
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://) |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique |
| Port        | Port provided by the database. The default is 1433 |
| Query timeout | Set the timeout time when SQL query does not respond to data, unit: ms, default: 3000ms |
| Database name   | Database instance name, optional |
| Username      | Database connection user name, optional |
| Password        | Database connection password, optional |
| URL        | Database connection URL，optional，If configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters |
| Collection interval   | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 10 seconds |
| Whether to detect    | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks    | For more information about identifying and describing this monitoring, users can note information here |

### Collection Metric

#### Metric set：basic

| Metric name      | Metric unit | Metric help description |
| ----------- | ----------- | ----------- |
| machine_name         | none | Windows computer name running the server instance |
| server_name            | none | Server and instance information SQL Server associated with Windows instance |
| version         | none | Version of the instance，SQL Server，format is "major.minor.build.revision" |
| edition | none | The product SQL server version of the installed instance |
| start_time | none | Database start time | 

#### Metric set：performance_counters

| Metric name      | Metric unit | Metric help description |
| ----------- | ----------- | ----------- |
| database_pages         | none | Database pages, Number of pages obtained (buffer pool) |
| target_pages            | none | Target pages, The desired number of pages that the buffer pool must have |
| page_life_expectancy         | s | Page life expectancy. The time that data pages stay in the buffer pool. This time is generally greater than 300 |
| buffer_cache_hit_ratio | % | Buffer cache hit ratio, Database buffer pool cache hit rate. The probability that the requested data is found in the buffer pool is generally greater than 80%, otherwise the buffer pool capacity may be too small |
| checkpoint_pages_sec | none | Checkpoint pages/sec, The number of dirty pages written to the disk by the checkpoint per second. If the data is too high, it indicates that there is a lack of memory capacity |
| page_reads_sec | none | Page reads/sec, Number of pages read per second in the cache pool |
| page_writes_sec | none | Page writes/sec, Number of pages written per second in the cache pool |


#### Metric set：connection

| Metric name      | Metric unit | Metric help description |
| ----------- | ----------- | ----------- |
| user_connection   | none | Number of connected sessions |



