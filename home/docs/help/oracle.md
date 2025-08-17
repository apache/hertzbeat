---
id: oracle  
title: Monitoring：ORACLE database monitoring      
sidebar_label: ORACLE database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring oracle database metrics]
---

> Collect and monitor the general performance Metrics of ORACLE database.

### Attention, Need Add ORACLE jdbc driver jar

- Download the ORACLE jdbc driver jar package, such as [ojdbc8.jar](https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.4.0.24.05/ojdbc8-23.4.0.24.05.jar) [oracle-i18n](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar)
- Copy the jar package to the `hertzbeat/ext-lib` directory.
- Restart the HertzBeat service.

### Configuration parameter

|   Parameter name    | Parameter help description                                                                                                                                                |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by the database. The default is 1521                                                                                                                        |
| Query timeout       | Set the timeout time when SQL query does not respond to data, unit: ms, default: 3000ms                                                                                   |
| Database name       | Database instance name, optionalIf you need to use a dba user, you can fill in like "sys as sysdba".                                                                      |
| Username            | Database connection user name, optional                                                                                                                                   |
| Password            | Database connection password, optional                                                                                                                                    |
| URL                 | Database connection URL，optional，If configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters     |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：basic

|   Metric name    | Metric unit | Metric help description |
|------------------|-------------|-------------------------|
| database_version | none        | Database version        |
| hostname         | none        | Host name               |
| instance_name    | none        | Database instance name  |
| startup_time     | none        | Database start time     |
| status           | none        | Database status         |

#### Metric set：tablespace

|   Metric name   | Metric unit | Metric help description |
|-----------------|-------------|-------------------------|
| file_id         | none        | File ID                 |
| file_name       | none        | File name               |
| tablespace_name | none        | Table space name        |
| status          | none        | Status                  |
| bytes           | MB          | Size                    |
| blocks          | none        | Number of blocks        |

#### Metric set：total_sessions

| Metric name | Metric unit |  Metric help description  |
|-------------|-------------|---------------------------|
| counts      | number      | Current connection counts |

#### Metric set：active_sessions

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| counts      | number      | Active sessions counts  |

#### Metric set：background_sessions

| Metric name | Metric unit | Metric help description    |
|-------------|-------------|----------------------------|
| counts      | number      | Background sessions counts |

#### Metric set：connection

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| username    | none        | User name               |
| counts      | number      | User sessions counts    |

#### Metric set：performance

| Metric name | Metric unit |   Metric help description   |
|-------------|-------------|-----------------------------|
| qps         | QPS         | I/O Requests per second     |
| tps         | TPS         | User transaction per second |
| mbps        | MBPS        | I/O Megabytes per second    |

#### Metric set：percentage

| Metric name     | Metric unit   | Metric help description |
|-----------------|---------------|-------------------------|
| tablespace_name | none          | Tablespace name         |
| total           | none          | Total                   |
| used            | none          | Used                    |
| free            | none          | Free                    |
| used_percentage | percentage(%) | Used Percentage         |
| free_percentage | percentage(%) | Free Percentage         |

#### Metric set：process

| Metric name   | Metric unit | Metric help description |
|---------------|-------------|-------------------------|
| process_count | none        | Process count           |

#### Metric set：transaction

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| commits     | t/s         | User Commits Per Sec    |
| rollbacks   | t/s         | User Rollbacks Per Sec  |

#### Metric set：wait

| Metric name          | Metric unit | Metric help description |
|----------------------|-------------|-------------------------|
| concurrent_wait_time | ms          | Concurrent Wait Time    |
| commit_wait_time     | ms          | Commit Wait Time        |
| app_wait_time        | ms          | Application Wait Time   |
| network_wait_time    | ms          | Network Wait Time       |
| system_io_wait_time  | ms          | System I/O Wait Time    |
| user_io_wait_time    | ms          | User I/O Wait Time      |
| configure_wait_time  | ms          | Configure Wait Time     |
| scheduler_wait_time  | ms          | Scheduler Wait Time     |

#### Metric set：cpu_stats

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| type        | none        | Type                    |
| num         | none        | Num                     |

#### Metric set：mem_stats

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| type        | none        | Type                    |
| num         | none        | Num                     |

#### Metric set：cache_hit_ratio

| Metric name            | Metric unit | Metric help description |
|------------------------|-------------|-------------------------|
| lib_cache_hit_ratio    | none        | Library Cache Hit Ratio |
| buffer_cache_hit_ratio | none        | Buffer Cache Hit Ratio  |

#### Metric set：slow_query

| Metric name    | Metric unit | Metric help description |
|----------------|-------------|-------------------------|
| sql_id         | none        | SQL ID                  |
| child_number   | none        | Child Number            |
| executions     | none        | EXECUTIONS              |
| per_secs       | seconds     | Per Secs                |
| cpu_secs       | seconds     | CPU Secs                |
| buffer_gets    | none        | Buffer Gets             |
| disk_reads     | none        | Disk Reads              |
| fetches        | none        | Fetches                 |
| parse_calls    | none        | Parse Calls             |
| optimizer_cost | none        | Optimizer Cost          |
| sql_text       | none        | SQL Text                |

#### Metric set：users

| Metric name         | Metric unit | Metric help description                                                                           |
|---------------------|-------------|---------------------------------------------------------------------------------------------------|
| username            | none        | User Name                                                                                         |
| account_status      | none        | Account Status                                                                                    |
| lock_date           | none        | If the account status is LOCKED, the date and time when the account was locked will be displayed. |
| expiry_date         | none        | Password Expiry Date                                                                              |
| expiry_seconds      | seconds     | Password Validity Period Remaining                                                                |
| created             | none        | Creation Date                                                                                     |
| authentication_type | none        | Authentication Type                                                                               |
