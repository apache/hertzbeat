---
id: hdfs_namenode
title: Monitoring HDFS NameNode Monitoring
sidebar_label: Apache HDFS NameNode
keywords: [big data monitoring system, distributed file system monitoring, HDFS NameNode monitoring]
---

> Hertzbeat monitors metrics for HDFS NameNode nodes.

**Protocol Used: HTTP**

## Pre-Monitoring Actions

Ensure that you have obtained the JMX monitoring port for the HDFS NameNode.

## Configuration Parameters

|       Parameter Name        |                                   Parameter Description                                   |
|-----------------------------|-------------------------------------------------------------------------------------------|
| Target Host                 | The IPv4, IPv6, or domain name of the target being monitored. Exclude protocol headers.   |
| Port                        | The monitoring port number of the HDFS NameNode, default is 50070.                        |
| Query Timeout               | Timeout for querying the HDFS NameNode, in milliseconds, default is 6000 milliseconds.    |
| Metrics Collection Interval | Time interval for collecting monitoring data, in seconds, minimum interval is 30 seconds. |
| Probe Before Monitoring     | Whether to probe and check the availability of monitoring before adding it.               |
| Description/Remarks         | Additional description and remarks for this monitoring.                                   |

### Collected Metrics

#### Metric Set: FSNamesystem

|           Metric Name           | Metric Unit |                     Metric Description                     |
|---------------------------------|-------------|------------------------------------------------------------|
| CapacityTotal                   |             | Total cluster storage capacity                             |
| CapacityTotalGB                 | GB          | Total cluster storage capacity                             |
| CapacityUsed                    |             | Used cluster storage capacity                              |
| CapacityUsedGB                  | GB          | Used cluster storage capacity                              |
| CapacityRemaining               |             | Remaining cluster storage capacity                         |
| CapacityRemainingGB             | GB          | Remaining cluster storage capacity                         |
| CapacityUsedNonDFS              |             | Non-HDFS usage of cluster capacity                         |
| TotalLoad                       |             | Total client connections in the cluster                    |
| FilesTotal                      |             | Total number of files in the cluster                       |
| BlocksTotal                     |             | Total number of BLOCKs                                     |
| PendingReplicationBlocks        |             | Number of blocks awaiting replication                      |
| UnderReplicatedBlocks           |             | Number of blocks with insufficient replicas                |
| CorruptBlocks                   |             | Number of corrupt blocks                                   |
| ScheduledReplicationBlocks      |             | Number of blocks scheduled for replication                 |
| PendingDeletionBlocks           |             | Number of blocks awaiting deletion                         |
| ExcessBlocks                    |             | Number of excess blocks                                    |
| PostponedMisreplicatedBlocks    |             | Number of misreplicated blocks postponed for processing    |
| NumLiveDataNodes                |             | Number of live data nodes in the cluster                   |
| NumDeadDataNodes                |             | Number of data nodes marked as dead                        |
| NumDecomLiveDataNodes           |             | Number of decommissioned live nodes                        |
| NumDecomDeadDataNodes           |             | Number of decommissioned dead nodes                        |
| NumDecommissioningDataNodes     |             | Number of nodes currently being decommissioned             |
| TransactionsSinceLastCheckpoint |             | Number of transactions since the last checkpoint           |
| LastCheckpointTime              |             | Time of the last checkpoint                                |
| PendingDataNodeMessageCount     |             | Number of DATANODE requests queued in the standby namenode |

#### Metric Set: RPC

|    Metric Name     | Metric Unit | Metric Description  |
|--------------------|-------------|---------------------|
| ReceivedBytes      |             | Data receiving rate |
| SentBytes          |             | Data sending rate   |
| RpcQueueTimeNumOps |             | RPC call rate       |

#### Metric Set: runtime

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| StartTime   |             | Start time         |

#### Metric Set: JvmMetrics

|           Metric Name           | Metric Unit  |            Metric Description            |
|---------------------------------|--------------|------------------------------------------|
| MemNonHeapUsedM                 | MB           | Current usage of NonHeapMemory by JVM    |
| MemNonHeapCommittedM            | MB           | Committed NonHeapMemory by JVM           |
| MemHeapUsedM                    | MB           | Current usage of HeapMemory by JVM       |
| MemHeapCommittedM               | MB           | Committed HeapMemory by JVM              |
| MemHeapMaxM                     | MB           | Maximum HeapMemory configured for JVM    |
| MemMaxM                         | MB           | Maximum memory that can be used by JVM   |
| GcCountParNew                   | Count        | Number of ParNew GC events               |
| GcTimeMillisParNew              | Milliseconds | Time spent in ParNew GC                  |
| GcCountConcurrentMarkSweep      | Count        | Number of ConcurrentMarkSweep GC events  |
| GcTimeMillisConcurrentMarkSweep | Milliseconds | Time spent in ConcurrentMarkSweep GC     |
| GcCount                         | Count        | Total number of GC events                |
| GcTimeMillis                    | Milliseconds | Total time spent in GC events            |
| ThreadsRunnable                 | Count        | Number of threads in RUNNABLE state      |
| ThreadsBlocked                  | Count        | Number of threads in BLOCKED state       |
| ThreadsWaiting                  | Count        | Number of threads in WAITING state       |
| ThreadsTimedWaiting             | Count        | Number of threads in TIMED WAITING state |
