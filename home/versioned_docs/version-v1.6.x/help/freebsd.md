---
id: freebsd
title: Monitoring FreeBSD Operating System
sidebar_label: FreeBSD Operating System
keywords: [ Open Source Monitoring System, Open Source Operating System Monitoring, FreeBSD Operating System Monitoring ]
---

> Collect and monitor general performance metrics (system information, CPU, memory, disk, network cards, file systems, top resource processes, etc.) of the FreeBSD operating system.

### Configuration Parameters

|   Parameter Name    |                                                  Parameter help description                                                  |
|---------------------|------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | The IPv4, IPv6, or domain name of the monitored peer. Note ⚠️ without the protocol header (eg: https://, http://).           |
| Task Name           | Identifies the name of this monitor, ensuring uniqueness of the name.                                                        |
| Port                | The port where SSH for Linux is exposed, default is 22.                                                                      |
| Timeout             | Set the connection timeout, in milliseconds, default is 6000 milliseconds.                                                   |
| Reuse Connection    | Set whether SSH connections are reused, default is: false. If false, a connection is created for each information retrieval. |
| Username            | SSH connection username, optional.                                                                                           |
| Password            | SSH connection password, optional.                                                                                           |
| Collector           | Configure which collector to use for scheduling collection for this monitor.                                                 |
| Monitoring Interval | Interval for periodically collecting data, in seconds. The minimum interval that can be set is 30 seconds.                   |
| Bind Labels         | Used to categorize and manage monitored resources.                                                                           |
| Description         | Additional information for identifying and describing this monitor. Users can add remarks here.                              |
| PrivateKey          | Private key required to connect to the server.                                                                               |

### Collection Metrics

#### Metric Set: Basic Info

|  Metric Name   | Metric Unit | Metric help description  |
|----------------|-------------|--------------------------|
| Host Name      | None        | Host name                |
| System Version | None        | Operating system version |
| Uptime         | None        | System uptime            |

#### Metric Set: CPU Info

|  Metric Name   | Metric Unit |           Metric help description            |
|----------------|-------------|----------------------------------------------|
| info           | None        | CPU model                                    |
| cores          | Number      | Number of CPU cores                          |
| interrupt      | Number      | Number of CPU interrupts                     |
| load           | None        | Average CPU load for the last 1/5/15 minutes |
| context_switch | Number      | Current context switches                     |
| usage          | %           | CPU usage                                    |

#### Metric Set: Memory Info

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| physmem     | Mb          | Physical memory         |
| usermem     | Mb          | User program memory     |
| realmem     | Mb          | Actual memory           |
| availmem    | Mb          | Available memory        |

#### Metric Set: Disk Free

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| filesystem  | None        | File system name        |
| used        | Mb          | Used disk space         |
| available   | Mb          | Available disk space    |
| usage       | %           | Usage percentage        |
| mounted     | None        | Mount point directory   |

#### Metric Set: Top10 CPU Process

Statistics of the top 10 processes using CPU. Statistics include: Process ID, CPU usage, memory usage, executed command.

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| cpu_usage   | %           | CPU usage               |
| mem_usage   | %           | Memory usage            |
| command     | None        | Executed command        |

#### Metric Set: Top10 Memory Process

Statistics of the top 10 processes using memory. Statistics include: Process ID, memory usage, CPU usage, executed command.

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| mem_usage   | %           | Memory usage            |
| cpu_usage   | %           | CPU usage               |
| command     | None        | Executed command        |
