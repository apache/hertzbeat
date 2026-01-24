---
id: starrocks_be
title: Monitoring StarRocks Database BE Monitoring
sidebar_label: StarRocks Database BE
keywords: [Open Source Monitoring System, Open Source Database Monitoring, StarRocks Database BE Monitoring]
---

> Collect and monitor general performance metrics for StarRocks database BE. Supports StarRocks 2.4.0 and later versions.

**Protocol: HTTP**

### Pre-monitoring Operations

Check the `be/conf/be.conf` file to obtain the value of the `http_port` configuration item, which is used for monitoring.

### Configuration Parameters

| Parameter Name | Parameter Description |
|---------------|----------------------|
| Monitor Host | The monitored target's IPV4, IPV6, or domain name. Note: Without the protocol header (e.g., https://, http://) |
| Task Name | A unique name identifying this monitoring task |
| Port | The port provided by the database to the outside, default is 8040, get the value of the `http_port` configuration item |
| Query Timeout | The timeout for the connection to not respond, in milliseconds, default is 6000 milliseconds |
| Description | Additional notes and descriptions for this monitoring task |

### Collection Metrics

> For more metrics, please refer to the StarRocks official documentation: [General Monitoring Metrics](https://docs.mirrorship.cn/docs/administration/management/monitoring/metrics/).

#### Metric Set: starrocks_be_cpu

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | CPU usage information returned by /proc/stat |

#### Metric Set: starrocks_be_disks_state

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | State of each disk. 1 indicates that the disk is in use, and 0 indicates that the disk is not in use |

#### Metric Set: starrocks_be_tablet_base_max_compaction_score

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Highest base compaction score of tablets in this BE |

#### Metric Set: starrocks_be_tablet_cumulative_max_compaction_score

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Highest cumulative compaction score of tablets in this BE |

#### Metric Set: starrocks_be_engine_requests_total

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Total count of all types of requests, including CREATE TABLE, Publish Version and Tablet Clone |

#### Metric Set: starrocks_be_max_disk_io_util_percent

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | % | Maximum disk I/O utilization percentage |

#### Metric Set: starrocks_be_disks_avail_capacity

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | MB | Available capacity of a specific disk |

#### Metric Set: starrocks_be_disks_data_used_capacity

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | MB | Used capacity of each disk (represented by a storage path) |

#### Metric Set: starrocks_be_load_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Bytes | Total loaded bytes |

#### Metric Set: starrocks_be_load_rows

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Total loaded rows |

#### Metric Set: starrocks_be_process_mem_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | MB | Memory used by this process |

#### Metric Set: starrocks_be_jemalloc_allocated_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | MB | Total number of bytes allocated by jemalloc |

#### Metric Set: starrocks_be_network_receive_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Bytes | Total bytes received via network |

#### Metric Set: starrocks_be_network_send_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Bytes | Number of bytes sent over the network |
