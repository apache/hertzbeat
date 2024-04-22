---
id: clickhouse  
title: 监控：Clickhouse数据库监控      
sidebar_label: Clickhouse数据库   
keywords: [开源监控系统, 开源数据库监控, Clickhouse数据库监控]
---

> 对Clickhouse数据库的通用性能指标进行采集监控。

### 配置参数

| 参数名称   | 参数帮助描述                                               |
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

| 指标名称      | 指标单位 | 指标帮助描述     |
| ----------- | ----------- |------------|
| responseTime         | 无 | 响应时间       |

#### 指标集合：system.metrics表的数据

| 指标名称      | 指标单位 | 指标帮助描述             |
| ----------- | ----------- |--------------------|
| Query        | 无 | 正在执行的查询的数量         |
| Merge            | 无 | 正在执行的后台合并的数量       |
| PartMutation         | 无 | 变更操作的数量(删除/更新)     |
| ReplicatedFetch| 无 | 从副本中获取的数据块的数量      |
| ReplicatedSend| 无 | 发送到副本的数据块的数量       |
| ReplicatedChecks| 无 | 数据块检查一致性的数量        |
| BackgroundMergesAndMutationsPoolTask| 无 | 关联后台池中活跃的合并和变更操作数量 |
| BackgroundFetchesPoolTask| 无 | 关联后台池中活跃的拉取操作数量    |
| BackgroundCommonPoolTask| 无 | 关联后台池中活跃的通用操作数量    |
| BackgroundMovePoolTask| 无 | 后台操作池中活跃的移动操作数量    |


#### 指标集合：system.events表的数据

| 指标名称      | 指标单位 | 指标帮助描述                                                                                         |
| ----------- |------|------------------------------------------------------------------------------------------------|
| Query               | 无    | 要解释和可能执行的查询数量。 不包括由于 AST 大小限制、配额限制或同时运行的查询数量限制而无法解析或被拒绝的查询。 可能包括 ClickHouse 本身发起的内部查询。 不计算子查询。 |
| SelectQuery         | 无    | 与 Query 相同，但仅适用于 SELECT 查询。                                                                    |
| FailedQuery         | 无    | 失败查询的数量。                                                                                       |
| FailedSelectQuery   | 无    | 与 FailedQuery 相同，但仅适用于 SELECT 查询。                                                              |
| QueryTimeMicroseconds | 无    | 所有查询的总时间(微秒)。                                                                                  |

#### 指标集合：system.asynchronous_metrics表的数据

| 指标名称      | 指标单位 | 指标帮助描述                    |
| ----------- |------|---------------------------|
| AsynchronousMetricsCalculationTimeSpent        | 无    | 异步指标计算花费的时间（秒）            |
| jemalloc.arenas.all.muzzy_purged               | 无    | 被清除的模糊（muzzy）页的数量         |
| jemalloc.arenas.all.dirty_purged               | 无    | 被清除的脏 （dirty）页的数量         |
| BlockReadBytes_ram1                            | 无    | ram1 块读取的字节数              |
| jemalloc.background_thread.run_intervals       | 无    | jemalloc 后台线程的运行间隔数       |
| BlockQueueTime_nbd13                           | 无    | nbd13 块队列等待时间             |
| jemalloc.background_thread.num_threads         | 无    | jemalloc 后台线程的数量          |
| jemalloc.resident                               | 无    | jemalloc 分配器占用的物理内存大小（字节） |
| InterserverThreads                             | 无    | Interserver 线程数           |
| BlockWriteMerges_nbd7                          | 无    | nbd7 块写合并数量               |

