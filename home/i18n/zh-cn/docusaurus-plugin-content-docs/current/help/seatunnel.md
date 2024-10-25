---
id: seatunnel
title: 监控：SeaTunnel
sidebar_label: SeaTunnel
keywords: [ 开源监控系统, 监控SeaTunnel ]
---

> 对 SeaTunnel 指标进行采集监控。

### 配置参数

|  参数名称   | 参数帮助描述                                               |
|---------|------------------------------------------------------|
| 目标Host  | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称    | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口      | SeaTunnel开放的监控端口，默认值：5801。                           |
| 启用HTTPS | 是否启用HTTPS。                                           |
| 查询超时时间  | 设置查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                     |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签    | 用于对监控资源进行分类管理。                                       |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

### 采集指标

#### 指标集合：集群概览

|         指标名称          | 指标单位 | 指标帮助描述   |
|-----------------------|------|----------|
| projectVersion          | 无    |  项目版本        |
| gitCommitAbbrev                | 无    | Git提交编号     |
| totalSlot                 | 无    | 总槽位数    |
| unassignedSlot            | 无    | 未分配槽位数    |
| runningJobs | 无    | 运行中任务数 |
| finishedJobs         | 无    | 已完成任务数    |
| failedJobs     | 无    | 失败任务数    |
| cancelledJobs   | 无    | 取消任务数   |
| workers     | 无    | Worker数   |

#### 指标集合：线程信息

| 指标名称        | 指标单位 | 指标帮助描述 |
|-------------|------|--------|
| threadName  | 无    | 线程名称    |
| threadId    | 无    | 线程ID  |
| threadState | 无    | 线程状态  |
| stackTrace  | 无 | 堆栈信息 |

#### 指标集合：节点监控

|    指标名称    | 指标单位 | 指标帮助描述     |
|------------|------|------------|
| isMaster      | 无    | 是否主节点      |
| host | 无    | IP地址       |
| port     | 无  | 端口         |
| processors | 无 | 处理器数       |
| physical.memory.total | 无 | 物理内存总量     |
| physical.memory.free | 无 | 物理内存可用     |
| swap.space.total | 无 | 交换空间总量     |
| swap.space.free | 无 | 交换空间可用     |
| heap.memory.used | 无 | 堆内存已用      |
| heap.memory.free | 无 | 堆内存可用      |
| heap.memory.total | 无 | 堆内存总量      |
| heap.memory.max | 无 | 堆内存最大      |
| heap.memory.used/total | 无 | 堆内存使用率     |
| heap.memory.used/max | 无 | 堆内存使用率最大   |
| minor.gc.count | 无 | 垃圾回收次数     |
| minor.gc.time | 无 | 垃圾回收时间     |
| major.gc.count | 无 | Major垃圾回收次数 |
| major.gc.time | 无 | Major垃圾回收时间     |
| load.process | 无 | 进程负载       |
| load.system | 无 | 系统负载       |
| load.systemAverage | 无 | 系统平均负载     |
| thread.count | 无 | 线程数        |
| thread.peakCount | 无 | 线程峰值       |
| cluster.timeDiff | 无 | 集群时间差      |
| event.q.size | 无 | 事件队列大小     |
| executor.q.async.size | 无 | 异步执行队列大小   |
| executor.q.client.size | 无 | 客户端执行队列大小  |
| executor.q.client.query.size | 无 | 客户端查询队列大小  |
| executor.q.client.blocking.size | 无 | 客户端阻塞队列大小  |
| executor.q.query.size | 无 | 查询队列大小     |
| executor.q.scheduled.size | 无 | 定时执行队列大小   |
| executor.q.io.size | 无 | IO队列大小     |
| executor.q.system.size | 无 | 系统执行队列大小   |
| executor.q.operations.size | 无 | 操作队列大小     |
| executor.q.priorityOperation.size | 无 | 优先操作队列大小   |
| operations.completed.count | 无 | 完成操作次数     |
| executor.q.mapLoad.size | 无 | 映射加载队列大小   |
| executor.q.mapLoadAllKeys.size | 无 | 映射加载所有键大小  |
| executor.q.cluster.size | 无 | 集群执行队列大小   |
| executor.q.response.size | 无 | 响应队列大小     |
| operations.running.count | 无 | 正在运行的操作数量  |
| operations.pending.invocations.percentage | 无 | 待处理调用百分比   |
| operations.pending.invocations.count | 无 | 待处理调用数量    |
| proxy.count | 无 | 代理数量       |
| clientEndpoint.count | 无 | 客户端端点数量    |
| connection.active.count | 无 | 活动连接数      |
| client.connection.count | 无 | 客户端连接数     |
| connection.count | 无 | 总连接数       |
