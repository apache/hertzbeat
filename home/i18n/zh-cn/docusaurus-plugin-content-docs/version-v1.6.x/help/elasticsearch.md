---
id: elasticsearch
title: 监控：ElasticSearch
sidebar_label: ElasticSearch
keywords: [ 开源监控系统, 监控ElasticSearch ]
---

> 对ElasticSearch的通用性能指标进行采集监控。

### 配置参数

|  参数名称   |                        参数帮助描述                        |
|---------|------------------------------------------------------|
| 目标Host  | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称    | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口      | ElasticSearch开放的HTTP API端口，默认值：9200。                 |
| 启用HTTPS | 是否启用HTTPS。                                           |
| 认证方式    | 连接ElasticSearch使用的认证方式，可选。                           |
| 用户名     | 连接ElasticSearch的用户名，可选。                              |
| 密码      | 连接ElasticSearch的密码，可选                                |
| 查询超时时间  | 设置查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                     |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签    | 用于对监控资源进行分类管理。                                       |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

### 采集指标

#### 指标集合：health

|         指标名称          | 指标单位 |  指标帮助描述  |
|-----------------------|------|----------|
| cluster_name          | 无    | 集群名称     |
| status                | 无    | 集群状态     |
| nodes                 | 无    | 集群节点数    |
| data_nodes            | 无    | 数据节点数    |
| active_primary_shards | 无    | 主节点活跃分片数 |
| active_shards         | 无    | 活跃分片数    |
| active_percentage     | %    | 分片健康度    |
| initializing_shards   | 无    | 初始化分片数   |
| unassigned_shards     | 无    | 未分配分片数   |

#### 指标集合：nodes

|    指标名称    | 指标单位 | 指标帮助描述 |
|------------|------|--------|
| total      | 无    | 节点数    |
| successful | 无    | 在线节点数  |
| failed     | 无    | 离线节点数  |

#### 指标集合：nodes_detail

|       指标名称        | 指标单位 | 指标帮助描述  |
|-------------------|------|---------|
| node_name         | 无    | 节点名称    |
| ip                | 无    | IP地址    |
| cpu_load_average  | 无    | CPU平均负载 |
| cpu_percent       | %    | CPU占用率  |
| heap_used         | MB   | 内存使用量   |
| heap_used_percent | %    | 内存使用率   |
| heap_total        | MB   | 总内存     |
| disk_free         | GB   | 磁盘剩余容量  |
| disk_total        | GB   | 磁盘总容量   |
| disk_used_percent | %    | 磁盘使用率   |
