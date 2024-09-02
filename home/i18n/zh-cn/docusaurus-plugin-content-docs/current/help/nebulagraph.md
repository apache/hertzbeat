---
id: nebulaGraph
title: 监控 NebulaGraph 数据库
sidebar_label: NebulaGraph 数据库
keywords: [ 开源监控工具, 开源 NebulaGraph 监控工具, 监控 NebulaGraph 指标 ]
---

> 收集和监控 NebulaGraph 的常规性能指标。

**使用协议：nebulaGraph**

```text
监控分为两个部分，nebulaGraph_stats 和 rocksdb_stats。
nebulaGraph_stats 是 NebulaGraph 的统计信息，rocksdb_stats 是 RocksDB 的统计信息。
```

**1、通过 stats 和 rocksdb stats 接口获取可用参数。**

1.1、如果只需要获取 nebulaGraph_stats，需要确保可以访问 stats，否则会出现错误。

默认端口是 19669，访问地址为 <http://ip:19669/stats>

1.2、如果需要获取 rocksdb stats 的附加参数，需要确保可以访问 rocksdb stats，否则会报错。

首次连接 NebulaGraph 时，必须先注册 Storage 服务，以便正确查询数据。

**有帮助文档：<https://docs.nebula-graph.com.cn/3.4.3/4.deployment-and-installation/connect-to-nebula-graph/>**

**<https://docs.nebula-graph.com.cn/3.4.3/2.quick-start/3.quick-start-on-premise/3.1add-storage-hosts/>**

默认端口是 19779，访问地址为：<http://ip:19779/rocksdb_stats>

### 配置参数

|    参数名称     |                               参数帮助描述                               |
|-------------|--------------------------------------------------------------------|
| 监控主机        | 被监控的 IPV4、IPV6 或域名。注意⚠️没有协议头（例如：https://、http://）                  |
| 监控名称        | 识别此监控的名称。名称需要唯一                                                    |
| graphPort   | Nebula Graph 提供的 Graph 服务的端口                                       |
| timePeriod  | 可以是 5 秒、60 秒、600 秒或 3600 秒，分别表示最近 5 秒、最近 1 分钟、最近 10 分钟和最近 1 小时的时间段 |
| storagePort | Nebula Graph 提供的 Storage 服务的端口                                     |
| 超时          | 允许收集响应时间                                                           |
| 收集间隔        | 监控周期性数据收集的间隔时间，单位：秒，最小可设置的间隔为 30 秒                                 |
| 是否检测        | 是否检测和验证添加监控之前的可用性。只有检测成功后，添加和修改操作才会继续进行                            |
| 描述备注        | 用于识别和描述此监控的更多信息，用户可以在此处记录信息                                        |

### 收集指标

#### 指标集：nebulaGraph_stats

指标太多，相关链接如下
**<https://docs.nebula-graph.com.cn/3.4.3/6.monitor-and-metrics/1.query-performance-metrics/>**

|                              指标名称                              | 指标单位 | 指标帮助描述 |
|----------------------------------------------------------------|------|--------|
| 达到内存水位线的语句的数量(rate)                                            |      |        |
| 达到内存水位线的语句的数量(sum)                                             |      |        |
| 服务端主动回收的过期的会话数量(rate)                                          |      |        |
| 服务端主动回收的过期的会话数量(sum)                                           |      |        |
| 慢查询延迟时间(avg)                                                   |      |        |
| 慢查询延迟时间(p75)                                                   |      |        |
| 慢查询延迟时间(p95)                                                   |      |        |
| 慢查询延迟时间(p99)                                                   |      |        |
| 慢查询延迟时间(p999)                                                  |      |        |
| 查询延迟时间(avg)                                                    |      |        |
| 查询延迟时间(p75)                                                    |      |        |
| 查询延迟时间(p95)                                                    |      |        |
| 查询延迟时间(p99)                                                    |      |        |
| 查询延迟时间(p999)                                                   |      |        |
| 因用户名密码错误导验证失败的会话数量(rate)                                       |      |        |
| 因用户名密码错误导验证失败的会话数量(sum)                                        |      |        |
| 查询次数(rate)                                                     |      |        |
| 查询次数(sum)                                                      |      |        |
| 排序（Sort）算子执行时间(rate)                                           |      |        |
| 排序（Sort）算子执行时间(sum)                                            |      |        |
| Graphd 服务发给 Storaged 服务的 RPC 请求失败的数量(rate)                     |      |        |
| Graphd 服务发给 Storaged 服务的 RPC 请求失败的数量(sum)                      |      |        |
| 登录验证失败的会话数量(rate)                                              |      |        |
| 登录验证失败的会话数量(sum)                                               |      |        |
| 查询报错语句数量(rate)                                                 |      |        |
| 查询报错语句数量(sum)                                                  |      |        |
| 被终止的查询数量(rate)                                                 |      |        |
| 被终止的查询数量(sum)                                                  |      |        |
| 因查询错误而导致的 Leader 变更的次数(rate)                                   |      |        |
| 因查询错误而导致的 Leader 变更的次数(sum)                                    |      |        |
| Graphd 服务发给 Metad 服务的 RPC 请求数量(rate)                           |      |        |
| Graphd 服务发给 Metad 服务的 RPC 请求数量(sum)                            |      |        |
| 慢查询次数(rate)                                                    |      |        |
| 慢查询次数(sum)                                                     |      |        |
| 活跃的会话数的变化数(sum)                                                |      |        |
| 活跃的查询语句数的变化数(sum)                                              |      |        |
| Graphd 服务接收的语句数(rate)                                          |      |        |
| Graphd 服务接收的语句数(sum)                                           |      |        |
| 聚合（Aggregate）算子执行时间(rate)                                      |      |        |
| 聚合（Aggregate）算子执行时间(sum)                                       |      |        |
| 优化器阶段延迟时间(avg)                                                 |      |        |
| 优化器阶段延迟时间(p75)                                                 |      |        |
| 优化器阶段延迟时间(p95)                                                 |      |        |
| 优化器阶段延迟时间(p99)                                                 |      |        |
| 优化器阶段延迟时间(p999)                                                |      |        |
| Graphd 服务发给 Metad 的 RPC 请求失败的数量(rate)                          |      |        |
| Graphd 服务发给 Metad 的 RPC 请求失败的数量(sum)                           |      |        |
| 索引扫描（IndexScan）算子执行时间(rate)                                    |      |        |
| 索引扫描（IndexScan）算子执行时间(sum)                                     |      |        |
| 服务端建立过的会话数量(rate)                                              |      |        |
| 服务端建立过的会话数量(sum)                                               |      |        |
| 因为超过FLAG_OUT_OF_MAX_ALLOWED_CONNECTIONS参数导致的验证登录的失败的会话数量(rate) |      |        |
| 因为超过FLAG_OUT_OF_MAX_ALLOWED_CONNECTIONS参数导致的验证登录的失败的会话数量(sum)  |      |        |
| Graphd 服务发给 Storaged 服务的 RPC 请求数量(rate)                        |      |        |
| Graphd 服务发给 Storaged 服务的 RPC 请求数量(sum)                         |      |        |

#### 指标集：rocksdb_stats

指标太多，相关链接如下
**<https://docs.nebula-graph.com.cn/3.4.3/6.monitor-and-metrics/2.rocksdb-statistics/>**

|            指标名称            | 指标单位 |         指标帮助描述         |
|----------------------------|------|------------------------|
| rocksdb.backup.read.bytes  |      | 备份 RocksDB 数据库期间读取的字节数 |
| rocksdb.backup.write.bytes |      | 指标名称                   |
| ...                        |      | ...                    |
