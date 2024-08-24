---
id: clickhouse  
title: 监控：Clickhouse数据库监控  
sidebar_label: Clickhouse数据库   
keywords: [开源监控系统, 开源数据库监控, Clickhouse数据库监控]
---

> 对Clickhouse数据库的通用性能指标进行采集监控。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 数据库对外提供的端口，默认为8123。                                  |
| 查询超时时间 | 设置SQL查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                  |
| 数据库名称  | 数据库实例名称，可选。                                          |
| 用户名    | 数据库连接用户名，可选                                          |
| 密码     | 数据库连接密码，可选                                           |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签   | 用于对监控资源进行分类管理                                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：ping 可用性

|     指标名称     | 指标单位 | 指标帮助描述 |
|--------------|------|--------|
| responseTime | 无    | 响应时间   |

#### 指标集合：system.metrics表的数据

|         指标名称         | 指标单位  |            指标帮助描述            |
|----------------------|-------|------------------------------|
| Query                | 无     | 正在执行的查询的数量                   |
| Merge                | 无     | 正在执行的后台合并的数量                 |
| Move                 | 无     | 正在执行的后台移动的数量                 |
| PartMutation         | 无     | 表变更的次数                       |
| ReplicatedFetch      | 无     | 从副本收集的数据块数量                  |
| ReplicatedSend       | 无     | 发送到副本的数量块数量                  |
| ReplicatedChecks     | 无     | 检查一致性的数据块数量                  |
| QueryPreempted       | 无     | 停止或等待的查询数量                   |
| TCPConnection        | 无     | TCP连接数量                      |
| HTTPConnection       | 无     | HTTP连接数量                     |
| OpenFileForRead      | 无     | 打开的可读文件的数量                   |
| OpenFileForWrite     | 无     | 打开的可写文件的数量                   |
| QueryThread          | 无     | 查询处理的线程数量                    |
| ReadonlyReplica      | 无     | 处于只读状态的 Replicated table 的数量 |
| EphemeralNode        | 无     | ZooKeeper 中保存的临时节点数          |
| ZooKeeperWatch       | 无     | ZooKeeper事件订阅数               |
| StorageBufferBytes   | Bytes | Buffer tables 中的字节数          |
| VersionInteger       | 无     | ClickHouse 版本号               |
| RWLockWaitingReaders | 无     | 等待读表的读写锁的线程数量                |
| RWLockWaitingWriters | 无     | 等待写表的读写锁的线程数量                |
| RWLockActiveReaders  | 无     | 在一个表的读写锁中持有读锁的线程数            |
| RWLockActiveWriters  | 无     | 在一个表的读写锁中持有写锁的线程数            |
| GlobalThread         | 无     | 全局线程池中的线程数                   |
| GlobalThreadActive   | 无     | 全局线程池中活跃的线程数                 |
| LocalThread          | 无     | 本地线程池中的线程数                   |
| LocalThreadActive    | 无     | 本地线程池中活跃的线程数                 |

#### 指标集合：system.events表的数据

|                指标名称                | 指标单位  |                                             指标帮助描述                                             |
|------------------------------------|-------|------------------------------------------------------------------------------------------------|
| Query                              | 无     | 要解释和可能执行的查询数量。 不包括由于 AST 大小限制、配额限制或同时运行的查询数量限制而无法解析或被拒绝的查询。 可能包括 ClickHouse 本身发起的内部查询。 不计算子查询。 |
| SelectQuery                        | 无     | 可能执行的 Select 查询数                                                                               |
| InsertQuery                        | 无     | 可能执行的 Insert 查询数                                                                               |
| InsertedRows                       | 无     | 被插入到所有表中的行数                                                                                    |
| InsertedBytes                      | Bytes | 被插入到所有表中的字节数                                                                                   |
| FailedQuery                        | 无     | 执行失败的查询数量                                                                                      |
| FailedSelectQuery                  | 无     | 执行失败的 Select 查询数量                                                                              |
| FileOpen                           | 无     | 文件打开数                                                                                          |
| MergeTreeDataWriterRows            | 无     | 写入 MergeTree 表的数据行数                                                                            |
| MergeTreeDataWriterCompressedBytes | Bytes | 压缩写入 MergeTree 表的数据字节数                                                                         |

#### 指标集合：system.asynchronous_metrics表的数据

|                   指标名称                   | 指标单位 |              指标帮助描述              |
|------------------------------------------|------|----------------------------------|
| AsynchronousMetricsCalculationTimeSpent  | 无    | 异步指标计算花费的时间（秒）                   |
| jemalloc.arenas.all.muzzy_purged         | 无    | 被清除的模糊（muzzy）页的数量                |
| jemalloc.arenas.all.dirty_purged         | 无    | 被清除的脏 （dirty）页的数量                |
| BlockReadBytes_ram1                      | 无    | ram1 块读取的字节数                     |
| jemalloc.background_thread.run_intervals | 无    | jemalloc 后台线程的运行间隔数              |
| BlockQueueTime_nbd13                     | 无    | nbd13 块队列等待时间                    |
| jemalloc.background_thread.num_threads   | 无    | jemalloc 后台线程的数量                 |
| jemalloc.resident                        | 无    | jemalloc 分配器占用的物理内存大小（字节）        |
| InterserverThreads                       | 无    | Interserver 线程数                  |
| BlockWriteMerges_nbd7                    | 无    | nbd7 块写合并数量                      |
| MarkCacheBytes                           | 无    | StorageMergeTree 的 marks 的缓存大小   |
| MarkCacheFiles                           | 无    | StorageMergeTree 的 marks 的缓存文件数量 |
| MaxPartCountForPartition                 | 无    | partitions 中最大的活跃数据块的数量          |
