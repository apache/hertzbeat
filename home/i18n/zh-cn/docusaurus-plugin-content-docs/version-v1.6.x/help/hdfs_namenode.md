---
id: hdfs_namenode
title: 监控：Apache HDFS NameNode监控
sidebar_label: Apache HDFS NameNode
keywords: [大数据监控系统, 分布式文件系统监控, Apache HDFS NameNode监控]
---

> Hertzbeat 对 Apache HDFS NameNode 节点监控指标进行监控。

**使用协议：HTTP**

## 监控前操作

获取 Apache HDFS NameNode 的 HTTP 监控端口。取值：`dfs.namenode.http-address`

## 配置参数

|  参数名称  |                参数帮助描述                 |
|--------|---------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。不带协议头。             |
| 端口     | HDFS NameNode 的监控端口号，默认为50070。        |
| 查询超时时间 | 查询 HDFS NameNode 的超时时间，单位毫秒，默认6000毫秒。 |
| 指标采集间隔 | 监控数据采集的时间间隔，单位秒，最小间隔为30秒。             |
| 是否探测   | 新增监控前是否先探测检查监控可用性。                    |
| 描述备注   | 此监控的更多描述和备注信息。                        |

### 采集指标

#### 指标集合：FSNamesystem

|              指标名称               | 指标单位 |                   指标帮助描述                    |
|---------------------------------|------|---------------------------------------------|
| CapacityTotal                   |      | 集群存储总容量                                     |
| CapacityTotalGB                 | GB   | 集群存储总容量                                     |
| CapacityUsed                    |      | 集群存储已使用容量                                   |
| CapacityUsedGB                  | GB   | 集群存储已使用容量                                   |
| CapacityRemaining               |      | 集群存储剩余容量                                    |
| CapacityRemainingGB             | GB   | 集群存储剩余容量                                    |
| CapacityUsedNonDFS              |      | 集群非 HDFS 使用容量                               |
| TotalLoad                       |      | 整个集群的客户端连接数                                 |
| FilesTotal                      |      | 集群文件总数量                                     |
| BlocksTotal                     |      | 总 BLOCK 数量                                  |
| PendingReplicationBlocks        |      | 等待被备份的块数量                                   |
| UnderReplicatedBlocks           |      | 副本数不够的块数量                                   |
| CorruptBlocks                   |      | 坏块数量                                        |
| ScheduledReplicationBlocks      |      | 安排要备份的块数量                                   |
| PendingDeletionBlocks           |      | 等待被删除的块数量                                   |
| ExcessBlocks                    |      | 多余的块数量                                      |
| PostponedMisreplicatedBlocks    |      | 被推迟处理的异常块数量                                 |
| NumLiveDataNodes                |      | 活的数据节点数量                                    |
| NumDeadDataNodes                |      | 已经标记为 Dead 状态的数据节点数量                        |
| NumDecomLiveDataNodes           |      | 下线且 Live 的节点数量                              |
| NumDecomDeadDataNodes           |      | 下线且 Dead 的节点数量                              |
| NumDecommissioningDataNodes     |      | 正在下线的节点数量                                   |
| TransactionsSinceLastCheckpoint |      | 从上次Checkpoint之后的事务数量                        |
| LastCheckpointTime              |      | 上一次Checkpoint时间                             |
| PendingDataNodeMessageCount     |      | DATANODE 的请求被 QUEUE 在 standby namenode 中的个数 |

#### 指标集合：RPC

|        指标名称        | 指标单位 |  指标帮助描述  |
|--------------------|------|----------|
| ReceivedBytes      |      | 接收数据速率   |
| SentBytes          |      | 发送数据速率   |
| RpcQueueTimeNumOps |      | RPC 调用速率 |

#### 指标集合：runtime

|   指标名称    | 指标单位 | 指标帮助描述 |
|-----------|------|--------|
| StartTime |      | 启动时间   |

#### 指标集合：JvmMetrics

|              指标名称               | 指标单位 |            指标帮助描述             |
|---------------------------------|------|-------------------------------|
| MemNonHeapUsedM                 | MB   | JVM 当前已经使用的 NonHeapMemory 的大小 |
| MemNonHeapCommittedM            | MB   | JVM 配置的 NonHeapCommittedM 的大小 |
| MemHeapUsedM                    | MB   | JVM 当前已经使用的 HeapMemory 的大小    |
| MemHeapCommittedM               | MB   | JVM HeapMemory 提交大小           |
| MemHeapMaxM                     | MB   | JVM 配置的 HeapMemory 的大小        |
| MemMaxM                         | MB   | JVM 运行时可以使用的最大内存大小            |
| GcCountParNew                   | 次    | 新生代GC消耗时间                     |
| GcTimeMillisParNew              | 毫秒   | 新生代GC消耗时间                     |
| GcCountConcurrentMarkSweep      | 毫秒   | 老年代GC次数                       |
| GcTimeMillisConcurrentMarkSweep | 个    | 老年代GC消耗时间                     |
| GcCount                         | 个    | GC次数                          |
| GcTimeMillis                    | 个    | GC消耗时间                        |
| ThreadsRunnable                 | 个    | 处于 BLOCKED 状态的线程数量            |
| ThreadsBlocked                  | 个    | 处于 BLOCKED 状态的线程数量            |
| ThreadsWaiting                  | 个    | 处于 WAITING 状态的线程数量            |
| ThreadsTimedWaiting             | 个    | 处于 TIMED WAITING 状态的线程数量      |
