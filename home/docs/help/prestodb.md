---
id: presto
title: Monitoring PrestoDB Atlas Database
sidebar_label: PrestoDB Atlas Database
keywords: [ PrestoDB Atlas  monitoring]
---
> Collect and monitor general performance metrics of PrestoDB Atlas databases.

### Configuration Parameters


| Parameter Name      | Parameter Description                                                                                                                         |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IP address, IPv4, IPv6, or domain name of the target to be monitored. Note: ⚠️ Do not include protocol headers (e.g., https://, http://). |
| port                | Port                                                                                                                                          |
| Task Name           | The name identifying this monitor, which must be unique.                                                                                      |
| Connection Timeout  | Timeout for PrestoDB connection when no response is received, in milliseconds (ms). Default is 6000 ms.                                       |
| Collection Interval | Interval for periodic data collection, in seconds. The minimum interval is 30 seconds.                                                        |
| Binding Tags        | Used for categorizing and managing monitoring resources.                                                                                      |
| Description/Remarks | Additional labels and description for this monitor; users can add notes here.                                                                 |

### Collection Metrics

#### Metric Set: Cluster Status


| Metric Name      | Unit | Metric Description              |
| ---------------- | ---- | ------------------------------- |
| activeWorkers          | None | Active Workers     |
| runningQueries       | None | Running Queries          |
| queuedQueries          | None |  Queued Queries              |
| blockedQueries        | None | Blocked Queries |
| runningDrivers | None | Running Drivers|
| runningTasks | None | Running Tasks |

#### Metric Set:  Node Status


| Metric Name | Unit | Metric Description                                |
| ----------- | ---- | ------------------------------------------------- |
| nodeId      | None | Node ID                             |
| nodeVersion      | None | Node Version                             |
| environment      | None | Environment                                |
| coordinator       | None | Is Coordinator                       |
| uptime     | None |Uptime|
| externalAddress     | None |  External Address                |
| internalAddress     | None | Internal Address             |
| processors     | None |Processors              |
| processCpuLoad     | None | Process CPU Load              |
| systemCpuLoad     | None | System CPU Load                |
| heapUsed     | MB | Heap Memory Used               |
| heapAvailable     | MB | Heap Memory Available               |
| nonHeapUsed     | MB | Non-Heap Memory Used          |


#### Metric Set: Task Query


| Metric Name | Unit | Metric Description                                  |
| ----------- | ---- | --------------------------------------------------- |
| taskId  | None | Task ID |
| version  | None | Version                          |
| state| None | State                          |
| self| None | Self                                  |
| lastHeartbeat| None |  Last Heartbeat                                |

