---
id: debian
title: Monitoring Debian System Monitoring
sidebar_label: Debian
keywords: [Open Source Monitoring System, Operating System Monitoring, Debian Monitoring]
---

> Collect and monitor general performance metrics of the Debian system.

## Configuration Parameters

|     Parameter Name      |                                              Metric help description                                              |
|-------------------------|-------------------------------------------------------------------------------------------------------------------|
| Target Host             | The monitored destination IPV4, IPV6, or domain name. Note: no protocol header (e.g., https://, http://).         |
| Task Name               | A unique name to identify this monitoring task.                                                                   |
| Port                    | SSH port of the Debian system, default: 22                                                                        |
| Timeout                 | Timeout for the connection, in milliseconds, default: 6000 milliseconds.                                          |
| Connection Reuse        | Whether to reuse the SSH connection, default: false. False means a new connection will be created for each query. |
| Username                | Server username                                                                                                   |
| Password                | Server password                                                                                                   |
| Collector               | Configure which collector to use for scheduling this monitoring.                                                  |
| Monitoring Period       | The interval for periodically collecting data, in seconds, with a minimum interval of 30 seconds.                 |
| Binding Tags            | Used for categorizing and managing monitoring resources.                                                          |
| Metric help description | Additional notes and Metric help descriptions for this monitoring, users can add notes here.                      |
| Key                     | Key required to connect to the server.                                                                            |

### Monitoring Metrics

#### Metric Set: Basic System Information

|  Metric Name   | Metric Unit | Metric help description  |
|----------------|-------------|--------------------------|
| Host Name      | N/A         | Host name                |
| System Version | N/A         | Operating system version |
| Uptime         | N/A         | Boot time                |

#### Metric Set: CPU Information

|  Metric Name   | Metric Unit | Metric help description |
|----------------|-------------|-------------------------|
| Info           | N/A         | Model                   |
| Cores          | N/A         | Number of cores         |
| Interrupt      | N/A         | Number of interrupts    |
| Load           | N/A         | Load                    |
| Context Switch | N/A         | Context switches        |
| Usage          | %           | Usage rate              |

#### Metric Set: Memory Information

|     Metric Name     | Metric Unit |   Metric help description    |
|---------------------|-------------|------------------------------|
| Total Memory        | Mb          | Total memory capacity        |
| User Program Memory | Mb          | Memory used by user programs |
| Free Memory         | Mb          | Free memory capacity         |
| Buff Cache Memory   | Mb          | Memory used by cache         |
| Available Memory    | Mb          | Available memory             |
| Memory Usage        | %           | Memory usage rate            |

#### Metric Set: Disk Information

|  Metric Name  | Metric Unit |    Metric help description    |
|---------------|-------------|-------------------------------|
| Disk Num      | N/A         | Total number of disks         |
| Partition Num | N/A         | Total number of partitions    |
| Block Write   | N/A         | Number of disk blocks written |
| Block Read    | N/A         | Number of disk blocks read    |
| Write Rate    | iops        | Disk write rate               |

#### Metric Set: Network Interface Information

Statistics for all network interface cards, including interface name, incoming data traffic, and outgoing data traffic.
Metric Unit: Mb

#### Metric Set: File System

Statistics for all mounted file systems. Statistics include: file system, usage, available space, usage rate, mount point.
Metric Unit:

- Usage: Mb
- Available Space: Mb
- Usage Rate: %

#### Metric Set: Top 10 CPU Processes

Statistics for the top 10 processes by CPU usage. Statistics include: process ID, CPU usage rate, memory usage rate, command being executed.
Metric Unit:

- CPU Usage Rate: %
- Memory Usage Rate: %

#### Metric Set: Top 10 Memory Processes

Statistics for the top 10 processes by memory usage. Statistics include: process ID, memory usage rate, CPU usage rate, command being executed.
Metric Unit:

- Memory Usage Rate: %
- CPU Usage Rate: %
