---
id: ubuntu  
title: Monitoring：Ubuntu operating system monitoring   
sidebar_label: Ubuntu operating system   
keywords: [open source monitoring tool, open source linux ubuntu monitoring tool, monitoring ubuntu metrics]
---

> Collect and monitor the general performance Metrics of Ubuntu operating system.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by Linux SSH. The default is 22                                                                                                                             |
| Username            | SSH connection user name, optional                                                                                                                                        |
| Password            | SSH connection password, optional                                                                                                                                         |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metric

#### Metric set：basic

| Metric name | Metric unit | Metric help description  |
|-------------|-------------|--------------------------|
| hostname    | none        | Host name                |
| version     | none        | Operating system version |
| uptime      | none        | System running time      |

#### Metric set：cpu

|  Metric name   | Metric unit |            Metric help description             |
|----------------|-------------|------------------------------------------------|
| info           | none        | CPU model                                      |
| cores          | cores       | Number of CPU cores                            |
| interrupt      | number      | Number of CPU interrupts                       |
| load           | none        | Average load of CPU in the last 1/5/15 minutes |
| context_switch | number      | Number of current context switches             |
| usage          | %           | CPU usage                                      |

#### Metric set：memory

| Metric name | Metric unit |       Metric help description       |
|-------------|-------------|-------------------------------------|
| total       | Mb          | Total memory capacity               |
| used        | Mb          | User program memory                 |
| free        | Mb          | Free memory capacity                |
| buff_cache  | Mb          | Memory occupied by cache            |
| available   | Mb          | Remaining available memory capacity |
| usage       | %           | Memory usage                        |

#### Metric set：disk

|  Metric name  | Metric unit |        Metric help description         |
|---------------|-------------|----------------------------------------|
| disk_num      | blocks      | Total number of disks                  |
| partition_num | partitions  | Total number of partitions             |
| block_write   | blocks      | Total number of blocks written to disk |
| block_read    | blocks      | Number of blocks read from disk        |
| write_rate    | iops        | Rate of writing disk blocks per second |

#### Metric set：interface

|  Metric name   | Metric unit |   Metric help description    |
|----------------|-------------|------------------------------|
| interface_name | none        | Network card name            |
| receive_bytes  | byte        | Inbound data traffic(bytes)  |
| transmit_bytes | byte        | Outbound data traffic(bytes) |

#### Metric set：disk_free

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| filesystem  | none        | File system name        |
| used        | Mb          | Used disk size          |
| available   | Mb          | Available disk size     |
| usage       | %           | usage                   |
| mounted     | none        | Mount point directory   |
