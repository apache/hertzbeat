---
id: starrocks_fe
title: Monitoring StarRocks Database FE Monitoring
sidebar_label: StarRocks Database FE
keywords: [Open Source Monitoring System, Open Source Database Monitoring, StarRocks Database FE Monitoring]
---

> Collect and monitor general performance metrics for StarRocks database FE. Supports StarRocks 2.4.0 and later versions.

**Protocol: HTTP**

### Pre-monitoring Operations

Check the `fe/conf/fe.conf` file to obtain the value of the `http_port` configuration item, which is used for monitoring.

### Configuration Parameters

| Parameter Name | Parameter Description |
|---------------|----------------------|
| Monitor Host | The monitored target's IPV4, IPV6, or domain name. Note: Without the protocol header (e.g., https://, http://) |
| Task Name | A unique name identifying this monitoring task |
| Port | The port provided by the database to the outside, default is 8030, get the value of the `http_port` configuration item |
| Query Timeout | The timeout for the connection to not respond, in milliseconds, default is 6000 milliseconds |
| Description | Additional notes and descriptions for this monitoring task |

### Collection Metrics

> For more metrics, please refer to the StarRocks official documentation: [General Monitoring Metrics](https://docs.mirrorship.cn/docs/administration/management/monitoring/metrics/).

#### Metric Set: jvm_heap_size_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Byte | JVM heap memory size |

#### Metric Set: jvm_non_heap_size_bytes

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Byte | JVM non-heap memory size |

#### Metric Set: jvm_thread

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of JVM threads |

#### Metric Set: starrocks_fe_query_err

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of failed queries |

#### Metric Set: starrocks_fe_query_latency_ms

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | ms | Query response time |

#### Metric Set: starrocks_fe_edit_log_write

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | Byte/s | Write speed of FE edit log |

#### Metric Set: starrocks_fe_load_add

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of new load jobs |

#### Metric Set: starrocks_fe_load_finished

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of finished load jobs |

#### Metric Set: starrocks_fe_job

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | FE job status |

#### Metric Set: starrocks_fe_tablet_max_compaction_score

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Indicates the highest Compaction Score on each BE node |

#### Metric Set: starrocks_fe_meta_log_count

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | The number of Edit Logs without a checkpoint. A value within 100000 is reasonable |

#### Metric Set: starrocks_fe_query_total

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Total number of queries |

#### Metric Set: starrocks_fe_request_total

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Total number of requests |

#### Metric Set: starrocks_fe_txn_reject

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of rejected transactions |

#### Metric Set: starrocks_fe_txn_begin

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of beginning transactions |

#### Metric Set: starrocks_fe_txn_success

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of successful transactions |

#### Metric Set: starrocks_fe_txn_failed

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Number of failed transactions |

#### Metric Set: starrocks_fe_connection_total

| Metric Name | Metric Unit | Metric Help Description |
|------------|-------------|------------------------|
| value | None | Total number of FE connections |
