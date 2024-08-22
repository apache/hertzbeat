---
id: redhat
title: Monitoring RedHat Operating System
sidebar_label: RedHat OS Operating System
keywords: [ Open Source Monitoring System, Open Source OS Monitoring, RedHat OS Monitoring ]
---

> Collect and monitor general performance metrics for RedHat operating systems (system information, CPU, memory, disk, network interface, file system, top resource processes, etc.).

### Configuration Parameters

|   Parameter Name    |                                                    Parameter help description                                                    |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | The IP, IPV6, or domain name of the monitored endpoint. Note ⚠️: Do not include protocol headers (eg: https://, http://).        |
| Task Name           | Identifies the name of this monitoring, ensuring uniqueness.                                                                     |
| Port                | Port provided by Linux SSH externally, defaults to 22.                                                                           |
| Timeout             | Sets the timeout for connection in milliseconds (ms), defaults to 6000 ms.                                                       |
| Connection Reuse    | Sets whether the SSH connection is reused, defaults to: false. Creates a new connection for each information retrieval if false. |
| Username            | SSH connection username, optional.                                                                                               |
| Password            | SSH connection password, optional.                                                                                               |
| Collector           | Specifies which collector schedules the collection for this monitoring.                                                          |
| Monitoring Interval | Interval for periodically collecting data, in seconds. Minimum interval is 30 seconds.                                           |
| Binding Tags        | Used for categorizing and managing monitored resources.                                                                          |
| Description         | Additional remarks and descriptions for this monitoring, for users' reference.                                                   |
| PrivateKey          | Key required for connecting to the server.                                                                                       |

### Collected Metrics

#### Metric Set: Basic Info

|  Metric Name   | Metric Unit |  Metric help description  |
|----------------|-------------|---------------------------|
| Host Name      | None        | Host name.                |
| System Version | None        | Operating system version. |
| Uptime         | None        | System uptime.            |

#### Metric Set: CPU Info

|  Metric Name   | Metric Unit |          Metric help description          |
|----------------|-------------|-------------------------------------------|
| info           | None        | CPU model.                                |
| cores          | None        | Number of CPU cores.                      |
| interrupt      | None        | Number of CPU interrupts.                 |
| load           | None        | Average load for the last 1/5/15 minutes. |
| context_switch | None        | Current context switches.                 |
| usage          | %           | CPU usage percentage.                     |

#### Metric Set: Memory Info

| Metric Name | Metric Unit |      Metric help description       |
|-------------|-------------|------------------------------------|
| total       | Mb          | Total memory capacity.             |
| used        | Mb          | Used memory by user programs.      |
| free        | Mb          | Free memory capacity.              |
| buff_cache  | Mb          | Memory used for buffers and cache. |
| available   | Mb          | Available memory capacity.         |
| usage       | %           | Memory usage percentage.           |

#### Metric Set: Disk Info

|  Metric Name  | Metric Unit |      Metric help description       |
|---------------|-------------|------------------------------------|
| disk_num      | None        | Total number of disks.             |
| partition_num | None        | Total number of partitions.        |
| block_write   | None        | Total blocks written to disk.      |
| block_read    | None        | Total blocks read from disk.       |
| write_rate    | iops        | Rate of blocks written per second. |

#### Metric Set: Interface Info

|  Metric Name   | Metric Unit |    Metric help description     |
|----------------|-------------|--------------------------------|
| interface_name | None        | Name of the network interface. |
| receive_bytes  | Mb          | Inbound data traffic.          |
| transmit_bytes | Mb          | Outbound data traffic.         |

#### Metric Set: Disk Free

| Metric Name | Metric Unit | Metric help description  |
|-------------|-------------|--------------------------|
| filesystem  | None        | Name of the file system. |
| used        | Mb          | Used disk space.         |
| available   | Mb          | Available disk space.    |
| usage       | %           | Disk usage percentage.   |
| mounted     | None        | Mount point directory.   |

#### Metric Set: Top10 CPU Process

Top 10 processes consuming CPU. Metrics include: Process ID, CPU usage, Memory usage, Command.

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| cpu_usage   | %           | CPU usage               |
| mem_usage   | %           | Memory usage            |
| command     | None        | Executed command        |

#### Metric Set: Top10 Memory Process

Top 10 processes consuming memory. Metrics include: Process ID, Memory usage, CPU usage, Command.

| Metric Name | Metric Unit | Metric help description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| mem_usage   | %           | Memory usage            |
| cpu_usage   | %           | CPU usage               |
| command     | None        | Executed command        |
