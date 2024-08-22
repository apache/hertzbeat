---
id: nebulagraph_cluster
title: 监控：NebulaGraph集群监控
sidebar_label: NebulaGraph集群
keywords: [ 开源监控系统, 开源数据库监控, 开源图数据库监控, NebulaGraph集群监控 ]
---

> 对NebulaGraph集群的基础信息、节点，任务等进行监控。

**协议使用：ngql**

### 配置参数

|  参数名称   |                        参数帮助描述                        |
|---------|------------------------------------------------------|
| 目标Host  | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称    | 标识此监控的名称，名称需要保证唯一性。                                  |
| graph端口 | graph服务开放的端口，默认为9669。                                |
| 连接超时时间  | 连接graph服务超时时间，单位ms毫秒，默认6000毫秒。                       |
| 用户名     | 数据库连接用户名。                                            |
| 密码      | 数据库连接密码。                                             |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签    | 用于对监控资源进行分类管理                                        |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：基础信息

|     指标名称     | 指标单位 | 指标帮助描述  |
|--------------|------|---------|
| responseTime | 无    | 响应时间    |
| charset      | 无    | 字符集     |
| collation    | 无    | 字符集排序规则 |

#### 指标集合：Session

|        指标名称         | 指标单位 |   指标帮助描述   |
|---------------------|------|------------|
| session             | 无    | session的数量 |
| running_query_count | 无    | 正在执行的查询的数量 |

#### 指标集合：后台任务

|     指标名称     | 指标单位 |    指标帮助描述    |
|--------------|------|--------------|
| queue_jobs   | 无    | 等待中的后台任务     |
| running_jobs | 无    | 正在执行的后台任务的数量 |

#### 指标集合：节点信息

|         指标名称         | 指标单位 |     指标帮助描述      |
|----------------------|------|-----------------|
| total_storage_node   | 无    | storage节点的数量    |
| offline_storage_node | 无    | 离线的storage节点的数量 |
| total_meta_node      | 无    | meta节点的数量       |
| offline_meta_node    | 无    | 离线的meta节点的数量    |
| total_graph_node     | 无    | graph节点数量       |
| offline_graph_node   | 无    | 离线graph节点数量     |

#### 指标集合：Storage节点

|         指标名称          | 指标单位 |       指标帮助描述        |
|-----------------------|------|---------------------|
| host                  | 无    | 节点地址                |
| port                  | 无    | 端口                  |
| status                | 无    | 状态 （ONLINE/OFFLINE） |
| leaderCount           | 无    | 当前节点leader分片的数量     |
| leaderDistribution    | 无    | 当前节点leader分片分布      |
| partitionDistribution | 无    | 当前节点上分片分布           |
| version               | 无    | 版本                  |

#### 指标集合：Meta节点

|  指标名称   | 指标单位 |       指标帮助描述        |
|---------|------|---------------------|
| host    | 无    | 节点地址                |
| port    | 无    | 端口                  |
| status  | 无    | 状态 （ONLINE/OFFLINE） |
| version | 无    | 版本                  |

#### 指标集合：Graph节点

|  指标名称   | 指标单位 |       指标帮助描述        |
|---------|------|---------------------|
| host    | 无    | 节点地址                |
| port    | 无    | 端口                  |
| status  | 无    | 状态 （ONLINE/OFFLINE） |
| version | 无    | 版本                  |

> 如果需要自定义监控模板采集NebulaGraph集群的数据，请参考： [NGQL自定义监控](../advanced/extend-ngql.md)
