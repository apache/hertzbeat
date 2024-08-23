---
id: yarn
title: Monitoring Apache Yarn Monitoring
sidebar_label: Apache Yarn
keywords: [Big Data Monitoring System, Apache Yarn Monitoring, ResourceManager Monitoring]
---

> Hertzbeat monitors Apache Yarn node monitoring metrics.

**Protocol Used: HTTP**

## Pre-monitoring Actions

Retrieve the HTTP monitoring port of Apache Yarn. Value: `yarn.resourcemanager.webapp.address`

## Configuration Parameters

|  Parameter Name  |                                   Parameter Description                                   |
|------------------|-------------------------------------------------------------------------------------------|
| Target Host      | IP address, IPV6, or domain name of the monitored endpoint. Without protocol header.      |
| Port             | Monitoring port number of Apache Yarn, default is 8088.                                   |
| Query Timeout    | Timeout for querying Apache Yarn, in milliseconds, default is 6000 milliseconds.          |
| Metrics Interval | Time interval for monitoring data collection, in seconds, minimum interval is 30 seconds. |

### Collected Metrics

#### Metric Set: ClusterMetrics

|      Metric Name      | Unit |               Metric Description                |
|-----------------------|------|-------------------------------------------------|
| NumActiveNMs          |      | Number of currently active NodeManagers         |
| NumDecommissionedNMs  |      | Number of currently decommissioned NodeManagers |
| NumDecommissioningNMs |      | Number of nodes currently decommissioning       |
| NumLostNMs            |      | Number of lost nodes in the cluster             |
| NumUnhealthyNMs       |      | Number of unhealthy nodes in the cluster        |

#### Metric Set: JvmMetrics

|     Metric Name      | Unit |                Metric Description                |
|----------------------|------|--------------------------------------------------|
| MemNonHeapCommittedM | MB   | Current committed size of non-heap memory in JVM |
| MemNonHeapMaxM       | MB   | Maximum available non-heap memory in JVM         |
| MemNonHeapUsedM      | MB   | Current used size of non-heap memory in JVM      |
| MemHeapCommittedM    | MB   | Current committed size of heap memory in JVM     |
| MemHeapMaxM          | MB   | Maximum available heap memory in JVM             |
| MemHeapUsedM         | MB   | Current used size of heap memory in JVM          |
| GcTimeMillis         |      | JVM GC time                                      |
| GcCount              |      | Number of JVM GC occurrences                     |

#### Metric Set: QueueMetrics

|         Metric Name          | Unit |                 Metric Description                  |
|------------------------------|------|-----------------------------------------------------|
| queue                        |      | Queue name                                          |
| AllocatedVCores              |      | Allocated virtual cores (allocated)                 |
| ReservedVCores               |      | Reserved cores                                      |
| AvailableVCores              |      | Available cores (unallocated)                       |
| PendingVCores                |      | Blocked scheduling cores                            |
| AllocatedMB                  | MB   | Allocated (used) memory size                        |
| AvailableMB                  | MB   | Available memory (unallocated)                      |
| PendingMB                    | MB   | Blocked scheduling memory                           |
| ReservedMB                   | MB   | Reserved memory                                     |
| AllocatedContainers          |      | Number of allocated (used) containers               |
| PendingContainers            |      | Number of blocked scheduling containers             |
| ReservedContainers           |      | Number of reserved containers                       |
| AggregateContainersAllocated |      | Total aggregated containers allocated               |
| AggregateContainersReleased  |      | Total aggregated containers released                |
| AppsCompleted                |      | Number of completed applications                    |
| AppsKilled                   |      | Number of killed applications                       |
| AppsFailed                   |      | Number of failed applications                       |
| AppsPending                  |      | Number of pending applications                      |
| AppsRunning                  |      | Number of currently running applications            |
| AppsSubmitted                |      | Number of submitted applications                    |
| running_0                    |      | Number of jobs running for less than 60 minutes     |
| running_60                   |      | Number of jobs running between 60 and 300 minutes   |
| running_300                  |      | Number of jobs running between 300 and 1440 minutes |
| running_1440                 |      | Number of jobs running for more than 1440 minutes   |

#### Metric Set: runtime

| Metric Name | Unit | Metric Description |
|-------------|------|--------------------|
| StartTime   |      | Startup timestamp  |
