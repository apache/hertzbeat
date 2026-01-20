---
id: presto
title: 监控：PrestoDB 数据库
sidebar_label: PrestoDB 数据库
keywords: [ 开源监控系统, 开源数据库监控, Presto数据库监控 ]
---

> 对PrestoDB Atlas 的通用性能指标进行采集监控。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 被监控的平台端口。                                            |
| 连接超时时间 | 设置连接PrestoDB未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。             |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒。                      |
| 绑定标签   | 用于对监控资源进行分类管理。                                       |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

### 采集指标

#### 指标集合：集群状态

|      指标名称      | 指标单位 | 指标帮助描述  |
|----------------|------|---------|
| activeWorkers  | 无    | 活跃节点数   |
| runningQueries | 无    | 运行中的查询数 |
| queuedQueries  | 无    | 队列中的查询数 |
| blockedQueries | 无    | 阻塞的查询数  |
| runningDrivers | 无    | 运行中的驱动数 |
| runningTasks   | 无    | 运行中的任务数 |

#### 指标集合：节点信息

|        指标名称        | 指标单位 |     指标帮助描述     |
|--------------------|------|----------------|
| uri                | 无    | 节点链接           |
| recentRequests     | 无    | 最近一段时间内的请求数量   |
| recentFailures     | 无    | 最近一段时间内的失败请求数量 |
| recentSuccesses    | 无    | 最近一段时间内的成功请求数量 |
| lastRequestTime    | 无    | 最近一次请求的时间      |
| lastResponseTime   | 无    | 最近一次响应的时间      |
| age                | 无    | 持续时间           |
| recentFailureRatio | 无    | 最近一段时间内的失败     |

#### 指标集合：节点状态

|      指标名称       | 指标单位 |  指标帮助描述  |
|-----------------|------|----------|
| nodeId          | 无    | 节点ID     |
| nodeVersion     | 无    | 节点版本     |
| environment     | 无    | 环境       |
| coordinator     | 无    | 是否为协调节点  |
| uptime          | 无    | 正常运行时间   |
| externalAddress | 无    | 外部地址     |
| internalAddress | 无    | 内部地址     |
| processors      | 无    | 处理器数量    |
| processCpuLoad  | 无    | 进程CPU负载  |
| systemCpuLoad   | 无    | 系统CPU负载  |
| heapUsed        | MB   | 已使用堆内存   |
| heapAvailable   | MB   | 可用堆内存    |
| nonHeapUsed     | MB   | 请已使用非堆内存 |

#### 指标集合： 任务查询

|     指标名称      | 指标单位 | 指标帮助描述 |
|---------------|------|--------|
| taskId        | 无    | 任务ID   |
| version       | 无    | 版本     |
| state         | 无    | 状态     |
| self          | 无    | 自身     |
| lastHeartbeat | 无    | 最后心跳时间 |
