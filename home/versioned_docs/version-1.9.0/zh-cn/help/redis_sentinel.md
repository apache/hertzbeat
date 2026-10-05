---
id: redis_sentinel
title: 监控 Redis 哨兵
sidebar_label: Redis 哨兵监控
keywords: [开源监控系统, 开源数据库监控, Redis哨兵监控]
---

> 对 Redis Sentinel（哨兵）实例的关键性能指标进行采集监控。

## 监控前置要求

> 在添加 Redis 哨兵监控之前，请确保以下条件已满足：

1. Redis Sentinel 服务已正常运行，且哨兵监听端口（默认为 **26379**）可从 HertzBeat 服务器访问。
2. 如果哨兵实例配置了身份认证，请提前准备好用户名和密码。
3. HertzBeat 服务器与目标主机之间不存在阻断哨兵端口的防火墙规则。

## 配置参数

| 参数名称 | 参数帮助描述 |
| -------- | ------------ |
| 目标Host | 被监控主机的 IPv4、IPv6 地址或域名。注意：不需要填写协议头，例如 `192.168.0.1`。 |
| 端口 | Redis Sentinel 实例的监听端口。默认值：**26379**。 |
| 超时时间 | 连接的超时时长，单位为毫秒。默认值：`3000`。 |
| 用户名 | 连接 Redis Sentinel 实例时使用的用户名。可选。 |
| 密码 | 连接 Redis Sentinel 实例时使用的密码。可选。 |
| 采集间隔 | HertzBeat 轮询此监控的间隔时间，单位为秒。最小值：30s。 |
| 描述备注 | 此监控的附加备注和说明信息。 |

## 采集指标

### 指标集合：sentinel（哨兵概况）

> 通过 `INFO sentinel` 命令采集哨兵整体概况指标。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| sentinel_masters | 无 | 当前 Sentinel 实例监控的 Redis 主节点总数量。 |
| sentinel_tilt | 无 | Sentinel 是否处于 TILT 模式（时钟偏斜安全模式）。`1` 表示 TILT 已激活，`0` 表示正常运行。 |
| sentinel_running_scripts | 无 | 当前 Sentinel 正在执行的 Lua 脚本数量。 |
| sentinel_timedout_scripts | 无 | 已超时的脚本数量。 |
| sentinel_scripts_queue_length | 无 | 当前等待执行的脚本队列长度。 |
| sentinel_simulate_failure_flags | 无 | 用于故障模拟测试的位掩码标志（通过 `SENTINEL SIMULATE-FAILURE` 命令设置）。 |

### 指标集合：master_status（主节点状态）

> 每个被监控 Redis 主节点的状态信息。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| master0 | 无 | 第一个被监控主节点的状态字符串，例如：`name=mymaster,status=ok,address=127.0.0.1:6379,slaves=1,sentinels=3`。 |
| master1 | 无 | 第二个被监控主节点的状态字符串（如存在）。 |
| master2 | 无 | 第三个被监控主节点的状态字符串（如存在）。 |

### 指标集合：server（服务器信息）

> 通过 `INFO server` 命令采集 Sentinel 进程的服务器级别信息。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| redis_version | 无 | Redis（Sentinel）二进制文件的版本字符串。 |
| os | 无 | Sentinel 所运行的操作系统信息。 |
| arch_bits | 无 | CPU 架构位数（32位或64位）。 |
| process_id | 无 | Sentinel 服务器进程的 PID。 |
| tcp_port | 无 | Sentinel 监听的 TCP 端口号。 |
| uptime_in_seconds | s | Sentinel 进程启动后的运行时长（秒）。 |
| uptime_in_days | d | Sentinel 进程启动后的运行时长（天）。 |
| hz | 无 | 服务器后台事件循环的频率（每秒调用次数）。 |
| executable | 无 | 服务器可执行文件的绝对路径。 |
| config_file | 无 | Sentinel 配置文件的绝对路径。 |

### 指标集合：clients（客户端信息）

> 通过 `INFO clients` 命令采集客户端连接统计信息。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| connected_clients | 无 | 当前已建立的客户端连接数量（不包括副本节点的连接）。 |
| blocked_clients | 无 | 正在等待阻塞命令（如 BLPOP、WAIT）的客户端数量。 |
| maxclients | 无 | 配置允许的最大客户端连接数量。 |
| client_recent_max_input_buffer | 无 | 所有当前客户端连接中最大的输入缓冲区大小（字节）。 |
| client_recent_max_output_buffer | 无 | 所有当前客户端连接中最大的输出缓冲区大小（字节）。 |

### 指标集合：stats（全局统计信息）

> 通过 `INFO stats` 命令采集服务器全局统计数据。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| total_connections_received | 无 | 服务器启动以来接受的连接总数。 |
| total_commands_processed | 无 | 服务器启动以来处理的命令总数。 |
| instantaneous_ops_per_sec | 无 | 每秒处理的命令数量（实时快照）。 |
| rejected_connections | 无 | 因达到 `maxclients` 限制而被拒绝的连接数量。 |
| total_net_input_bytes | 无 | 服务器启动以来从客户端接收的总字节数。 |
| total_net_output_bytes | 无 | 服务器启动以来发送给客户端的总字节数。 |

### 指标集合：cpu（CPU 消耗信息）

> 通过 `INFO cpu` 命令采集 CPU 使用统计数据。

| 指标名称 | 指标单位 | 指标帮助描述 |
| -------- | -------- | ------------ |
| used_cpu_sys | 无 | Sentinel 服务器进程消耗的内核态（系统态）CPU 时间。 |
| used_cpu_user | 无 | Sentinel 服务器进程消耗的用户态 CPU 时间。 |
| used_cpu_sys_children | 无 | 后台子进程消耗的内核态（系统态）CPU 时间。 |
| used_cpu_user_children | 无 | 后台子进程消耗的用户态 CPU 时间。 |
