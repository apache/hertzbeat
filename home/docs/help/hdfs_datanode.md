---
id: hdfs_datanode
title: Monitoring Apache HDFS DataNode Monitoring
sidebar_label: Apache HDFS DataNode
keywords: [big data monitoring system, distributed file system monitoring, Apache HDFS DataNode monitoring]
---

> Hertzbeat monitors metrics for Apache HDFS DataNode nodes.

**Protocol Used: HTTP**

## Pre-monitoring Operations

Retrieve the HTTP monitoring port for the Apache HDFS DataNode. Value: `dfs.datanode.http.address`

## Configuration Parameters

|       Parameter Name        |                                   Parameter Description                                   |
|-----------------------------|-------------------------------------------------------------------------------------------|
| Target Host                 | IP(v4 or v6) or domain name of the target to be monitored. Exclude protocol.              |
| Port                        | Monitoring port number for Apache HDFS DataNode, default is 50075.                        |
| Query Timeout               | Timeout for querying Apache HDFS DataNode, in milliseconds, default is 6000 milliseconds. |
| Metrics Collection Interval | Time interval for monitoring data collection, in seconds, minimum interval is 30 seconds. |
| Probe Before Monitoring     | Whether to probe and check monitoring availability before adding.                         |
| Description/Remarks         | Additional description and remarks for this monitoring.                                   |

### Metrics Collected

#### Metric Set: FSDatasetState

| Metric Name | Metric Unit |        Metric Description        |
|-------------|-------------|----------------------------------|
| DfsUsed     | GB          | DataNode HDFS usage              |
| Remaining   | GB          | Remaining space on DataNode HDFS |
| Capacity    | GB          | Total capacity of DataNode HDFS  |

#### Metric Set: JvmMetrics

|     Metric Name      | Metric Unit |                Metric Description                 |
|----------------------|-------------|---------------------------------------------------|
| MemNonHeapUsedM      | MB          | Current usage of NonHeapMemory by JVM             |
| MemNonHeapCommittedM | MB          | Committed size of NonHeapMemory configured in JVM |
| MemHeapUsedM         | MB          | Current usage of HeapMemory by JVM                |
| MemHeapCommittedM    | MB          | Committed size of HeapMemory by JVM               |
| MemHeapMaxM          | MB          | Maximum size of HeapMemory configured in JVM      |
| MemMaxM              | MB          | Maximum memory available for JVM at runtime       |
| ThreadsRunnable      | Count       | Number of threads in RUNNABLE state               |
| ThreadsBlocked       | Count       | Number of threads in BLOCKED state                |
| ThreadsWaiting       | Count       | Number of threads in WAITING state                |
| ThreadsTimedWaiting  | Count       | Number of threads in TIMED WAITING state          |

#### Metric Set: runtime

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| StartTime   |             | Startup time       |
