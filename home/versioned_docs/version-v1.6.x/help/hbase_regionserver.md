---
id:  hbase_regionserver  
title: Monitoring HBase RegionServer Monitoring  
sidebar_label: HBase RegionServer Monitoring  
keywords: [Open-source monitoring system, Open-source database monitoring, RegionServer monitoring]
---

> Collect and monitor common performance metrics for HBase RegionServer.

**Protocol:** HTTP

## Pre-Monitoring Operations

Review the `hbase-site.xml` file to obtain the value of the `hbase.regionserver.info.port` configuration item, which is used for monitoring.

## Configuration Parameters

|   Parameter Name    |                                                               Parameter Description                                                                |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IPV4, IPV6, or domain name of the monitored entity. Note ⚠️ Do not include the protocol header (e.g., https://, http://).                      |
| Port                | The port number of the HBase regionserver, default is 16030, i.e., the value of the`hbase.regionserver.info.port` parameter                        |
| Task Name           | A unique name to identify this monitoring task.                                                                                                    |
| Query Timeout       | Set the connection timeout in ms, the default is 3000 milliseconds.                                                                                |
| Collection Interval | The interval time for periodic data collection in seconds, with a minimum interval of 30 seconds.                                                  |
| Probe Before Adding | Whether to probe and check the availability of monitoring before adding new monitoring, only proceed with the addition if the probe is successful. |
| Description Note    | Additional notes to identify and describe this monitoring, users can add notes here.                                                               |

### Collection Metrics

> All metric names are directly referenced from the official fields, hence there may be non-standard naming.

#### Metric Set: server

|            Metric Name            | Unit  |                            Metric Description                             |
|-----------------------------------|-------|---------------------------------------------------------------------------|
| regionCount                       | None  | Number of Regions                                                         |
| readRequestCount                  | None  | Number of read requests since cluster restart                             |
| writeRequestCount                 | None  | Number of write requests since cluster restart                            |
| averageRegionSize                 | MB    | Average size of a Region                                                  |
| totalRequestCount                 | None  | Total number of requests                                                  |
| ScanTime_num_ops                  | None  | Total number of Scan requests                                             |
| Append_num_ops                    | None  | Total number of Append requests                                           |
| Increment_num_ops                 | None  | Total number of Increment requests                                        |
| Get_num_ops                       | None  | Total number of Get requests                                              |
| Delete_num_ops                    | None  | Total number of Delete requests                                           |
| Put_num_ops                       | None  | Total number of Put requests                                              |
| ScanTime_mean                     | None  | Average time of a Scan request                                            |
| ScanTime_min                      | None  | Minimum time of a Scan request                                            |
| ScanTime_max                      | None  | Maximum time of a Scan request                                            |
| ScanSize_mean                     | bytes | Average size of a Scan request                                            |
| ScanSize_min                      | None  | Minimum size of a Scan request                                            |
| ScanSize_max                      | None  | Maximum size of a Scan request                                            |
| slowPutCount                      | None  | Number of slow Put operations                                             |
| slowGetCount                      | None  | Number of slow Get operations                                             |
| slowAppendCount                   | None  | Number of slow Append operations                                          |
| slowIncrementCount                | None  | Number of slow Increment operations                                       |
| slowDeleteCount                   | None  | Number of slow Delete operations                                          |
| blockCacheSize                    | None  | Size of memory used by block cache                                        |
| blockCacheCount                   | None  | Number of blocks in Block Cache                                           |
| blockCacheExpressHitPercent       | None  | Block cache hit ratio                                                     |
| memStoreSize                      | None  | Size of Memstore                                                          |
| FlushTime_num_ops                 | None  | Number of RS writes to disk/Memstore flushes                              |
| flushQueueLength                  | None  | Length of Region Flush queue                                              |
| flushedCellsSize                  | None  | Size flushed to disk                                                      |
| storeFileCount                    | None  | Number of Storefiles                                                      |
| storeCount                        | None  | Number of Stores                                                          |
| storeFileSize                     | None  | Size of Storefiles                                                        |
| compactionQueueLength             | None  | Length of Compaction queue                                                |
| percentFilesLocal                 | None  | Percentage of HFile in local HDFS Data Node                               |
| percentFilesLocalSecondaryRegions | None  | Percentage of HFile for secondary region replicas in local HDFS Data Node |
| hlogFileCount                     | None  | Number of WAL files                                                       |
| hlogFileSize                      | None  | Size of WAL files                                                         |

#### Metric Set: IPC

|        Metric Name        | Unit |           Metric Description           |
|---------------------------|------|----------------------------------------|
| numActiveHandler          | None | Current number of RITs                 |
| NotServingRegionException | None | Number of RITs exceeding the threshold |
| RegionMovedException      | ms   | Duration of the oldest RIT             |
| RegionTooBusyException    | ms   | Duration of the oldest RIT             |

#### Metric Set: JVM

|     Metric Name      | Unit |        Metric Description         |
|----------------------|------|-----------------------------------|
| MemNonHeapUsedM      | None | Current active RegionServer list  |
| MemNonHeapCommittedM | None | Current offline RegionServer list |
| MemHeapUsedM         | None | Zookeeper list                    |
| MemHeapCommittedM    | None | Master node                       |
| MemHeapMaxM          | None | Cluster balance load times        |
| MemMaxM              | None | RPC handle count                  |
| GcCount              | MB   | Cluster data reception volume     |
