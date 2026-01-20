---
id: hdfs_datanode
title: 监控：Apache HDFS DataNode监控
sidebar_label: Apache HDFS DataNode
keywords: [大数据监控系统, 分布式文件系统监控, Apache HDFS DataNode监控]
---

> Hertzbeat 对 Apache HDFS DataNode 节点监控指标进行监控。

**使用协议：HTTP**

## 监控前操作

获取 Apache HDFS DataNode 的 HTTP 监控端口。 取值：`dfs.datanode.http.address`

## 配置参数

|  参数名称  |                    参数帮助描述                    |
|--------|----------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。不带协议头。                    |
| 端口     | Apache HDFS DataNode 的监控端口号，默认为50075。        |
| 查询超时时间 | 查询 Apache HDFS DataNode 的超时时间，单位毫秒，默认6000毫秒。 |
| 指标采集间隔 | 监控数据采集的时间间隔，单位秒，最小间隔为30秒。                    |
| 是否探测   | 新增监控前是否先探测检查监控可用性。                           |
| 描述备注   | 此监控的更多描述和备注信息。                               |

### 采集指标

#### 指标集合：FSDatasetState

|   指标名称    | 指标单位 |      指标帮助描述       |
|-----------|------|-------------------|
| DfsUsed   | GB   | DataNode HDFS使用量  |
| Remaining | GB   | DataNode HDFS剩余空间 |
| Capacity  | GB   | DataNode HDFS空间总量 |

#### 指标集合：JvmMetrics

|         指标名称         | 指标单位 |            指标帮助描述             |
|----------------------|------|-------------------------------|
| MemNonHeapUsedM      | MB   | JVM 当前已经使用的 NonHeapMemory 的大小 |
| MemNonHeapCommittedM | MB   | JVM 配置的 NonHeapCommittedM 的大小 |
| MemHeapUsedM         | MB   | JVM 当前已经使用的 HeapMemory 的大小    |
| MemHeapCommittedM    | MB   | JVM HeapMemory 提交大小           |
| MemHeapMaxM          | MB   | JVM 配置的 HeapMemory 的大小        |
| MemMaxM              | MB   | JVM 运行时可以使用的最大内存大小            |
| ThreadsRunnable      | 个    | 处于 RUNNABLE 状态的线程数量           |
| ThreadsBlocked       | 个    | 处于 BLOCKED 状态的线程数量            |
| ThreadsWaiting       | 个    | 处于 WAITING 状态的线程数量            |
| ThreadsTimedWaiting  | 个    | 处于 TIMED WAITING 状态的线程数量      |

#### 指标集合：runtime

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| StartTime |      | 启动时间   |
