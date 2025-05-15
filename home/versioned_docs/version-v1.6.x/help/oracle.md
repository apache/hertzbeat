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

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by the database. The default is 1521                                                                                                                        |
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

|   Metric name    | Metric unit | Metric help description |
|------------------|-------------|-------------------------|
| database_version | none        | Database version        |
| database_type    | none        | Database type           |
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

#### Metric set：user_connect

| Metric name | Metric unit |  Metric help description  |
|-------------|-------------|---------------------------|
| username    | none        | Username                  |
| counts      | number      | Current connection counts |

#### Metric set：performance

| Metric name | Metric unit |   Metric help description   |
|-------------|-------------|-----------------------------|
| qps         | QPS         | I/O Requests per second     |
| tps         | TPS         | User transaction per second |
| mbps        | MBPS        | I/O Megabytes per second    |
