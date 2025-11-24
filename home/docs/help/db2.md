---
id: db2
title: Monitoring：DB2 database monitoring
sidebar_label: DB2 Database
keywords: [ open source monitoring tool, open source database monitoring tool, monitoring DB2 database metrics ]
---


> Collect and monitor general performance metrics (tablespace, session status, process count, locks, slow queries, etc.)
> for DB2 databases.

### Note: DB2 JDBC Driver JAR Must be Added

- Download the DB2 JDBC driver JAR package, for
  example, [jcc.jar](https://repo1.maven.org/maven2/com/ibm/db2/jcc/11.5.9.0/jcc-11.5.9.0.jar).
- Copy the JAR package to the `hertzbeat/ext-lib` directory.
- Restart the HertzBeat service.

### Configuration Parameters

The following are the required configuration parameters for DB2 monitoring:

| Parameter Name       | Parameter Description                                                                                                                  |
|:---------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Target Host**      | The IPv4, IPv6, or domain name of the monitored DB2 database server.                                                                   |
| **Port**             | The port provided by the DB2 database, default is `50000`.                                                                             |
| **Database Name**    | The name of the DB2 database to connect to.                                                                                            |
| **Username**         | The username for the database connection.                                                                                              |
| **Password**         | The password for the database connection.                                                                                              |
| **Query Timeout**    | Sets the timeout for when an SQL query does not return data, in milliseconds (ms), default is `6000`.                                  |
| **Reuse Connection** | Whether to reuse the database connection, boolean value, default is `true`.                                                            |
| **URL**              | The database connection URL, optional. If configured, it will override the database name, username, and password parameters set above. |

### Collected Metrics

#### Metric Set: Basic Info

| Metric Name        | Metric Unit | Metric Description      |
|:-------------------|:------------|:------------------------|
| `database_version` | None        | Database Version.       |
| `instance_name`    | None        | Database Instance Name. |
| `status`           | None        | Instance Status.        |
| `num_db`           | None        | Number of Databases.    |

#### Metric Set: Tablespace Usage

| Metric Name       | Metric Unit    | Metric Description |
|:------------------|:---------------|:-------------------|
| `tablespace_name` | None           | Tablespace Name.   |
| `status`          | None           | Type.              |
| `total`           | MB             | Total Size.        |
| `used`            | MB             | Used Size.         |
| `free`            | MB             | Free Size.         |
| `used_percentage` | Percentage (%) | Used Percentage.   |

#### Metric Set: Session Status

| Metric Name   | Metric Unit | Metric Description                |
|:--------------|:------------|:----------------------------------|
| `status_type` | None        | Session Status Type.              |
| `count`       | None        | Count of sessions in that status. |

#### Metric Set: Application Process Count

| Metric Name     | Metric Unit | Metric Description                                                                 |
|:----------------|:------------|:-----------------------------------------------------------------------------------|
| `process_count` | None        | Total number of application processes/sessions.                                    |

#### Metric Set: Locks

| Metric Name     | Metric Unit | Metric Description                 |
|:----------------|:------------|:-----------------------------------|
| `waiting_locks` | None        | Number of currently waiting locks. |

#### Metric Set: Slow Query

| Metric Name    | Metric Unit | Metric Description          |
|:---------------|:------------|:----------------------------|
| `avg_exe_time` | ms          | Average Execution Time.     |
| `sql_text`     | None        | SQL Text of the slow query. |
