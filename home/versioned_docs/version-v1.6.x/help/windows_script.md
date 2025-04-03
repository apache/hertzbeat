---
id: windows_script
title: Monitoring：Using Scripts to Monitor Windows Operating System   
sidebar_label: Using Scripts to Monitor Windows OS
keywords: [open source monitoring system, open source network monitoring, using scripts to monitor Windows OS]
---

### Preparation

> To monitor the local machine, simply deploy Hertzbeat. To monitor other hosts, you need to deploy a collector on the target host. Refer to [this link](https://github.com/apache/hertzbeat?tab=readme-ov-file#2install-via-package) for step 5 of the installation process.
> If the collector is installed using Docker, it will cause the collector to be unable to monitor the process information on the host machine, because Docker containers run in an isolated environment, with each container having its own process space.
> When creating a monitoring task and selecting a collector, choose the corresponding collector deployed on the target host.

### Configuration Parameters

| Parameter Name |               Parameter Description                |
|:---------------|-----------------------------------------------------|---|
| Monitor Host   | The IPv4, IPv6, or domain of the monitored endpoint. Note ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Task Name      | The name identifying this monitoring task, which needs to be unique. |
| Collector      | Specifies which collector will be used for data collection in this monitoring task. |
| Monitoring Interval | The time interval for periodic data collection, in seconds. |
| Binding Tag    | Classification management tags for monitoring resources. |
| Description Notes | Additional notes to describe this monitoring task. Users can add remarks here. |

### Metrics Collection

#### Metric Set: basic

| Metric Name | Metric Unit | Metric Description       |
|-------------|-------------|--------------------------|
| hostname    | None        | Name of the host         |
| version     | None        | Operating system version |

#### Metric Set: cpu

| Metric Name    | Metric Unit | Metric Description                 |
|----------------|-------------|------------------------------------|
| info           | None        | CPU model                          |
| cores          | Number      | Number of CPU cores                |
| interrupt      | Count       | Number of CPU interrupts           |
| load           | None        | Average recent CPU load            |
| context_switch | Count       | Current number of context switches |
| usage          | %           | CPU usage percentage               |

#### Metric Set: memory

| Metric Name   | Metric Unit | Metric Description             |
|---------------|-------------|--------------------------------|
| totalPhysical | Mb          | Total physical memory capacity |
| freePhysical  | Mb          | Free physical memory capacity  |
| totalVirtual  | Mb          | Total virtual memory capacity  |
| freeVirtual   | Mb          | Free virtual memory capacity   |

#### Metric Set: disk

| Metric Name    | Metric Unit | Metric Description         |
|----------------|-------------|----------------------------|
| Model          | None        | Disk model                 |
| Size           | Mb          | Disk size                  |
| BytesPerSector | Bytes       | Number of bytes per sector |

#### Metric Set: disk_free

| Metric Name | Metric Unit | Metric Description   |
|-------------|-------------|----------------------|
| Caption     | None        | Disk label           |
| FreeSpace   | Mb          | Available disk space |
| Size        | Mb          | Total disk space     |

#### Metric Set: Top 10 Programs by CPU Usage

| Metric Name | Metric Unit | Metric Description  |
|-------------|-------------|---------------------|
| name        | None        | Process name        |
| id          | None        | Process ID          |
| cpu         | Seconds     | CPU usage time      |
| ws          | Mb          | Memory usage        |

#### Metric Set: Top 10 Programs by Memory Usage

| Metric Name | Metric Unit | Metric Description  |
|-------------|-------------|---------------------|
| name        | None        | Process name        |
| id          | None        | Process ID          |
| cpu         | Seconds     | CPU usage time      |
| ws          | Mb          | Memory usage        |
