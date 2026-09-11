---
id: redis_sentinel
title: 监控：Redis Sentinel监控
sidebar_label: Redis Sentinel
keywords: [开源监控系统, 开源数据库监控, Redis Sentinel监控]
---

> 对 Redis Sentinel 的通用性能指标进行采集监控。支持 Redis 2.8+。

## 配置参数

| 参数名称 | 参数帮助描述 |
|---|---|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口 | Redis Sentinel 对外提供的端口，默认值为26379。 |
| 查询超时时间(ms) | 设置 Sentinel info 查询未响应数据时的超时时间，单位ms毫秒，默认3000毫秒。 |
| 用户名 | 连接用户名，可选。 |
| 密码 | 连接密码，可选。 |
| Pattern | 匹配过滤 Redis Sentinel info 输出的正则表达式，可选。 |
| 启用 SSH 隧道 | 是否通过 SSH 隧道访问处于私网或防火墙后的 Sentinel 节点，默认 false。 |
| SSH 主机 | SSH 隧道的主机 IP 或域名。 |
| SSH 端口 | SSH 隧道的连接端口，默认为 22。 |
| SSH 超时时间(ms) | SSH 连接超时时间，单位毫秒，默认 60000 毫秒。 |
| SSH 用户名 | SSH 隧道的登录用户名。 |
| SSH 密码 | SSH 隧道的登录密码。 |
| 共享 SSH 连接 | 是否在多个监控指标采集之间共享 SSH 连接会话。 |
| SSH 私钥 | 使用密钥对认证时的 SSH 私钥内容（RSA/DSA/ED25519）。 |
| SSH 私钥密码 | 加密私钥的解密口令。 |

### 采集指标

#### 指标集合：server

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| identity | 无 | identity |
| redis_version | 无 | redis_version |
| redis_git_sha1 | 无 | redis_git_sha1 |
| redis_git_dirty | 无 | redis_git_dirty |
| redis_build_id | 无 | redis_build_id |
| redis_mode | 无 | redis_mode |
| os | 无 | os |
| arch_bits | 无 | arch_bits |
| multiplexing_api | 无 | multiplexing_api |
| atomicvar_api | 无 | atomicvar_api |
| gcc_version | 无 | gcc_version |
| process_id | 无 | process_id |
| process_supervised | 无 | process_supervised |
| run_id | 无 | run_id |
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
| cluster_connections | 无 | cluster_connections |
| maxclients | 无 | maxclients |
| client_recent_max_input_buffer | 无 | client_recent_max_input_buffer |
| client_recent_max_output_buffer | 无 | client_recent_max_output_buffer |
| blocked_clients | 无 | blocked_clients |
| tracking_clients | 无 | tracking_clients |
| clients_in_timeout_table | 无 | clients_in_timeout_table |

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
| rejected_connections | 无 | rejected_connections |
| sync_full | 无 | sync_full |
| sync_partial_ok | 无 | sync_partial_ok |
| sync_partial_err | 无 | sync_partial_err |
| expired_keys | 无 | expired_keys |
| expired_stale_perc | 无 | expired_stale_perc |
| expired_time_cap_reached_count | 无 | expired_time_cap_reached_count |
| expire_cycle_cpu_milliseconds | 无 | expire_cycle_cpu_milliseconds |
| evicted_keys | 无 | evicted_keys |
| keyspace_hits | 无 | keyspace_hits |
| keyspace_misses | 无 | keyspace_misses |
| pubsub_channels | 无 | pubsub_channels |
| pubsub_patterns | 无 | pubsub_patterns |
| latest_fork_usec | 无 | latest_fork_usec |
| total_forks | 无 | total_forks |
| migrate_cached_sockets | 无 | migrate_cached_sockets |
| slave_expires_tracked_keys | 无 | slave_expires_tracked_keys |
| active_defrag_hits | 无 | active_defrag_hits |
| active_defrag_misses | 无 | active_defrag_misses |
| active_defrag_key_hits | 无 | active_defrag_key_hits |
| active_defrag_key_misses | 无 | active_defrag_key_misses |
| tracking_total_keys | 无 | tracking_total_keys |
| tracking_total_items | 无 | tracking_total_items |
| tracking_total_prefixes | 无 | tracking_total_prefixes |
| unexpected_error_replies | 无 | unexpected_error_replies |
| total_error_replies | 无 | total_error_replies |
| dump_payload_sanitizations | 无 | dump_payload_sanitizations |
| total_reads_processed | 无 | total_reads_processed |
| total_writes_processed | 无 | total_writes_processed |
| io_threaded_reads_processed | 无 | io_threaded_reads_processed |
| io_threaded_writes_processed | 无 | io_threaded_writes_processed |

#### 指标集合：cpu

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| used_cpu_sys | 无 | used_cpu_sys |
| used_cpu_user | 无 | used_cpu_user |
| used_cpu_sys_children | 无 | used_cpu_sys_children |
| used_cpu_user_children | 无 | used_cpu_user_children |
| used_cpu_sys_main_thread | 无 | used_cpu_sys_main_thread |
| used_cpu_user_main_thread | 无 | used_cpu_user_main_thread |

#### 指标集合：sentinel

| 指标名称 | 指标单位 | 指标帮助描述 |
|---|---|---|
| sentinel_masters | 无 | sentinel_masters |
| sentinel_tilt | 无 | sentinel_tilt |
| sentinel_running_scripts | 无 | sentinel_running_scripts |
| sentinel_timedout_scripts | 无 | sentinel_timedout_scripts |
| sentinel_scripts_queue_length | 无 | sentinel_scripts_queue_length |
| sentinel_simulate_failure_flags | 无 | sentinel_simulate_failure_flags |
