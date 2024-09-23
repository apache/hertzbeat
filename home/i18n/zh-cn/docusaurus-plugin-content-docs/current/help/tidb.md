---
id: tidb  
title: 监控：TiDB数据库监控      
sidebar_label: TiDB数据库   
keywords: [开源监控系统, 开源数据库监控, TiDB数据库监控]
---

> 使用 HTTP 和 JDBC 协议对 TiDB 的通用性能指标进行采集监控。

### 配置参数

|   参数名称    |                                                               参数帮助描述                                                               |
|-----------|------------------------------------------------------------------------------------------------------------------------------------|
| 目标Host    | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。                                                                               |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                                                                                                |
| Service端口 | TiDB数据库对外提供用于状态报告的端口，默认为10080。                                                                                                     |
| PD端口      | TiDB数据库的PD端口，默认为2379。                                                                                                              |
| 查询超时时间    | 设置SQL查询未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。                                                                                                |
| JDBC端口    | TiDB数据库对外提供用于客户端请求的端口，默认为4000。                                                                                                     |
| 数据库名称     | 数据库实例名称，可选。                                                                                                                        |
| 用户名       | 数据库连接用户名，可选                                                                                                                        |
| 密码        | 数据库连接密码，可选                                                                                                                         |
| JDBC URL  | 数据库使用[JDBC驱动的](https://docs.pingcap.com/zh/tidb/stable/dev-guide-connect-to-tidb#jdbc)连接URL，可选，若配置，则URL里面的数据库名称，用户名密码等参数会覆盖上面配置的参数 |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                                                                                                     |
| 是否探测      | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                                                                                                   |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                                                                                                        |

### 采集指标

监控模板将从TiDB系统变量表中检索监控指标，用户可以自行检索[TiDB系统变量表](https://docs.pingcap.com/zh/tidb/stable/system-variables)以查询所需信息或其他系统变量。

除此之外，TiDB也提供默认监控指标表，见[Metrics Schema](https://docs.pingcap.com/zh/tidb/stable/metrics-schema)与[METRICS_SUMMARY](https://docs.pingcap.com/zh/tidb/stable/information-schema-metrics-summary)，用户可以根据需求自行添加检索式。

由于可以被监控的指标过多，下文仅介绍监控模板中所查询的指标。

#### 指标集合：系统变量

|          指标名称           | 指标单位 |                                                      指标帮助描述                                                      |
|-------------------------|------|------------------------------------------------------------------------------------------------------------------|
| version                 | 无    | MySQL 的版本和 TiDB 的版本，例如 '8.0.11-TiDB-v7.5.1'                                                                      |
| version_comment         | 无    | TiDB 版本号的其他信息，例如 'TiDB Server (Apache License 2.0) Community Edition, MySQL 8.0 compatible'                      |
| version_compile_machine | 无    | 运行 TiDB 的 CPU 架构的名称                                                                                              |
| version_compile_os      | 无    | TiDB 所在操作系统的名称                                                                                                   |
| max_connections         | 无    | 该变量表示 TiDB 中同时允许的最大客户端连接数，用于资源控制。默认情况下，该变量值为 0 表示不限制客户端连接数。当本变量的值大于 0 且客户端连接数到达此值时，TiDB 服务端将会拒绝新的客户端连接。          |
| datadir                 | 无    | 数据存储的位置，位置可以是本地路径 /tmp/tidb。如果数据存储在 TiKV 上，则可以是指向 PD 服务器的路径。变量值的格式为 ${pd-ip}:${pd-port}，表示 TiDB 在启动时连接到的 PD 服务器。 |
| port                    | 无    | 使用 MySQL 协议时 tidb-server 监听的端口。                                                                                  |
