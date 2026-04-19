---
id: mysql  
title: Monitoring：MySQL database monitoring       
sidebar_label: MySQL database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring mysql database metrics]
---

> Collect and monitor the general performance Metrics of MySQL database. Support MYSQL5+.

## Driver selection

HertzBeat now supports two MySQL query paths:

- If `mysql-connector-j` is present in `ext-lib`, the JVM collector or built-in server collector automatically prefers JDBC.
- If `mysql-connector-j` is absent, HertzBeat automatically uses the built-in MySQL query engine. No extra JAR is required.
- Restart HertzBeat or the standalone JVM collector after adding or removing a JAR in `ext-lib`.
- The automatic decision only checks `ext-lib`. If you want to force one path, set `hertzbeat.collector.mysql.query-engine=jdbc`, `r2dbc`, or `auto`.

:::important Collector package selection
MySQL monitoring supports both JVM and native deployment now.

- Built-in server collector or JVM collector package: automatically prefers JDBC when `mysql-connector-j` exists in `ext-lib`
- Native collector package: supported when you do not rely on `ext-lib` and want the built-in MySQL query engine
- If you explicitly need runtime `ext-lib` JDBC loading, choose the JVM collector package
:::

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by the database. The default is 3306                                                                                                                        |
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

|   Metric name   | Metric unit |      Metric help description       |
|-----------------|-------------|------------------------------------|
| version         | none        | Database version                   |
| port            | none        | Database exposure service port     |
| datadir         | none        | Database storage data disk address |
| max_connections | none        | Database maximum connections       |

#### Metric set：status

|    Metric name    | Metric unit |     Metric help description      |
|-------------------|-------------|----------------------------------|
| threads_created   | none        | MySql created total connections  |
| threads_connected | none        | MySql connected connections      |
| threads_cached    | none        | MySql current cached connections |
| threads_running   | none        | MySql current active connections |

#### Metric set：innodb

|     Metric name     | Metric unit |               Metric help description                |
|---------------------|-------------|------------------------------------------------------|
| innodb_data_reads   | none        | innodb average number of reads from files per second |
| innodb_data_writes  | none        | innodb average number of writes from file per second |
| innodb_data_read    | KB          | innodb average amount of data read per second        |
| innodb_data_written | KB          | innodb average amount of data written per second     |
