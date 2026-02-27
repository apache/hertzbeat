---
id: linux_script
title: Monitoring：Using Scripts to Monitor Linux Operating System   
sidebar_label: Using Scripts to Monitor Linux OS
keywords: [open source monitoring system, open source network monitoring, using scripts to monitor Linux OS]
---

### Preparation

> To monitor the local machine, simply deploy Hertzbeat. To monitor other hosts, you need to deploy a collector on the target host. Refer to [this link](https://github.com/apache/hertzbeat?tab=readme-ov-file#2install-via-package) for step 5 of the installation process.
If the collector is installed using Docker, it will cause the collector to be unable to monitor the process information on the host machine, because Docker containers run in an isolated environment, with each container having its own process space.
> When creating a monitoring task and selecting a collector, choose the corresponding collector deployed on the target host.

### Configuration Parameters

| Parameter Name |               Parameter Description                |
|:---------------|-----------------------------------------------------|---|
| Monitor Host   | The IPv4, IPv6, or domain of the monitored endpoint. Note ⚠️ Do not include protocol headers (e.g., https://, http://). |
| Task Name      | The name identifying this monitoring task, which needs to be unique. |
| Collector          | Specifies which collector will be used for data collection in this monitoring task. |
| Monitoring Interval | The time interval for periodic data collection, in seconds. |
| Binding Tag    | Classification management tags for monitoring resources. |
| Description Notes | Additional notes to describe this monitoring task. Users can add remarks here. |

### Metrics Collection

#### Metric Set: basic

| Metric Name | Metric Unit | Metric Description       |
|-------------|-------------|--------------------------|
| hostname    | None        | Name of the host         |
| version     | None        | Operating system version |
| uptime      | None        | System uptime            |

#### Metric Set: cpu

| Metric Name    | Metric Unit | Metric Description                            |
|----------------|-------------|-----------------------------------------------|
| info           | None        | CPU model                                     |
| cores          | Number      | Number of CPU cores                           |
| interrupt      | Count       | Number of CPU interrupts                      |
| load           | None        | Average CPU load over the last 1/5/15 minutes |
| context_switch | Count       | Current number of context switches            |
| usage          | %           | CPU usage percentage                          |

#### Metric Set: memory

| Metric Name | Metric Unit | Metric Description           |
|-------------|-------------|------------------------------|
| total       | Mb          | Total memory capacity        |
| used        | Mb          | Memory used by user programs |
| free        | Mb          | Free memory capacity         |
| buff_cache  | Mb          | Memory used by cache         |
| available   | Mb          | Available memory capacity    |
| usage       | %           | Memory usage percentage      |

#### Metric Set: disk

| Metric Name   | Metric Unit | Metric Description                        |
|---------------|-------------|-------------------------------------------|
| disk_num      | Count       | Total number of disks                     |
| partition_num | Count       | Total number of partitions                |
| block_write   | Count       | Total number of blocks written to disk    |
| block_read    | Count       | Total number of blocks read from disk     |
| write_rate    | iops        | Rate of blocks written to disk per second |

#### Metric Set: interface

| Metric Name    | Metric Unit | Metric Description            |
|----------------|-------------|-------------------------------|
| interface_name | None        | Network interface name        |
| receive_bytes  | byte        | Inbound data traffic (bytes)  |
| transmit_bytes | byte        | Outbound data traffic (bytes) |

#### Metric Set: disk_free

| Metric Name | Metric Unit | Metric Description     |
|-------------|-------------|------------------------|
| filesystem  | None        | Name of the filesystem |
| used        | Mb          | Used disk size         |
| available   | Mb          | Available disk size    |
| usage       | %           | Disk usage percentage  |
| mounted     | None        | Mount point directory  |

#### Metric Set: Top 10 Programs by CPU Usage

| Metric Name | Metric Unit | Metric Description      |
|-------------|-------------|-------------------------|
| id          | None        | Process ID              |
| cpu         | %           | CPU usage percentage    |
| ws          | %           | Memory usage percentage |
| command     | None        | Executed command        |

#### Metric Set: Top 10 Programs by Memory Usage

| Metric Name | Metric Unit | Metric Description      |
|-------------|-------------|-------------------------|
| id          | None        | Process ID              |
| cpu         | %           | CPU usage percentage    |
| ws          | %           | Memory usage percentage |
| command     | None        | Executed command        |
