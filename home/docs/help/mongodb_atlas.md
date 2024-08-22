---
id: mongodb_atlas
title: Monitoring MongoDB Atlas Database
sidebar_label: MongoDB Atlas Database
keywords: [open-source monitoring system, open-source database monitoring, MongoDB Atlas database monitoring]
---

> Collect and monitor general performance metrics of MongoDB Atlas databases.

### Configuration Parameters

|     Parameter Name      |                                                             Parameter Description                                                             |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host             | The IP address, IPv4, IPv6, or domain name of the target to be monitored. Note: ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Task Name               | The name identifying this monitor, which must be unique.                                                                                      |
| Username                | MongoDB username, optional.                                                                                                                   |
| Password                | MongoDB password, optional.                                                                                                                   |
| Database                | Name of the database.                                                                                                                         |
| Authentication Database | The name of the database storing user credentials.                                                                                            |
| Connection Timeout      | Timeout for MongoDB connection when no response is received, in milliseconds (ms). Default is 6000 ms.                                        |
| Cluster Mode            | Value for MongoDB Atlas cluster: mongodb-atlas                                                                                                |
| Collection Interval     | Interval for periodic data collection, in seconds. The minimum interval is 30 seconds.                                                        |
| Binding Tags            | Used for categorizing and managing monitoring resources.                                                                                      |
| Description/Remarks     | Additional labels and description for this monitor; users can add notes here.                                                                 |

### Collection Metrics

#### Metric Set: Build Information

|   Metric Name    | Unit |        Metric Description         |
|------------------|------|-----------------------------------|
| version          | None | MongoDB version information       |
| gitVersion       | None | Source code git version           |
| sysInfo          | None | System information                |
| allocator        | None | Memory allocator used by MongoDB  |
| javascriptEngine | None | JavaScript engine used by MongoDB |

#### Metric Set: Server Document

| Metric Name | Unit |                Metric Description                 |
|-------------|------|---------------------------------------------------|
| delete      | None | Number of deletions                               |
| insert      | None | Number of insertions                              |
| update      | None | Number of updates                                 |
| query       | None | Number of queries                                 |
| getmore     | None | Number of requests for remaining cursor documents |
| command     | None | Total number of command operations                |

#### Metric Set: Network Operations

| Metric Name | Unit |                 Metric Description                  |
|-------------|------|-----------------------------------------------------|
| Bytes In    | None | Number of times a query needs to scan and sort data |
| Bytes Out   | None | Number of write conflicts                           |
| Request Num | None | Number of requests                                  |

#### Metric Set: Connection Information

|        Metric Name        | Unit |          Metric Description          |
|---------------------------|------|--------------------------------------|
| Current Connections       | None | Number of current active connections |
| Available Connections     | None | Number of available connections      |
| Total Created Connections | None | Total number of connections created  |

#### Metric Set: Database Statistics

|    Metric Name    | Unit  |    Metric Description     |
|-------------------|-------|---------------------------|
| Database Name     | None  | Name of the database      |
| Collections       | None  | Number of collections     |
| Views             | None  | Number of views           |
| Objects           | None  | Number of documents       |
| Document Avg Size | Bytes | Average size of documents |
| Document Size     | Bytes | Total size of documents   |
| Storage Size      | Bytes | Size of storage used      |
| Indexes           | None  | Number of indexes         |
| Index Size        | Bytes | Total size of indexes     |
