---
id: almalinux
title: Monitoring AlmaLinux Operating System Monitoring
sidebar_label: AlmaLinux Operating System
keywords: [open-source monitoring system, open-source operating system monitoring, AlmaLinux operating system monitoring]
---

> Collect and monitor common performance metrics of the AlmaLinux operating system.

### Configuration Parameters

|  Parameter Name   |                                                      Parameter Help Description                                                       |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host   | The monitored peer's IPv4, IPv6, or domain name. Note ⚠️ No protocol header (e.g., https://, http://).                                |
| Task Name         | A unique name to identify this monitoring task.                                                                                       |
| Port              | The port provided by Linux SSH, default is 22.                                                                                        |
| Timeout           | Set the connection timeout in milliseconds, default is 6000 ms.                                                                       |
| Connection Reuse  | Set whether to reuse SSH connections, default is false. If false, a new connection will be created for each retrieval of information. |
| Username          | SSH connection username, optional.                                                                                                    |
| Password          | SSH connection password, optional.                                                                                                    |
| Collector         | Configure which collector to use for scheduling data collection for this monitoring.                                                  |
| Monitoring Period | The interval time for periodic data collection, in seconds, with a minimum interval of 30 seconds.                                    |
| Binding Tags      | Used for classifying and managing monitoring resources.                                                                               |
| Description Note  | Additional notes to identify and describe this monitoring, where users can make notes.                                                |
| Key               | The key required to connect to the server.                                                                                            |

### Data Collection Metrics

#### Metric Set: Basic System Information

|  Metric Name   | Metric Unit | Metric Help Description  |
|----------------|-------------|--------------------------|
| Host Name      | None        | Host name                |
| System Version | None        | Operating system version |
| Uptime         | None        | Uptime                   |

#### Metric Set: CPU Information

|  Metric Name   | Metric Unit |      Metric Help Description      |
|----------------|-------------|-----------------------------------|
| info           | None        | CPU model                         |
| cores          | Cores       | Number of CPU cores               |
| interrupt      | Count       | Number of CPU interrupts          |
| load           | None        | Average CPU load (1/5/15 minutes) |
| context_switch | Count       | Number of context switches        |
| usage          | %           | CPU usage                         |

#### Metric Set: Memory Information

| Metric Name | Metric Unit |       Metric Help Description       |
|-------------|-------------|-------------------------------------|
| total       | Mb          | Total memory capacity               |
| used        | Mb          | Memory used by user programs        |
| free        | Mb          | Free memory capacity                |
| buff_cache  | Mb          | Memory used for cache               |
| available   | Mb          | Remaining available memory capacity |
| usage       | %           | Memory usage rate                   |

#### Metric Set: Disk Information

|  Metric Name  | Metric Unit |        Metric Help Description         |
|---------------|-------------|----------------------------------------|
| disk_num      | Count       | Total number of disks                  |
| partition_num | Count       | Total number of partitions             |
| block_write   | Blocks      | Total number of blocks written to disk |
| block_read    | Blocks      | Total number of blocks read from disk  |
| write_rate    | IOPS        | Disk block write rate per second       |

#### Metric Set: Network Card Information

|  Metric Name   | Metric Unit |    Metric Help Description    |
|----------------|-------------|-------------------------------|
| interface_name | None        | Network card name             |
| receive_bytes  | Byte        | Inbound data traffic (bytes)  |
| transmit_bytes | Byte        | Outbound data traffic (bytes) |

#### Metric Set: File System

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| filesystem  | None        | Name of the file system |
| used        | Mb          | Used disk size          |
| available   | Mb          | Available disk size     |
| usage       | %           | Usage rate              |
| mounted     | None        | Mount point directory   |

#### Metric Set: Top 10 CPU Processes

Statistics for the top 10 processes using the CPU. Statistics include: process ID, CPU usage, memory usage, and executed command.

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| cpu_usage   | %           | CPU usage               |
| mem_usage   | %           | Memory usage            |
| command     | None        | Executed command        |

#### Metric Set: Top 10 Memory Processes

Statistics for the top 10 processes using memory. Statistics include: process ID, memory usage, CPU usage, and executed command.

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| pid         | None        | Process ID              |
| mem_usage   | %           | Memory usage            |
| cpu_usage   | %           | CPU usage               |
| command     | None        | Executed command        |

---
