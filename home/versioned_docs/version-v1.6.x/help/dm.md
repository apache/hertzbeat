---
id: dm  
title: Monitoring DM database      
sidebar_label: DM Database   
keywords: [open source monitoring tool, open source database monitoring tool, monitoring DM database metrics]
---

> Collect and monitor the general performance metrics of the DM database. DM8+ is supported.

### Configuration parameters

|   Parameter name    |                                                                     Parameter help description                                                                     |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | Monitored peer IPV4, IPV6 or domain name. Note ⚠️ without protocol headers (eg: https://, http://).                                                                |
| Monitor Name        | Identifies the name of this monitor. The name needs to be unique.                                                                                                  |
| Port                | The port provided by the database externally, the default is 5236.                                                                                                 |
| Query Timeout       | Set the timeout when the SQL query does not respond to data, in ms milliseconds, the default is 3000 milliseconds.                                                 |
| database name       | database instance name, optional.                                                                                                                                  |
| username            | database connection username, optional                                                                                                                             |
| password            | database connection password, optional                                                                                                                             |
| URL                 | Database connection URL, optional                                                                                                                                  |
| Collection Interval | Monitor periodical collection data interval, in seconds, the minimum interval that can be set is 30 seconds                                                        |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring, and then continue to add and modify operations if the detection is successful |
| Description Remarks | More remarks that identify and describe this monitoring, users can remark information here                                                                         |

### Collect metrics

#### Metric collection: basic

| Metric Name  | Metric Unit |    Metric Help Description    |
|--------------|-------------|-------------------------------|
| PORT_NUM     | None        | Database exposed service port |
| CTL_PATH     | None        | Control File Path             |
| MAX_SESSIONS | None        | Maximum database connections  |

#### Metric collection: status

| Metric Name | Metric Unit |     Metric Help Description      |
|-------------|-------------|----------------------------------|
| status$     | None        | Open/Close status of DM database |

#### Metric collection: thread

| Metric Name | Metric Unit |                         Metric Help Description                         |
|-------------|-------------|-------------------------------------------------------------------------|
| dm_sql_thd  | None        | Thread for writing dmsql dmserver                                       |
| dm_io_thd   | None        | IO threads, controlled by IO_THR_GROUPS parameter, default is 2 threads |
| dm_quit_thd | None        | Thread used to perform a graceful shutdown of the database              |
