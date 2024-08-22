---
id: hbase_master  
title: 监控：Hbase Master监控    
sidebar_label: Apache Hbase Master
keywords: [开源监控系统, 开源数据库监控, HbaseMaster监控]
---

> 对Hbase Master的通用性能指标进行采集监控

**使用协议：HTTP**

## 监控前操作

查看 `hbase-site.xml` 文件，获取 `hbase.master.info.port` 配置项的值，该值用作监控使用。

## 配置参数

|  参数名称  |                         参数帮助描述                          |
|--------|---------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。    |
| 端口     | hbase master的端口号，默认为16010。即:`hbase.master.info.port`参数值 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                     |
| 查询超时时间 | 设置连接的超时时间，单位ms毫秒，默认3000毫秒。                              |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                          |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                             |

### 采集指标

#### 指标集合：server

|         指标名称         | 指标单位 |         指标帮助描述          |
|----------------------|------|-------------------------|
| numRegionServers     | 无    | 当前存活的 RegionServer 个数   |
| numDeadRegionServers | 无    | 当前Dead的 RegionServer 个数 |
| averageLoad          | 无    | 集群平均负载                  |
| clusterRequests      | 无    | 集群请求数量                  |

#### 指标集合：Rit

|         指标名称          | 指标单位 |    指标帮助描述    |
|-----------------------|------|--------------|
| ritCount              | 无    | 当前的 RIT 数量   |
| ritCountOverThreshold | 无    | 超过阈值的 RIT 数量 |
| ritOldestAge          | ms   | 最老的RIT的持续时间  |

#### 指标集合：basic

|          指标名称           | 指标单位 |       指标帮助描述       |
|-------------------------|------|--------------------|
| liveRegionServers       | 无    | 当前活跃RegionServer列表 |
| deadRegionServers       | 无    | 当前离线RegionServer列表 |
| zookeeperQuorum         | 无    | Zookeeper列表        |
| masterHostName          | 无    | Master节点           |
| BalancerCluster_num_ops | 无    | 集群负载均衡次数           |
| numActiveHandler        | 无    | RPC句柄数             |
| receivedBytes           | MB   | 集群接收数据量            |
| sentBytes               | MB   | 集群发送数据量(MB)        |
| clusterRequests         | 无    | 集群总请求数量            |
