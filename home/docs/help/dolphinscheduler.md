---
id: dolphinscheduler
title: Monitoring： Apache DolphinScheduler
sidebar_label: Apache DolphinScheduler
keywords: [ Open Source Monitoring System, Monitor Apache DolphinScheduler ]
---

> Collect monitoring metrics for Apache DolphinScheduler.

## Pre-monitoring operations

> Support Apache DolphinScheduler version 3.3.0 or later

You need to create a token in Apache DolphinScheduler.

Please refer to [Open API](https://dolphinscheduler.apache.org/zh-cn/docs/3.2.2/guide/api/open-api) to create a new token.The main steps are as follows

1. Log in to the Apache DolphinScheduler system, click "Security", then click "Token manage" on the left, and click "Create token" to create a token.
2. Select the "Expiration time" (Token validity time), select "User" (choose the specified user to perform the API operation), click "Generate token", copy the Token string, and click "Submit".

## Configuration Parameters

| Parameter Name      | Parameter Help Description                                                                                      |
|---------------------|-----------------------------------------------------------------------------------------------------------------|
| Target Host         | The monitored endpoint's IPV4, IPV6, or domain name. Note ⚠️ no protocol header (e.g., https://, http://).      |
| Task Name           | The name that identifies this monitoring task, which needs to be unique.                                        |
| Port                | The monitoring port opened by DolphinScheduler, default value: 12345.                                           |
| SSL                 | Whether SSL is enabled for connecting to DolphinScheduler.                                                      |
| Token               | Apache DolphinScheduler token string.                                                                           |
| Query Timeout       | Set the timeout for unresponsive queries, in milliseconds (ms), default 6000 ms.                                |
| Collection Interval | The interval time for periodic data collection, in seconds; the minimum interval that can be set is 30 seconds. |
| Binding Tags        | Used for categorizing and managing monitoring resources.                                                        |
| Description Notes   | Additional identification and description notes for this monitoring; users can add notes here.                  |

## Collected Metrics

### Metric Set: Master

| Metric Name    | Metric Unit   | Metric Help Description |
|----------------|---------------|-------------------------|
| host           | None          | Host                    |
| port           | None          | Port                    |
| serverStatus   | None          | Server Status           |
| processId      | None          | Process Id              |
| runningTime    | Day           | Running Time            |
| cpuUsage       | Percentage(%) | CPU Usage               |
| memoryUsage    | Percentage(%) | Memory Usage            |
| diskUsage      | Percentage(%) | Disk Usage              |
| jvmCpuUsage    | Percentage(%) | JVM CPU Usage           |
| jvmMemoryUsage | Percentage(%) | JVM Memory Usage        |
| jvmHeapUsed    | None          | JVM Heap Used           |
| jvmNonHeapUsed | None          | JVM NonHeap Used        |
| jvmHeapMax     | None          | JVM Heap Max            |
| jvmNonHeapMax  | None          | JVM NonHeap Max         |

### Metric Set: Worker

| Metric Name      | Metric Unit   | Metric Help Description |
|------------------|---------------|-------------------------|
| host             | None          | Host                    |
| port             | None          | Port                    |
| serverStatus     | None          | Server Status           |
| processId        | None          | Process Id              |
| runningTime      | Day           | Running Time            |
| cpuUsage         | Percentage(%) | CPU Usage               |
| memoryUsage      | Percentage(%) | Memory Usage            |
| diskUsage        | Percentage(%) | Disk Usage              |
| jvmCpuUsage      | Percentage(%) | JVM CPU Usage           |
| jvmMemoryUsage   | Percentage(%) | JVM Memory Usage        |
| jvmHeapUsed      | None          | JVM Heap Used           |
| jvmNonHeapUsed   | None          | JVM NonHeap Used        |
| jvmHeapMax       | None          | JVM Heap Max            |
| jvmNonHeapMax    | None          | JVM NonHeap Max         |
| workerHostWeight | None          | Weight                  |
| threadPoolUsage  | None          | Thread Pool Usage       |
| workerGroup      | None          | Worker Group            |

### Metric Set: Alert Server

| Metric Name    | Metric Unit   | Metric Help Description |
|----------------|---------------|-------------------------|
| host           | None          | Host                    |
| port           | None          | Port                    |
| serverStatus   | None          | Server Status           |
| processId      | None          | Process Id              |
| runningTime    | Day           | Running Time            |
| cpuUsage       | Percentage(%) | CPU Usage               |
| memoryUsage    | Percentage(%) | Memory Usage            |
| diskUsage      | Percentage(%) | Disk Usage              |
| jvmCpuUsage    | Percentage(%) | JVM CPU Usage           |
| jvmMemoryUsage | Percentage(%) | JVM Memory Usage        |
| jvmHeapUsed    | None          | JVM Heap Used           |
| jvmNonHeapUsed | None          | JVM NonHeap Used        |
| jvmHeapMax     | None          | JVM Heap Max            |
| jvmNonHeapMax  | None          | JVM NonHeap Max         |

### Metric Set: Database

| Metric Name               | Metric Unit | Metric Help Description     |
|---------------------------|-------------|-----------------------------|
| dbType                    | None        | Database Type               |
| state                     | None        | State                       |
| maxConnections            | None        | Max Connections             |
| threadsConnections        | None        | Threads Connections         |
| threadsRunningConnections | Day         | Threads Running Connections |
