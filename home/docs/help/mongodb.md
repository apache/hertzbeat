---
id: mongodb
title: Monitoring:MongoDB
sidebar_label: MongoDB database
keywords: [ open source monitoring tool, open source database monitoring tool, monitoring MongoDB database metrics ]
---

> Collect and monitor the general performance Metrics of MongoDB database.

### Configuration parameter

|     Parameter name     |                                               Parameter help description                                                |
|------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Target Host            | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://).                             |
| Monitoring name        | Identify the name of this monitoring. The name needs to be unique.                                                      |
| Port                   | Port provided by the database. The default is 27017.                                                                    |
| Username               | Username for MongoDB,Optional.                                                                                          |
| Password               | Password for MongoDB,Optional.                                                                                          |
| database               | Database name.                                                                                                          |
| authenticationDatabase | Credentials Storage Database.                                                                                           |
| Connect Timeout(ms)    | Set connection timeout for MongoDB, unit: ms, default: 6000ms.                                                          |
| Collection interval    | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds |
| Bind Tags              | Used to classify and manage monitoring resources.                                                                       |
| Description remarks    | For more information about identifying and describing this monitoring, users can note information here.                 |

### Collection Metric

#### Metric set:Build Info

|   Metric name    | Metric unit |                                 Metric help description                                 |
|------------------|-------------|-----------------------------------------------------------------------------------------|
| version          | none        | The version number of the MongoDB server.                                               |
| gitVersion       | none        | The Git version of the MongoDB codebase.                                                |
| sysInfo          | none        | System information, typically includes details about the operating system and platform. |
| loaderFlags      | none        | Loader flags used to link MongoDB binaries                                              |
| compilerFlags    | none        | Compiler flags used when compiling MongoDB.                                             |
| allocator        | none        | The memory allocator used by MongoDB.                                                   |
| javascriptEngine | none        | The JavaScript engine used by MongoDB.                                                  |

#### Metric set:Server Document

| Metric name | Metric unit |      Metric help description      |
|-------------|-------------|-----------------------------------|
| deleted     | none        | The number of documents deleted.  |
| inserted    | none        | The number of documents inserted. |
| returned    | none        | The number of documents returned. |
| updated     | none        | The number of documents updated.  |

#### Metric set:Server Operation

|  Metric name   | Metric unit |                     Metric help description                      |
|----------------|-------------|------------------------------------------------------------------|
| scanAndOrder   | none        | The number of times a query required both scanning and ordering. |
| writeConflicts | none        | The number of write conflicts that occurred.                     |

#### Metric set: Max Connections

|   Metric name    | Metric unit |          Metric help description           |
|------------------|-------------|--------------------------------------------|
| deletedDocuments | none        | Number of deleted documents.               |
| passes           | none        | Total number of passes for TTL operations. |

#### Metric set:System Info

| Metric name | Metric unit |               Metric help description                |
|-------------|-------------|------------------------------------------------------|
| currentTime | none        | Current system time.                                 |
| hostname    | none        | Hostname of the server.                              |
| cpuAddrSize | MB          | Size of CPU address in bits.                         |
| memSizeMB   | MB          | Total size of system memory in megabytes.            |
| memLimitMB  | MB          | Memory limit for the MongoDB process in megabytes.   |
| numCores    | none        | Total number of CPU cores.                           |
| cpuArch     | none        | CPU architecture.                                    |
| numaEnabled | none        | Whether NUMA (Non-Uniform Memory Access) is enabled. |

#### Metric set:OS Info

| Metric name | Metric unit |     Metric help description      |
|-------------|-------------|----------------------------------|
| type        | none        | Type of the operating system.    |
| name        | none        | Name of the operating system.    |
| version     | none        | Version of the operating system. |

#### Metric set：Extra Info

|   Metric name   | Metric unit |                Metric help description                 |
|-----------------|-------------|--------------------------------------------------------|
| versionString   | none        | String describing the version of the operating system. |
| libcVersion     | none        | Version of the C standard library (libc).              |
| kernelVersion   | none        | Version of the operating system kernel.                |
| cpuFrequencyMHz | none        | Frequency of the CPU in megahertz.                     |
| cpuFeatures     | none        | Features supported by the CPU.                         |
| pageSize        | none        | Size of a memory page in bytes.                        |
| numPages        | none        | Total number of memory pages.                          |
| maxOpenFiles    | none        | Maximum number of open files allowed.                  |
