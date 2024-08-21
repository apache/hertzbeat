---
id: process
title: Monitoring Linux Process Monitoring
sidebar_label: Process
keywords: [Open Source Monitoring System, Operating System Process Monitoring, Process Monitoring]
---

> Collect and monitor basic information of processes on Linux systems, including CPU usage, memory usage, physical memory, IO, etc.

## Configuration Parameters

|   Parameter Name    |                                                      Parameter Description                                                       |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The IPv4, IPv6, or domain name of the monitored endpoint. Note ⚠️: Do not include the protocol header (e.g., https://, http://). |
| Task Name           | Identifies the name of this monitoring, ensuring uniqueness.                                                                     |
| Port                | SSH port of the Linux system, default: 22                                                                                        |
| Timeout             | Sets the timeout for the connection in milliseconds, default is 6000 milliseconds.                                               |
| Reuse Connection    | Sets whether SSH connection is reused, default is false. When false, a new connection is created for each information retrieval. |
| Username            | Username for the server.                                                                                                         |
| Password            | Password for the server.                                                                                                         |
| Process Name        | Name or part of the name of the process to be monitored.                                                                         |
| Collector           | Specifies which collector to use for scheduling this monitoring.                                                                 |
| Monitoring Interval | Interval for periodic data collection, in seconds. Minimum interval that can be set is 30 seconds.                               |
| Tags                | Used for categorizing and managing monitoring resources.                                                                         |
| Description         | Additional notes and descriptions for identifying this monitoring. Users can add remarks here.                                   |
| Private Key         | Private key required for connecting to the server.                                                                               |

### Metrics Collected

#### Metric Set: Process Basic Information

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| PID         | NONE        | Process ID         |
| User        | NONE        | User               |
| CPU         | NONE        | CPU Usage          |
| MEM         | NONE        | Memory Usage       |
| rss         | NONE        | Physical Memory    |
| cmd         | NONE        | Command            |

#### Metric Set: Memory Usage Information

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| PID         | NONE        | Process ID         |
| detail      | NONE        | Detailed metrics   |

Includes metrics for:

- Peak Virtual Memory
- Current Virtual Memory Usage
- Locked Memory
- Fixed Memory
- Peak Physical Memory
- Current Physical Memory Usage
- Data Segment Size
- Stack Size
- Code Size
- Shared Library Size
- Page Table Entry Size

#### Metric Set: Other Monitoring Information

| Metric Name | Metric Unit |        Metric Description         |
|-------------|-------------|-----------------------------------|
| PID         | NONE        | Process ID                        |
| path        | NONE        | Execution Path                    |
| date        | NONE        | Start Time                        |
| fd_count    | NONE        | Number of File Descriptors Opened |

#### Metric Set: IO

| Metric Name | Metric Unit | Metric Description |
|-------------|-------------|--------------------|
| PID         | NONE        | Process ID         |
| metric      | NONE        | Metric Name        |
| value       | NONE        | Metric Value       |

Includes metrics for:

- rchar (Total bytes read by the process from disk or other files)
- wchar (Total bytes written by the process to disk or other files)
- syscr (Number of read operations initiated by the process)
- syscw (Number of write operations initiated by the process)
- read_bytes (Actual number of bytes read by the process from disk)
- write_bytes (Actual number of bytes written by the process to disk)
- cancelled_write_bytes (Actual number of bytes cancelled by the process while writing to disk)
