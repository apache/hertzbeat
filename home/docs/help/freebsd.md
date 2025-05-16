---
id: freebsd
title: Monitoring FreeBSD Operating System
sidebar_label: FreeBSD Operating System
keywords: [ Open Source Monitoring System, Open Source Operating System Monitoring, FreeBSD Operating System Monitoring ]
---

> Collect and monitor general performance metrics (system information, CPU, memory, disk, network cards, file systems, top resource processes, etc.) of the FreeBSD operating system.

### Configuration Parameters

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

### Collection Metrics

#### Metric Set: Basic Info

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| hostname    | None        | Host name               |
| version     | None        | System version          |
| uptime      | None        | System Uptime           |

#### Metric Set: CPU Info

|  Metric Name   | Metric Unit |           Metric help description            |
|----------------|-------------|----------------------------------------------|
| info           | None        | CPU model                                    |
| cores          | None        | Number of CPU cores                          |
| interrupt      | None        | Number of CPU interrupts                     |
| load           | None        | Average CPU load for the last 1/5/15 minutes |
| context_switch | None        | Current context switches                     |
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
