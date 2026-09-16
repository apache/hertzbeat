---
id: kvrocks
title: 监控：Kvrocks 数据库监控
sidebar_label: Kvrocks 数据库
keywords: [开源监控系统, 开源数据库监控, Kvrocks数据库监控]
---

> 对 Apache Kvrocks 数据库的通用性能指标进行采集监控。支持 Apache Kvrocks 2.9.0+。

## 配置参数

| 参数名称 | 参数帮助描述 |
|---|---|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口 | Apache Kvrocks 对外提供的端口，默认值为 6666。 |
| 超时时间(ms) | 设置 Kvrocks info 查询未响应数据时的超时时间，单位ms毫秒，默认 3000 毫秒。 |
| 用户名 | 数据库连接用户名，可选。 |
| 密码 | 数据库连接密码，可选。 |

### 采集指标

#### 指标集合：server

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| kvrocks_version | 无 | kvrocks_version |
| redis_version | 无 | redis_version |
| git_sha1 | 无 | git_sha1 |
| kvrocks_mode | 无 | kvrocks_mode |
| os | 无 | os |
| arch_bits | 无 | arch_bits |
| multiplexing_api | 无 | multiplexing_api |
| atomicvar_api | 无 | atomicvar_api |
| gcc_version | 无 | gcc_version |
| process_id | 无 | process_id |
| tcp_port | 无 | tcp_port |
| server_time_usec | 无 | server_time_usec |
| uptime_in_seconds | 无 | uptime_in_seconds |
| uptime_in_days | 无 | uptime_in_days |
| hz | 无 | hz |
| configured_hz | 无 | configured_hz |
| lru_clock | 无 | lru_clock |
| executable | 无 | executable |
| config_file | 无 | config_file |
| io_threads_active | 无 | io_threads_active |

#### 指标集合：clients

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| connected_clients | 无 | connected_clients |
| maxclients | 无 | maxclients |
| blocked_clients | 无 | blocked_clients |
| monitor_clients | 无 | monitor_clients |

#### 指标集合：memory

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| used_memory_rss | 无 | used_memory_rss |
| used_memory_rss_human | MB | used_memory_rss_human |
| used_memory_lua | 无 | used_memory_lua |
| used_memory_lua_human | KB | used_memory_lua_human |
| used_memory_startup | 无 | used_memory_startup |

#### 指标集合：persistence

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| loading | 无 | loading |
| bgsave_in_progress | 无 | bgsave_in_progress |
| last_bgsave_time | 无 | last_bgsave_time |
| last_bgsave_status | 无 | last_bgsave_status |
| last_bgsave_time_sec | 无 | last_bgsave_time_sec |

#### 指标集合：stats

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| total_connections_received | 无 | total_connections_received |
| total_commands_processed | 无 | total_commands_processed |
| instantaneous_ops_per_sec | 无 | instantaneous_ops_per_sec |
| total_net_input_bytes | 无 | total_net_input_bytes |
| total_net_output_bytes | 无 | total_net_output_bytes |
| instantaneous_input_kbps | 无 | instantaneous_input_kbps |
| instantaneous_output_kbps | 无 | instantaneous_output_kbps |
| sync_full | 无 | sync_full |
| sync_partial_ok | 无 | sync_partial_ok |
| sync_partial_err | 无 | sync_partial_err |
| pubsub_channels | 无 | pubsub_channels |
| pubsub_patterns | 无 | pubsub_patterns |

#### 指标集合：replication

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| role | 无 | role |
| connected_slaves | 无 | connected_slaves |
| master_repl_offset | 无 | master_repl_offset |

#### 指标集合：cpu

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| used_cpu_sys | 无 | used_cpu_sys |
| used_cpu_user | 无 | used_cpu_user |

#### 指标集合：Commandstats

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| cmdstat_command | 无 | cmdstat_command |
| cmdstat_info | 无 | cmdstat_info |

#### 指标集合：cluster

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| cluster_enabled | 无 | cluster_enabled |

#### 指标集合：commandstats

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| cmdstat_client | 无 | cmdstat_client |
| cmdstat_config | 无 | cmdstat_config |
| cmdstat_get | 无 | cmdstat_get |
| cmdstat_hello | 无 | cmdstat_hello |
| cmdstat_info | 无 | cmdstat_info |
| cmdstat_keys | 无 | cmdstat_keys |
| cmdstat_ping | 无 | cmdstat_ping |
| cmdstat_select | 无 | cmdstat_select |
| cmdstat_set | 无 | cmdstat_set |

#### 指标集合：keyspace

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| db0 | 无 | db0 |
| sequence | 无 | sequence |
| used_db_size | 无 | used_db_size |
| max_db_size | 无 | max_db_size |
| used_percent | 无 | used_percent |
| disk_capacity | 无 | disk_capacity |
| used_disk_size | 无 | used_disk_size |
| used_disk_percent | 无 | used_disk_percent |
