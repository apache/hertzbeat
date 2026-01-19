---
id: opensuse
title: Monitoring OpenSUSE Operating System Monitoring    
sidebar_label: OpenSUSE OS    
keywords: [open source monitoring system, open source operating system monitoring, OpenSUSE OS monitoring]
---

> Collect and monitor general performance metrics of the OpenSUSE operating system.

### Configuration Parameters

|  Parameter Name   |                                                      Parameter Help Description                                                       |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| Monitored Host    | The IPV4, IPV6, or domain name of the host being monitored. Note ⚠️ No protocol header (e.g., https://, http://).                     |
| Task Name         | The name that identifies this monitoring, which must be unique.                                                                       |
| Port              | The port provided by Linux SSH, default is 22.                                                                                        |
| Timeout           | Sets the connection timeout in milliseconds, default is 6000 ms.                                                                      |
| Connection Reuse  | Sets whether SSH connections are reused, default is :false. If false, a new connection is created each time information is retrieved. |
| Username          | SSH connection username, optional.                                                                                                    |
| Password          | SSH connection password, optional.                                                                                                    |
| Collector         | Configures which collector is used to schedule data collection for this monitoring.                                                   |
| Monitoring Period | The interval time for periodic data collection in seconds, with a minimum interval of 30 seconds.                                     |
| Binding Tags      | Used for categorized management of monitoring resources.                                                                              |
| Description       | Additional notes and descriptions for this monitoring, where users can make notes.                                                    |
| Key               | The key required to connect to the server.                                                                                            |

### Collection Metrics

#### Metric Set: System Basic Information

|  Metric Name   | Unit | Metric Help Description  |
|----------------|------|--------------------------|
| Host Name      | None | Host name                |
| System Version | None | Operating system version |
| Uptime         | None | Uptime                   |

#### Metric Set: CPU Information

|  Metric Name   | Unit  |            Metric Help Description            |
|----------------|-------|-----------------------------------------------|
| info           | None  | CPU model                                     |
| cores          | Cores | Number of CPU cores                           |
| interrupt      | Count | Number of CPU interrupts                      |
| load           | None  | Average CPU load over the last 1/5/15 minutes |
| context_switch | Count | Number of context switches                    |
| usage          | %     | CPU usage rate                                |

#### Metric Set: Memory Information

| Metric Name | Unit |       Metric Help Description       |
|-------------|------|-------------------------------------|
| total       | Mb   | Total memory capacity               |
| used        | Mb   | Memory used by user programs        |
| free        | Mb   | Free memory capacity                |
| buff_cache  | Mb   | Memory used for cache               |
| available   | Mb   | Remaining available memory capacity |
| usage       | %    | Memory usage rate                   |

#### Metric Set: Disk Information

|  Metric Name  | Unit  |        Metric Help Description         |
|---------------|-------|----------------------------------------|
| disk_num      | Count | Total number of disks                  |
| partition_num | Count | Total number of partitions             |
| block_write   | Count | Total number of blocks written to disk |
| block_read    | Count | Total number of blocks read from disk  |
| write_rate    | iops  | Disk block write rate per second       |

#### Metric Set: Network Card Information

|  Metric Name   | Unit | Metric Help Description |
|----------------|------|-------------------------|
| interface_name | None | Network card name       |
| receive_bytes  | Mb   | Inbound data traffic    |
| transmit_bytes | Mb   | Outbound data traffic   |

#### Metric Set: File System

| Metric Name | Unit | Metric Help Description |
|-------------|------|-------------------------|
| filesystem  | None | Name of the file system |
| used        | Mb   | Used disk size          |
| available   | Mb   | Available disk size     |
| usage       | %    | Usage rate              |
| mounted     | None | Mount point directory   |

#### Metric Set: Top 10 CPU Processes

Statistics for the top 10 processes using the CPU. Statistics include: Process ID, CPU usage, memory usage, executed command.

| Metric Name | Unit | Metric Help Description |
|-------------|------|-------------------------|
| pid         | None | Process ID              |
| cpu_usage   | %    | CPU usage rate          |
| mem_usage   | %    | Memory usage rate       |
| command     | None | Executed command        |

#### Metric Set: Top 10 Memory Processes

Statistics for the top 10 processes using memory. Statistics include: Process ID, memory usage, CPU usage, executed command.

| Metric Name | Unit | Metric Help Description |
|-------------|------|-------------------------|
| pid         | None | Process ID              |
| mem_usage   | %    | Memory usage rate       |
| cpu_usage   | %    | CPU usage rate          |
| command     | None | Executed command        |
