---
id: vastbase  
title: Monitoring：Vastbase database monitoring      
sidebar_label: Vastbase database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring vastbase database metrics]
---

> Collect and monitor the general performance Metrics of PostgreSQL database. Support PostgreSQL 10+.

### Configuration parameter

|   Parameter name    | Parameter help description                                                                                                                                                |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored Host address. Note⚠️Without protocol header (eg: https://, http://)                                                                                             |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by the database. The default is 5432                                                                                                                        |
| Query timeout       | Set the timeout time when SQL query does not respond to data, unit: ms, default: 3000ms                                                                                   |
| Database name       | Database instance name, optional                                                                                                                                          |
| Username            | Database connection user name, optional                                                                                                                                   |
| Password            | Database connection password, optional                                                                                                                                    |
| URL                 | Database connection URL，optional，If configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters     |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：basic

|   Metric name   | Metric unit |          Metric help description          |
|-----------------|-------------|-------------------------------------------|
| server_version  | none        | Version number of the database server     |
| port            | none        | Database server exposure service port     |
| server_encoding | none        | Character set encoding of database server |
| data_directory  | none        | Database storage data disk address        |
| max_connections | connections | Database maximum connections              |

#### Metric set：state

|  Metric name   | Metric unit |                                                                                    Metric help description                                                                                    |
|----------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name           | none        | Database name, or share-object is a shared object                                                                                                                                             |
| conflicts      | times       | The number of queries canceled in the database due to a conflict with recovery                                                                                                                |
| deadlocks      | number      | Number of deadlocks detected in the database                                                                                                                                                  |
| blks_read      | times       | The number of disk blocks read in the database                                                                                                                                                |
| blks_hit       | times       | Times the disk block has been found to be in the buffer, so there is no need to read it once (This only includes hits in the Vastbase buffer, not in the operating system file system buffer) |
| blk_read_time  | ms          | Time spent by the backend reading data file blocks in the database                                                                                                                            |
| blk_write_time | ms          | Time spent by the backend writing data file blocks in the database                                                                                                                            |
| stats_reset    | none        | The last time these statistics were reset                                                                                                                                                     |

#### Metric set：activity

| Metric name | Metric unit |       Metric help description        |
|-------------|-------------|--------------------------------------|
| running     | connections | Number of current client connections |
