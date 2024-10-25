---
id: seatunnel
title: Monitoring： SeaTunnel
sidebar_label: SeaTunnel
keywords: [ Open Source Monitoring System, Monitor SeaTunnel ]
---

> Collect monitoring metrics for SeaTunnel.

### Configuration Parameters

| Parameter Name    | Parameter Help Description                                                                                      |
|-------------------|-----------------------------------------------------------------------------------------------------------------|
| Target Host       | The monitored endpoint's IPV4, IPV6, or domain name. Note ⚠️ no protocol header (e.g., https://, http://).      |
| Task Name         | The name that identifies this monitoring task, which needs to be unique.                                        |
| Port              | The monitoring port opened by SeaTunnel, default value: 5801.                                                   |
| SSL                 | Whether SSL is enabled for connecting to SeaTunnel.                                                             |
| Query Timeout     | Set the timeout for unresponsive queries, in milliseconds (ms), default 6000 ms.                                |
| Collection Interval| The interval time for periodic data collection, in seconds; the minimum interval that can be set is 30 seconds. |
| Binding Tags      | Used for categorizing and managing monitoring resources.                                                        |
| Description Notes  | Additional identification and description notes for this monitoring; users can add notes here.                  |

### Collected Metrics

#### Metric Set: Cluster Overview

| Metric Name           | Metric Unit | Metric Help Description   |
|-----------------------|-------------|----------------------------|
| projectVersion        | None        | Project version            |
| gitCommitAbbrev      | None        | Git commit hash            |
| totalSlot             | None        | Total number of slots      |
| unassignedSlot        | None        | Number of unassigned slots  |
| runningJobs           | None        | Number of running tasks     |
| finishedJobs          | None        | Number of completed tasks   |
| failedJobs            | None        | Number of failed tasks      |
| cancelledJobs         | None        | Number of cancelled tasks   |
| workers               | None        | Number of workers           |

#### Metric Set: Thread Information

| Metric Name     | Metric Unit | Metric Help Description |
|------------------|-------------|-------------------------|
| threadName       | None        | Thread name             |
| threadId         | None        | Thread ID               |
| threadState      | None        | Thread state            |
| stackTrace       | None        | Stack trace information  |

#### Metric Set: Node Monitoring

| Metric Name                     | Metric Unit | Metric Help Description     |
|---------------------------------|-------------|------------------------------|
| isMaster                        | None        | Whether it is a master node  |
| host                            | None        | IP address                   |
| port                            | None        | Port                         |
| processors                      | None        | Number of processors         |
| physical.memory.total           | None        | Total physical memory        |
| physical.memory.free            | None        | Available physical memory    |
| swap.space.total                | None        | Total swap space            |
| swap.space.free                 | None        | Available swap space         |
| heap.memory.used                | None        | Used heap memory             |
| heap.memory.free                | None        | Available heap memory        |
| heap.memory.total               | None        | Total heap memory            |
| heap.memory.max                 | None        | Maximum heap memory          |
| heap.memory.used/total          | None        | Heap memory usage rate       |
| heap.memory.used/max            | None        | Maximum heap memory usage rate|
| minor.gc.count                  | None        | Minor garbage collection count|
| minor.gc.time                   | None        | Minor garbage collection time |
| major.gc.count                  | None        | Major garbage collection count|
| major.gc.time                   | None        | Major garbage collection time |
| load.process                    | None        | Process load                 |
| load.system                     | None        | System load                  |
| load.systemAverage              | None        | Average system load          |
| thread.count                    | None        | Number of threads            |
| thread.peakCount                | None        | Peak thread count            |
| cluster.timeDiff                | None        | Cluster time difference       |
| event.q.size                   | None        | Event queue size             |
| executor.q.async.size           | None        | Asynchronous execution queue size |
| executor.q.client.size          | None        | Client execution queue size  |
| executor.q.client.query.size    | None        | Client query queue size      |
| executor.q.client.blocking.size | None        | Client blocking queue size    |
| executor.q.query.size           | None        | Query queue size             |
| executor.q.scheduled.size       | None        | Scheduled execution queue size |
| executor.q.io.size              | None        | IO queue size                |
| executor.q.system.size          | None        | System execution queue size   |
| executor.q.operations.size      | None        | Operations queue size        |
| executor.q.priorityOperation.size| None       | Priority operations queue size |
| operations.completed.count       | None        | Completed operations count    |
| executor.q.mapLoad.size         | None        | Map load queue size          |
| executor.q.mapLoadAllKeys.size  | None        | Map load all keys size       |
| executor.q.cluster.size         | None        | Cluster execution queue size  |
| executor.q.response.size        | None        | Response queue size          |
| operations.running.count         | None        | Number of running operations  |
| operations.pending.invocations.percentage | None | Percentage of pending invocations |
| operations.pending.invocations.count | None    | Number of pending invocations  |
| proxy.count                     | None        | Number of proxies            |
| clientEndpoint.count            | None        | Number of client endpoints    |
| connection.active.count         | None        | Number of active connections  |
| client.connection.count         | None        | Number of client connections   |
| connection.count                | None        | Total number of connections   |
