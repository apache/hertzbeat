---
id: flink  
title: Monitoring Flink      
sidebar_label: Flink
keywords: [open source monitoring tool, open source flink monitoring tool]
---

> Collect and monitor the general performance Metrics of Flink.

### Configuration parameter

|   Parameter Name    |                                                 Parameter Help Description                                                  |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Monitor Host        | The monitored peer IPV4, IPV6, or domain name. Note: Do not include protocol headers (e.g., https://, http://).             |
| Task Name           | Identifier for this monitoring task, name must be unique.                                                                   |
| Port                | Monitoring port.                                                                                                            |
| Query Timeout       | Sets the timeout for JVM connection in milliseconds, default is 3000 milliseconds.                                          |
| SSL                 | Whether to enable SSL (default is off).                                                                                     |
| Username            | Connection username.                                                                                                        |
| Password            | Connection password.                                                                                                        |
| Collection Interval | Interval for periodic data collection during monitoring, in seconds. The minimum settable interval is 30 seconds.           |
| Whether to detect   | Whether to perform a probe check for monitoring availability before adding a new monitor; operations proceed if successful. |
| Description Remarks | Additional identifiers and descriptions for this monitoring, where users can note information.                              |

### Collection Metrics

#### Metrics Set：Overview

| Metric Name  | Metric Unit | Metric Help Description |
|--------------|-------------|-------------------------|
| slots_total  | Units       | Total number of slots.  |
| slots_used   | Units       | Number of slots used.   |
| task_total   | Units       | Total number of tasks.  |
| jobs_running | Units       | Number of jobs running. |
| jobs_failed  | Units       | Number of jobs failed.  |
