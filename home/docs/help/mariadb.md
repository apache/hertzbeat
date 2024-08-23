---
id: mariadb  
title: Monitoring：MariaDB database monitoring      
sidebar_label: MariaDB database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring mariadb database metrics]
---

> Collect and monitor the general performance Metrics of MariaDB database. Support MariaDB5+.

### Attention, Need Add MYSQL jdbc driver jar

- Download the MYSQL jdbc driver jar package, such as mysql-connector-java-8.1.0.jar. <https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/8.1.0>
- Copy the jar package to the `hertzbeat/ext-lib` directory.
- Restart the HertzBeat service.

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

|    Metric name    | Metric unit |      Metric help description       |
|-------------------|-------------|------------------------------------|
| threads_created   | none        | MariaDB created total connections  |
| threads_connected | none        | MariaDB connected connections      |
| threads_cached    | none        | MariaDB current cached connections |
| threads_running   | none        | MariaDB current active connections |

#### Metric set：innodb

|     Metric name     | Metric unit |               Metric help description                |
|---------------------|-------------|------------------------------------------------------|
| innodb_data_reads   | none        | innodb average number of reads from files per second |
| innodb_data_writes  | none        | innodb average number of writes from file per second |
| innodb_data_read    | KB          | innodb average amount of data read per second        |
| innodb_data_written | KB          | innodb average amount of data written per second     |
