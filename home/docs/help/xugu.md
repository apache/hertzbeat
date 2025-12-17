---
id: xugu
title: xuguDB Database Monitoring
sidebar_label: xugu Database
keywords: [ Open Source Monitoring System, Open Source Database Monitoring, xugu Database Monitoring ]
---

> Collect and monitor common performance metrics of the xugu database. Supports xuguDB.v12.

### Configuration Parameters

| Parameter Name | Description                                                                 |
|----------------|------------------------------------------------------------------------------|
| Monitoring Host | The IPv4, IPv6, or domain name of the monitored target. ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Task Name       | The name that identifies this monitoring task. The name must be unique.    |
| Port            | The port exposed by the database, default is 5138.                         |
| Query Timeout   | The timeout for SQL queries when no response is received, in milliseconds. Default is 3000 ms. |
| Database Name   | The database instance name, optional.                                       |
| Username        | Database connection username.                                               |
| Password        | Database connection password.                                               |
| URL             | Database connection URL, optional. If configured, the database name, username, password and other parameters in the URL will override the above settings. |
| Collection Interval | The interval for periodically collecting monitoring data, in seconds. The minimum configurable interval is 30 seconds. |
| Enable Detection | Whether to probe and check availability before adding monitoring. The add/modify operation proceeds only if the probe succeeds. |
| Description     | Additional notes and descriptions for this monitoring, where users can add remarks. |

### Collected Metrics

#### Metric Set: Session Information

| Metric Name                    | Unit | Description                 |
|--------------------------------|------|-----------------------------|
| Idle_Connection                | N/A  | Idle connections            |
| Active_Connections             | N/A  | Active connections          |
| Connection_being_created       | N/A  | Connections being created   |
| Null_Read_Connection           | N/A  | Empty read connections      |
| Complete_data_input_connection | N/A  | Connections with completed data input |
| Other                          | N/A  | Others                      |

#### Metric Set: Memory Information

| Metric Name | Unit | Description                         |
|------------|------|-------------------------------------|
| G_MEM      | MB   | Global memory consumption            |
| CATA_MEM   | MB   | CATALOG memory consumption           |
| TRAN_MEM   | MB   | Transaction memory consumption       |
| NET_MEM    | MB   | User connection memory consumption   |
| TASK_MEM   | MB   | Task thread memory consumption       |
| MSG_MEM    | MB   | Internal communication message memory consumption |
| LOCK_MEM   | MB   | Local lock memory consumption        |
| GLOCK_MEM  | MB   | Global lock memory consumption       |
| DLCHK_MEM  | MB   | Deadlock detection memory consumption|
| MODI_MEM   | MB   | Change log memory consumption        |
| PROC_MEM   | MB   | Procedure execution engine memory consumption |

#### Metric Set: Disk Information

| Metric Name       | Unit  | Description                         |
|-------------------|-------|-------------------------------------|
| DISK_READ_NUM     | Times | Number of disk block read operations |
| DISK_WRITE_NUM    | Times | Number of disk block write operations |
| DISK_READ_BYTES   | MB    | Number of bytes read from disk       |
| DISK_WRITE_BYTES  | MB    | Number of bytes written to disk      |
