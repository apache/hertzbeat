---
id: debian
title: Monitoring Debian System Monitoring
sidebar_label: Debian
keywords: [Open Source Monitoring System, Operating System Monitoring, Debian Monitoring]
---

> Collect and monitor general performance metrics of the Debian system.

## Configuration Parameters

| Parameter Name        | Parameter Help Description                                                                                                                                                            |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitored Host        | The IPV4, IPV6, or domain name of the host being monitored. Note ⚠️ No protocol header (e.g., https://, http://).                                                                     |
| Task Name             | The name that identifies this monitoring, which must be unique.                                                                                                                       |
| Port                  | The port provided by Linux SSH, default is 22.                                                                                                                                        |
| Timeout               | Sets the connection timeout in milliseconds, default is 6000 ms.                                                                                                                      |
| Connection Reuse      | Sets whether SSH connections are reused, default is :false. If false, a new connection is created each time information is retrieved.                                                 |
| Use Proxy Connection  | Sets Whether connect via proxy, default is false.                                                                                                                                     |
| Username              | SSH connection username, optional.                                                                                                                                                    |
| Password              | SSH connection password, optional.                                                                                                                                                    |
| Collector             | Configures which collector is used to schedule data collection for this monitoring.                                                                                                   |
| Monitoring Period     | The interval time for periodic data collection in seconds, with a minimum interval of 30 seconds.                                                                                     |
| Binding Tags          | Used for categorized management of monitoring resources.                                                                                                                              |
| Description           | Additional notes and descriptions for this monitoring, where users can make notes.                                                                                                    |
| PrivateKey            | The private key required to connect to the server.                                                                                                                                    |
| PrivateKey PassPhrase | The password phrase used to encrypt the SSH private key. If the private key was generated with a passphrase, this field must be filled to decrypt and use the key for authentication. |
| Proxy Host            | The address of the proxy server, supporting IPV4, IPV6, or domain name format. Required when using SSH jump host to access the target host.                                           |
| Proxy Port            | The port number of the proxy service, default is 22.                                                                                                                                  |
| Proxy Username        | The authentication username required to connect to the proxy server.                                                                                                                  |
| Proxy Username        | The authentication password required to connect to the proxy server.                                                                                                                  |
| Proxy PrivateKey      | The private key required to authenticate with the proxy server.                                                                                                                       |

### Data Collection Metrics

#### Metric Set: Basic System Information

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| hostname    | None        | Host name               |
| version     | None        | System version          |
| uptime      | None        | System Uptime           |

#### Metric Set: CPU Information

| Metric Name    | Metric Unit | Metric Help Description           |
|----------------|-------------|-----------------------------------|
| info           | None        | CPU model                         |
| cores          | None        | Number of CPU cores               |
| interrupt      | None        | Number of CPU interrupts          |
| load           | None        | Average CPU load (1/5/15 minutes) |
| context_switch | None        | Number of context switches        |
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

| Metric Name   | Metric Unit | Metric Help Description                |
|---------------|-------------|----------------------------------------|
| disk_num      | None        | Total number of disks                  |
| partition_num | None        | Total number of partitions             |
| block_write   | None        | Total number of blocks written to disk |
| block_read    | None        | Total number of blocks read from disk  |
| write_rate    | iops        | Disk block write rate per second       |

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
