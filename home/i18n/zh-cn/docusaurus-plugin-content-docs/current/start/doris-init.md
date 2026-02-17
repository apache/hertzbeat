---
id: doris-init
title: 依赖时序数据库服务 Doris 安装初始化(可选)
sidebar_label: 指标/日志数据存储 Doris
---

Apache HertzBeat™ 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装（注意⚠️但强烈建议生产环境配置）。

> 我们推荐使用并长期支持 Greptime 作为存储。

Apache Doris 是一款面向实时分析场景的 MPP 数据库。在 HertzBeat 中，Doris 可用于同时存储：

- 指标历史数据（`hzb_history`）
- 日志数据（`hzb_log`）

**⚠️ 若不配置时序数据库，则只会保留最近一小时历史数据。**

> 如果您已有 Doris 环境，可直接跳到 YML 配置步骤。

### 安装 Doris（可选）

你可以通过安装包或 Docker 部署 Doris。生产环境建议参考官方部署文档：

- Doris 官方文档：[Quick Start](https://doris.apache.org/docs/4.x/gettingStarted/quick-start/)

对 HertzBeat 接入来说，至少需要保证：

- FE MySQL 服务端口可访问（默认 `9030`）
- FE HTTP 服务端口可访问（默认 `8030`）

### 前置检查

1. Doris FE、BE 节点状态正常。
2. HertzBeat 到 Doris 网络可达：
   - FE MySQL 端口（默认 `9030`），用于建库建表、查询
   - FE HTTP 端口（默认 `8030`），用于 Stream Load 写入
3. 配置的 Doris 用户具有建库建表、写入、查询权限。

### 注意：复杂网络下的 Stream Load 重定向

HertzBeat 使用 Stream Load 写入时，请求会先发到 FE，随后 FE 会返回一个可用 BE 的 HTTP 重定向地址，客户端再向该 BE 写入数据。

在跨网络、Kubernetes、负载均衡等场景中，需要特别注意：

- FE 返回的 BE 地址必须对 HertzBeat 可达。
- 或者在 Doris 侧配置 BE 公网/内网地址标签，并在 HertzBeat 中设置 `redirect-policy`（`direct` / `public` / `private`），让 FE 返回可达的地址。

参考文档：

- [复杂网络下的 Stream Load 原理](https://doris.apache.org/zh-CN/docs/4.x/data-operate/import/load-internals/stream-load-in-complex-network)

### 在 HertzBeat `application.yml` 中配置 Doris

1. 修改 `hertzbeat/config/application.yml`。

   Docker 容器部署需将配置文件挂载到主机本地，安装包部署直接修改解压目录下配置文件即可。

2. 配置 `warehouse.store.doris`：

```yaml
warehouse:
  store:
    doris:
      enabled: true
      # Doris FE MySQL 连接地址
      url: jdbc:mysql://127.0.0.1:9030
      username: root
      password:

      table-config:
        # 开启动态分区（用于自动过期）
        enable-partition: true
        # 支持 HOUR / DAY / MONTH
        partition-time-unit: DAY
        # 历史分区保留数量
        partition-retention-days: 30
        # 预创建未来分区数量
        partition-future-days: 3
        buckets: 8
        replication-num: 1

      pool-config:
        minimum-idle: 5
        maximum-pool-size: 20
        connection-timeout: 30000

      write-config:
        # jdbc 或 stream（高吞吐推荐 stream）
        write-mode: stream
        # 批量参数
        batch-size: 1000
        flush-interval: 5
        stream-load-config:
          # Doris FE HTTP 端口
          http-port: ":8030"
          timeout: 60
          max-bytes-per-batch: 10485760
          # 可选：direct / public / private
          redirect-policy: ""
```

### 参数说明

| 参数 | 说明 |
| --- | --- |
| `enabled` | 是否启用 Doris 存储 |
| `url` | Doris FE MySQL JDBC 地址 |
| `table-config.enable-partition` | 是否启用动态分区与自动过期 |
| `table-config.partition-time-unit` | 分区时间粒度：`HOUR` / `DAY` / `MONTH` |
| `table-config.partition-retention-days` | 历史分区保留数量 |
| `table-config.partition-future-days` | 未来分区预创建数量 |
| `table-config.buckets` | 分桶数量 |
| `table-config.replication-num` | 副本数量 |
| `write-config.write-mode` | 写入模式：`jdbc` 或 `stream` |
| `write-config.batch-size` | 单批写入大小 |
| `write-config.flush-interval` | 刷新间隔（秒） |
| `stream-load-config.http-port` | Stream Load 使用的 FE HTTP 端口 |
| `stream-load-config.timeout` | Stream Load 超时时间（秒） |
| `stream-load-config.max-bytes-per-batch` | 单批最大字节数 |
| `stream-load-config.redirect-policy` | FE->BE 地址返回策略：`direct` / `public` / `private` |

### 重启 HertzBeat

完成配置后，重启 HertzBeat 使配置生效。

### 验证 Doris 存储是否生效

1. 查看 HertzBeat 日志，确认出现 Stream Load 成功日志。
2. 在 Doris 中检查建表是否完成：

```sql
SHOW CREATE TABLE hertzbeat.hzb_history;
SHOW CREATE TABLE hertzbeat.hzb_log;
```

3. 若启用了动态分区，检查分区调度状态：

```sql
SHOW DYNAMIC PARTITION TABLES FROM hertzbeat;
SHOW PARTITIONS FROM hertzbeat.hzb_history;
SHOW PARTITIONS FROM hertzbeat.hzb_log;
```

### 常见问题

1. 不开启分区还能分桶吗？

   > 可以。分桶与是否开启动态分区无强依赖，`enable-partition` 主要影响动态分区和自动过期能力。

2. Doris 能否同时存储指标和日志？

   > 可以。HertzBeat 会将指标写入 `hzb_history`，日志写入 `hzb_log`，共用同一 Doris 数据源配置。

3. 修改 `application.yml` 的分区/分桶参数后，旧表会自动更新吗？

   > 不会。已存在表的 DDL 不会自动变更。需要手动执行 DDL 或重建表。

4. 当前是否启用了 Stream Load 压缩？

   > 当前实现默认使用 JSON Stream Load。
