---
id: starrocks_be
title: 监控：StarRocks数据库BE监控
sidebar_label: StarRocks数据库BE
keywords: [开源监控系统, 开源数据库监控, StarRocks数据库BE监控]
---

> 对StarRocks数据库BE的通用性能指标进行采集监控。支持 StarRocks 2.4.0 及其之后版本。

**使用协议：HTTP**

### 监控前操作

查看 `be/conf/be.conf` 文件，获取 `http_port` 配置项的值，该值用作监控使用。

### 配置参数

| 参数名称 | 参数帮助描述 |
|--------|------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://) |
| 任务名称 | 标识此监控的名称，名称需要保证唯一性 |
| 端口 | 数据库对外提供的端口，默认为8040，取值自 `http_port` 配置项的值 |
| 查询超时时间 | 设置连接未响应的超时时间，单位ms毫秒，默认6000毫秒 |
| 描述备注 | 更多标识和描述此监控的备注信息，用户可以在这里备注信息 |

### 采集指标

> 更多指标请参考StarRocks官网：[通用监控指标](https://docs.mirrorship.cn/zh/docs/administration/management/monitoring/metrics/)。

#### 指标集合：starrocks_be_cpu

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | /proc/stat 返回的 CPU 使用信息 |

#### 指标集合：starrocks_be_disks_state

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | 磁盘的状态。1 表示磁盘正在使用，0 表示磁盘未被使用 |

#### 指标集合：starrocks_be_tablet_base_max_compaction_score

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | 此 BE 中各 Tablet 的最高 Base Compaction Score |

#### 指标集合：starrocks_be_tablet_cumulative_max_compaction_score

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | 此 BE 中各 Tablet 的最高 Cumulative Compaction Score |

#### 指标集合：starrocks_be_engine_requests_total

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | BE 和 FE 之间各种请求的总数，包括 CREATE TABLE、Publish Version 和 Tablet Clone |

#### 指标集合：starrocks_be_max_disk_io_util_percent

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | % | 最大磁盘 I/O 利用率百分比 |

#### 指标集合：starrocks_be_disks_avail_capacity

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | MB | 磁盘的可用容量 |

#### 指标集合：starrocks_be_disks_data_used_capacity

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | MB | 每个磁盘（由存储路径表示）的已用容量 |

#### 指标集合：starrocks_be_load_bytes

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 字节 | 总导入字节数 |

#### 指标集合：starrocks_be_load_rows

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 无 | 总导入行数 |

#### 指标集合：starrocks_be_process_mem_bytes

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | MB | 此进程使用的内存 |

#### 指标集合：starrocks_be_jemalloc_allocated_bytes

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | MB | jemalloc 已分配的总字节数 |

#### 指标集合：starrocks_be_network_receive_bytes

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 字节 | 通过网络接收的总字节数 |

#### 指标集合：starrocks_be_network_send_bytes

| 指标名称 | 指标单位 | 指标帮助描述 |
|---------|---------|------------|
| value | 字节 | 通过网络发送的字节数 |
