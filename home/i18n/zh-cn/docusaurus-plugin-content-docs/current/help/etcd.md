---
id: etcd
title: 监控：etcd 监控
sidebar_label: etcd
keywords: [开源监控系统, 中间件监控, etcd监控]
---

> HertzBeat 通过采集 etcd 暴露的 Prometheus metrics 接口数据，对 etcd 键值存储进行监控。
>
> 支持 etcd 3.4 及以上版本（数据库大小指标 `etcd_mvcc_db_total_size_in_bytes` 自 3.4 起替代旧的 `etcd_debugging_*` 命名）。

## 监控前操作

### 确认 HertzBeat 能访问 etcd 的 metrics 接口

etcd 会在客户端端口（默认 `2379`）的 `/metrics` 路径暴露 Prometheus 格式的指标。请确保 HertzBeat 能访问该地址：

1. 若 etcd 仅监听 localhost，或客户端端口启用了双向 TLS，请通过 [`--listen-metrics-urls`](https://etcd.io/docs/latest/op-guide/configuration/) 配置独立的 metrics 监听地址。该地址提供 metrics 与健康检查端点；若不加 TLS 暴露，请仅限受信任网络访问。
2. 从 HertzBeat 所在机器访问 `{metrics-host}:{metrics-port}/metrics`（默认为客户端端口 `2379`），确认能获取到 metrics 数据。

更多信息请参考 [etcd 监控文档](https://etcd.io/docs/latest/op-guide/monitoring/)。

### 配置参数

| 参数名称   | 参数帮助描述                                       |
|--------|-----------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口     | metrics 接口端口，使用客户端 listener 时默认为 2379        |
| 查询超时时间 | HTTP请求超时时间，单位毫秒，默认6000                        |
| 启用HTTPS | 是否使用 HTTPS 请求 metrics 接口                      |
| 请求Headers | 可选的额外 HTTP 请求头                                |
| 认证方式   | 若 metrics 接口在认证代理后面，可选 Basic/Digest 认证        |
| 用户名/密码 | 配置认证方式后使用的凭据                                  |

### 采集指标

#### 指标集合：etcd_server_has_leader

| 指标名称      | 指标单位 | 指标帮助描述                       |
|-----------|------|------------------------------|
| hasLeader | 无    | 该 etcd 成员是否存在 raft 领导者(1有0无) |

#### 指标集合：etcd_mvcc_db_total_size_in_bytes

| 指标名称   | 指标单位 | 指标帮助描述          |
|--------|------|-----------------|
| dbSize | MB   | 物理分配的数据库总大小     |

#### 指标集合：etcd_server_leader_changes_seen_total

| 指标名称           | 指标单位 | 指标帮助描述       |
|----------------|------|--------------|
| leaderChanges  | 无    | 已观测到的领导者变更总次数 |

#### 指标集合：process_cpu_seconds_total

| 指标名称       | 指标单位 | 指标帮助描述           |
|------------|------|------------------|
| cpuSeconds | 秒    | 累计用户与系统CPU使用时间   |

#### 指标集合：process_resident_memory_bytes

| 指标名称   | 指标单位 | 指标帮助描述  |
|--------|------|---------|
| memory | MB   | 进程常驻内存大小 |
