---
id: pulsar  
title: 监控：Pulsar监控  
sidebar_label: Apache Pulsar
keywords: [开源监控系统, 开源数据库监控, HbaseMaster监控]
---

> 对Pulsar的通用性能指标进行采集监控

**使用协议：HTTP**

## 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口     | Pulsar的webServiceProt值，默认为8080。                      |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 查询超时时间 | 设置连接的超时时间，单位ms毫秒，默认3000毫秒。                           |
| 监控周期   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签   | 用于对监控资源进行分类管理                                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：版本信息

|     指标名称     | 指标单位 | 指标帮助描述 |
|--------------|------|--------|
| Version Info | 无    | 版本信息   |

#### 指标集合：process_start_time_seconds

|        指标名称        | 指标单位 | 指标帮助描述 |
|--------------------|------|--------|
| Process Start Time | 无    | 进程启动时间 |

#### 指标集合：process_open_fds

|         指标名称          | 指标单位 |  指标帮助描述  |
|-----------------------|------|----------|
| Open File Descriptors | 无    | 打开的文件描述符 |

#### 指标集合：process_max_fds

|         指标名称         | 指标单位 | 指标帮助描述  |
|----------------------|------|---------|
| Max File Descriptors | 无    | 最大文件描述符 |

#### 指标集合： jvm_memory_pool_allocated_bytes

Java虚拟机（JVM）中特定内存池已分配的内存字节数。在Pulsar中，这通常指的是用于各种目的的JVM内存（如堆内存、非堆内存等）中已经分配出去的内存量。

#### 指标集合：jvm_memory_pool_used_bytes

与allocated_bytes不同，这个指标会显示实际使用的内存，而不仅仅是分配的内存。

#### 指标集合：jvm_memory_pool_committed_bytes

JVM中特定内存池已承诺的内存字节数。在JVM中，承诺的内存是指虚拟机保证可供应用程序使用的内存量，通常这部分内存会被操作系统锁定，以减少交换或垃圾回收的可能性。

#### 指标集合：jvm_memory_pool_max_bytes

JVM中特定内存池可分配的最大内存字节数。这是该内存池允许的最大内存限制，有助于设置内存使用的上限。

#### 指标集合：pulsar_broker_publish_latency

Broker端消息发布延迟

#### 指标集合：pulsar_metadata_store_ops_latency_ms

Broker端元数据存储操作延迟
