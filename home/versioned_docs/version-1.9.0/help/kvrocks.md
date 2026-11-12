---
id: kvrocks
title: Monitoring Apache Kvrocks
sidebar_label: Kvrocks
keywords: [ open source monitoring tool, open source Kvrocks monitoring tool, monitoring Kvrocks metrics ]
---

> Collect and monitor the general performance metrics of Apache Kvrocks database. Support Apache Kvrocks 2.9.0+.

## Configuration parameter

| Parameter name | Parameter help description |
|---|---|
| Target Host | The IP, IPV6, or domain name of the monitored endpoint. Note ⚠️: Do not include protocol headers (eg: https://, http://). |
| Port | The port provided by Apache Kvrocks, default value is 6666. |
| Timeout(ms) | Set the timeout time when Kvrocks info query does not respond to data, unit: ms, default: 3000ms. |
| Username | Database connection username, optional. |
| Password | Database connection password, optional. |

### Collection Metric

#### Metric set：server

| Metric name | Metric unit | Metric help description |
|---|---|---|
| kvrocks_version | none | kvrocks_version |
| redis_version | none | redis_version |
| git_sha1 | none | git_sha1 |
| kvrocks_mode | none | kvrocks_mode |
| os | none | os |
| arch_bits | none | arch_bits |
| multiplexing_api | none | multiplexing_api |
| atomicvar_api | none | atomicvar_api |
| gcc_version | none | gcc_version |
| process_id | none | process_id |
| tcp_port | none | tcp_port |
| server_time_usec | none | server_time_usec |
| uptime_in_seconds | none | uptime_in_seconds |
| uptime_in_days | none | uptime_in_days |
| hz | none | hz |
| configured_hz | none | configured_hz |
| lru_clock | none | lru_clock |
| executable | none | executable |
| config_file | none | config_file |
| io_threads_active | none | io_threads_active |

#### Metric set：clients

| Metric name | Metric unit | Metric help description |
|---|---|---|
| connected_clients | none | connected_clients |
| maxclients | none | maxclients |
| blocked_clients | none | blocked_clients |
| monitor_clients | none | monitor_clients |

#### Metric set：memory

| Metric name | Metric unit | Metric help description |
|---|---|---|
| used_memory_rss | none | used_memory_rss |
| used_memory_rss_human | MB | used_memory_rss_human |
| used_memory_lua | none | used_memory_lua |
| used_memory_lua_human | KB | used_memory_lua_human |
| used_memory_startup | none | used_memory_startup |

#### Metric set：persistence

| Metric name | Metric unit | Metric help description |
|---|---|---|
| loading | none | loading |
| bgsave_in_progress | none | bgsave_in_progress |
| last_bgsave_time | none | last_bgsave_time |
| last_bgsave_status | none | last_bgsave_status |
| last_bgsave_time_sec | none | last_bgsave_time_sec |

#### Metric set：stats

| Metric name | Metric unit | Metric help description |
|---|---|---|
| total_connections_received | none | total_connections_received |
| total_commands_processed | none | total_commands_processed |
| instantaneous_ops_per_sec | none | instantaneous_ops_per_sec |
| total_net_input_bytes | none | total_net_input_bytes |
| total_net_output_bytes | none | total_net_output_bytes |
| instantaneous_input_kbps | none | instantaneous_input_kbps |
| instantaneous_output_kbps | none | instantaneous_output_kbps |
| sync_full | none | sync_full |
| sync_partial_ok | none | sync_partial_ok |
| sync_partial_err | none | sync_partial_err |
| pubsub_channels | none | pubsub_channels |
| pubsub_patterns | none | pubsub_patterns |

#### Metric set：replication

| Metric name | Metric unit | Metric help description |
|---|---|---|
| role | none | role |
| connected_slaves | none | connected_slaves |
| master_repl_offset | none | master_repl_offset |

#### Metric set：cpu

| Metric name | Metric unit | Metric help description |
|---|---|---|
| used_cpu_sys | none | used_cpu_sys |
| used_cpu_user | none | used_cpu_user |

#### Metric set：Commandstats

| Metric name | Metric unit | Metric help description |
|---|---|---|
| cmdstat_command | none | cmdstat_command |
| cmdstat_info | none | cmdstat_info |

#### Metric set：cluster

| Metric name | Metric unit | Metric help description |
|---|---|---|
| cluster_enabled | none | cluster_enabled |

#### Metric set：commandstats

| Metric name | Metric unit | Metric help description |
|---|---|---|
| cmdstat_client | none | cmdstat_client |
| cmdstat_config | none | cmdstat_config |
| cmdstat_get | none | cmdstat_get |
| cmdstat_hello | none | cmdstat_hello |
| cmdstat_info | none | cmdstat_info |
| cmdstat_keys | none | cmdstat_keys |
| cmdstat_ping | none | cmdstat_ping |
| cmdstat_select | none | cmdstat_select |
| cmdstat_set | none | cmdstat_set |

#### Metric set：keyspace

| Metric name | Metric unit | Metric help description |
|---|---|---|
| db0 | none | db0 |
| sequence | none | sequence |
| used_db_size | none | used_db_size |
| max_db_size | none | max_db_size |
| used_percent | none | used_percent |
| disk_capacity | none | disk_capacity |
| used_disk_size | none | used_disk_size |
| used_disk_percent | none | used_disk_percent |
